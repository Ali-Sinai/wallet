package app.wallet.offline

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
import app.wallet.data.ApiError
import app.wallet.data.TransactionIn
import java.util.concurrent.TimeUnit

/**
 * A manual transaction saved while offline (offlineQueue.ts in the web app):
 * WorkManager keeps it until there's a network, then posts it with the
 * saved session, retrying on failure.
 */
class TransactionUploadWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result {
        val container = (applicationContext as WalletApp).container
        val body = inputData.getString(KEY_BODY)?.let {
            runCatching { container.api.json.decodeFromString(TransactionIn.serializer(), it) }.getOrNull()
        } ?: return Result.failure()
        return try {
            container.wallet.createTransaction(body)
            Result.success()
        } catch (e: ApiError) {
            when {
                // No network after all, or the session expired (it'll work again after logging in).
                e.status == null || e.status == 401 || e.status >= 500 ->
                    if (runAttemptCount < MAX_ATTEMPTS) Result.retry() else Result.failure()
                // The server read it and said no; sending it again won't change that.
                else -> Result.failure()
            }
        }
    }

    companion object {
        private const val KEY_BODY = "body"
        private const val MAX_ATTEMPTS = 30

        fun enqueue(context: Context, body: TransactionIn) {
            val json = (context.applicationContext as WalletApp).container.api.json
            val request = OneTimeWorkRequestBuilder<TransactionUploadWorker>()
                .setInputData(workDataOf(KEY_BODY to json.encodeToString(TransactionIn.serializer(), body)))
                .setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
                .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS)
                .build()
            WorkManager.getInstance(context).enqueue(request)
        }
    }
}
