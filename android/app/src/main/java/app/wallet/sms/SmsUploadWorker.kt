package app.wallet.sms

import android.content.Context
import androidx.work.BackoffPolicy
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import androidx.work.workDataOf
import app.wallet.WalletApp
import app.wallet.notify.Notifications
import java.io.IOException
import java.time.Instant
import java.util.concurrent.TimeUnit
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.put
import okhttp3.HttpUrl.Companion.toHttpUrlOrNull
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody

/**
 * Posts one bank SMS to the backend's webhook (POST /api/ingest/sms, the same
 * one SMS-forwarder apps use). WorkManager holds it until there's a network
 * and retries on failure, so a message received offline still arrives.
 */
class SmsUploadWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result {
        val container = (applicationContext as WalletApp).container
        val settings = container.smsSettings
        val base = container.server.baseUrl?.toHttpUrlOrNull() ?: return Result.failure()
        val token = settings.token ?: return Result.failure()
        val sender = inputData.getString(KEY_SENDER) ?: return Result.failure()
        val body = inputData.getString(KEY_BODY) ?: return Result.failure()
        val receivedAt = Instant.ofEpochMilli(inputData.getLong(KEY_RECEIVED_AT, System.currentTimeMillis()))

        // Built by hand: this endpoint's field is camelCase "receivedAt", unlike the rest of the API.
        val payload = buildJsonObject {
            put("sender", sender)
            put("body", body)
            put("receivedAt", receivedAt.toString())
        }
        val request = Request.Builder()
            .url(base.resolve("api/ingest/sms") ?: return Result.failure())
            .header("X-Api-Token", token)
            .post(payload.toString().toRequestBody("application/json".toMediaType()))
            .build()

        return try {
            withContext(Dispatchers.IO) {
                container.api.http.newCall(request).execute().use { response ->
                    when {
                        response.isSuccessful -> {
                            val status = runCatching {
                                Json.parseToJsonElement(response.body?.string().orEmpty())
                                    .jsonObject["status"]?.jsonPrimitive?.content
                            }.getOrNull()
                            settings.recordStatus(status ?: "parsed")
                            container.wallet.notifyChanged()
                            // Only messages that land in the inbox need you; an OTP or an unknown card doesn't.
                            if (status == "parsed" || status == "unparsed") Notifications.smsArrived(applicationContext)
                            Result.success()
                        }
                        response.code == 401 -> {
                            settings.recordStatus(SmsSettings.STATUS_BAD_TOKEN)
                            Result.failure()
                        }
                        // The server read it and said no; sending it again won't change that.
                        response.code in 400..499 -> {
                            settings.recordStatus(SmsSettings.STATUS_REJECTED)
                            Result.failure()
                        }
                        else -> Result.retry()
                    }
                }
            }
        } catch (_: IOException) {
            if (runAttemptCount < MAX_ATTEMPTS) Result.retry() else Result.failure()
        }
    }

    companion object {
        private const val KEY_SENDER = "sender"
        private const val KEY_BODY = "body"
        private const val KEY_RECEIVED_AT = "received_at"
        private const val MAX_ATTEMPTS = 20

        fun enqueue(context: Context, sender: String, body: String, receivedAtMillis: Long) {
            val request = OneTimeWorkRequestBuilder<SmsUploadWorker>()
                .setInputData(
                    workDataOf(KEY_SENDER to sender, KEY_BODY to body, KEY_RECEIVED_AT to receivedAtMillis),
                )
                .setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
                .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS)
                .build()
            WorkManager.getInstance(context).enqueue(request)
        }
    }
}
