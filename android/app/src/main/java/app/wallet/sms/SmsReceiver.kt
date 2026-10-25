package app.wallet.sms

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.Telephony
import app.wallet.WalletApp

/** Picks bank messages out of incoming SMS and queues them for upload. */
class SmsReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) return
        val settings = (context.applicationContext as WalletApp).container.smsSettings
        if (!settings.enabled || settings.token == null) return

        val parts = Telephony.Sms.Intents.getMessagesFromIntent(intent) ?: return
        // A long message arrives as several parts from the same sender.
        for ((sender, pieces) in parts.filterNotNull().groupBy { it.originatingAddress.orEmpty() }) {
            if (!settings.isBankSender(sender)) continue
            val body = pieces.joinToString("") { it.messageBody.orEmpty() }
            if (body.isBlank()) continue
            SmsUploadWorker.enqueue(context, sender, body, pieces.minOf { it.timestampMillis })
        }
    }
}
