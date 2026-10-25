package app.wallet.notify

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import app.wallet.MainActivity
import app.wallet.R
import app.wallet.util.Lang

/** The app's notification channels, and posting to them. */
object Notifications {
    const val CHANNEL_SMS = "sms"
    const val CHANNEL_SERVER = "server"

    /** Intent extra naming the screen a tapped notification opens. */
    const val EXTRA_OPEN = "open"
    const val OPEN_INBOX = "inbox"

    fun createChannels(context: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val c = Lang.wrap(context)
        val manager = context.getSystemService(NotificationManager::class.java)
        manager.createNotificationChannel(
            NotificationChannel(CHANNEL_SMS, c.getString(R.string.channel_sms), NotificationManager.IMPORTANCE_DEFAULT),
        )
        manager.createNotificationChannel(
            NotificationChannel(CHANNEL_SERVER, c.getString(R.string.channel_server), NotificationManager.IMPORTANCE_DEFAULT),
        )
    }

    fun allowed(context: Context): Boolean =
        Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU ||
            ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED

    fun show(context: Context, channel: String, id: Int, title: String, body: String, open: String? = null) {
        if (!allowed(context)) return
        val intent = Intent(context, MainActivity::class.java)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
            .apply { if (open != null) putExtra(EXTRA_OPEN, open) }
        val tap = PendingIntent.getActivity(
            context,
            id,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        val notification = NotificationCompat.Builder(context, channel)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setContentIntent(tap)
            .setAutoCancel(true)
            .build()
        try {
            NotificationManagerCompat.from(context).notify(id, notification)
        } catch (_: SecurityException) {
            // Permission withdrawn between the check and the post.
        }
    }

    /** A bank SMS reached the inbox and waits to be confirmed. */
    fun smsArrived(context: Context) {
        val c = Lang.wrap(context)
        show(context, CHANNEL_SMS, ID_SMS, c.getString(R.string.notify_sms_title), c.getString(R.string.notify_sms_body), OPEN_INBOX)
    }

    // One SMS notification, replaced by the next, rather than one per message.
    private const val ID_SMS = 1001
}
