package app.wallet.sms

import android.content.Context
import androidx.core.content.edit

/**
 * On-device SMS reading: whether it's on, the webhook token it posts with,
 * and which senders count as banks.
 */
class SmsSettings(context: Context) {
    private val prefs = context.getSharedPreferences("sms", Context.MODE_PRIVATE)

    var enabled: Boolean
        get() = prefs.getBoolean(KEY_ENABLED, false)
        set(value) = prefs.edit { putBoolean(KEY_ENABLED, value) }

    /** The backend's webhook API token (Settings → SMS in the web app shows or rotates it). */
    var token: String?
        get() = prefs.getString(KEY_TOKEN, null)?.takeIf { it.isNotBlank() }
        set(value) = prefs.edit { putString(KEY_TOKEN, value?.trim()) }

    /**
     * The `sender_match` of each enabled SMS pattern on the server. Only
     * messages from these senders leave the phone: a message no pattern reads
     * is stored with its text on the server, so forwarding everything would
     * upload personal messages too.
     */
    var senders: Set<String>
        get() = prefs.getStringSet(KEY_SENDERS, emptySet()).orEmpty()
        set(value) = prefs.edit { putStringSet(KEY_SENDERS, value) }

    /** The server's own rule (sms_parser.py): a pattern applies when its sender_match is a substring of the sender. */
    fun isBankSender(sender: String) = senders.any { it.isNotBlank() && it in sender }

    var lastStatus: String?
        get() = prefs.getString(KEY_LAST_STATUS, null)
        private set(value) = prefs.edit { putString(KEY_LAST_STATUS, value) }

    var lastStatusAt: Long
        get() = prefs.getLong(KEY_LAST_STATUS_AT, 0L)
        private set(value) = prefs.edit { putLong(KEY_LAST_STATUS_AT, value) }

    fun recordStatus(status: String) {
        lastStatus = status
        lastStatusAt = System.currentTimeMillis()
    }

    companion object {
        private const val KEY_ENABLED = "enabled"
        private const val KEY_TOKEN = "token"
        private const val KEY_SENDERS = "senders"
        private const val KEY_LAST_STATUS = "last_status"
        private const val KEY_LAST_STATUS_AT = "last_status_at"

        // Values of lastStatus: the server's own result ("parsed", "unparsed", "otp",
        // "ignored_account") or one of these.
        const val STATUS_BAD_TOKEN = "bad_token"
        const val STATUS_REJECTED = "rejected"
    }
}
