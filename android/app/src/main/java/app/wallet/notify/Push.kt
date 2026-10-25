package app.wallet.notify

import android.content.Context
import android.content.SharedPreferences
import androidx.core.content.edit
import app.wallet.BuildConfig
import app.wallet.WalletApp
import app.wallet.data.ApiError
import com.google.firebase.FirebaseApp
import com.google.firebase.FirebaseOptions
import com.google.firebase.messaging.FirebaseMessaging
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import kotlinx.coroutines.suspendCancellableCoroutine

/**
 * Push notifications from the backend (Firebase Cloud Messaging), the
 * phone's side of backend/app/firebase.py. Optional, like on the web: the
 * Firebase project's Android app config is baked in at build time
 * (WALLET_FIREBASE_* — see android/README.md), and without it push is off
 * and nothing else changes.
 */
object Push {
    val configured: Boolean
        get() = BuildConfig.FIREBASE_APP_ID.isNotBlank() && BuildConfig.FIREBASE_API_KEY.isNotBlank() &&
            BuildConfig.FIREBASE_PROJECT_ID.isNotBlank() && BuildConfig.FIREBASE_SENDER_ID.isNotBlank()

    private fun prefs(context: Context): SharedPreferences =
        context.getSharedPreferences("push", Context.MODE_PRIVATE)

    /** Whether this phone asked to receive pushes (and so should keep its token registered). */
    fun wanted(context: Context) = prefs(context).getBoolean(KEY_WANTED, false)

    /** Sets up the default FirebaseApp from the build's config; call once at startup. */
    fun init(context: Context) {
        if (!configured || FirebaseApp.getApps(context).isNotEmpty()) return
        val options = FirebaseOptions.Builder()
            .setApplicationId(BuildConfig.FIREBASE_APP_ID)
            .setApiKey(BuildConfig.FIREBASE_API_KEY)
            .setProjectId(BuildConfig.FIREBASE_PROJECT_ID)
            .setGcmSenderId(BuildConfig.FIREBASE_SENDER_ID)
            .build()
        FirebaseApp.initializeApp(context, options)
    }

    private suspend fun token(): String = suspendCancellableCoroutine { cont ->
        FirebaseMessaging.getInstance().token.addOnCompleteListener { task ->
            val t = task.result.takeIf { task.isSuccessful }
            if (t != null) cont.resume(t) else cont.resumeWithException(task.exception ?: IllegalStateException("no FCM token"))
        }
    }

    /** Registers this phone with the backend. Throws [ApiError] (e.g. 503 when the server has no Firebase). */
    suspend fun enable(context: Context) {
        val token = runCatching { token() }.getOrElse { throw ApiError(null, it.message) }
        (context.applicationContext as WalletApp).container.wallet.pushSubscribe(token)
        prefs(context).edit {
            putBoolean(KEY_WANTED, true)
            putString(KEY_TOKEN, token)
        }
    }

    suspend fun disable(context: Context) {
        prefs(context).edit { putBoolean(KEY_WANTED, false) }
        val token = prefs(context).getString(KEY_TOKEN, null) ?: return
        runCatching { (context.applicationContext as WalletApp).container.wallet.pushUnsubscribe(token) }
        prefs(context).edit { remove(KEY_TOKEN) }
    }

    internal fun tokenChanged(context: Context, token: String) {
        if (!wanted(context)) return
        prefs(context).edit { putString(KEY_TOKEN, token) }
        CoroutineScope(SupervisorJob() + Dispatchers.IO).launch {
            runCatching { (context.applicationContext as WalletApp).container.wallet.pushSubscribe(token) }
        }
    }

    private const val KEY_WANTED = "wanted"
    private const val KEY_TOKEN = "token"
}

/**
 * Receives FCM messages. In the background the system shows the server's
 * notification itself; in the foreground it lands here and is shown by hand.
 */
class WalletMessagingService : FirebaseMessagingService() {
    override fun onNewToken(token: String) = Push.tokenChanged(applicationContext, token)

    override fun onMessageReceived(message: RemoteMessage) {
        val n = message.notification ?: return
        Notifications.show(
            applicationContext,
            Notifications.CHANNEL_SERVER,
            (System.currentTimeMillis() % Int.MAX_VALUE).toInt(),
            n.title.orEmpty(),
            n.body.orEmpty(),
        )
    }
}
