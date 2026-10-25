package app.wallet.ui.settings

import android.app.Application
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import app.wallet.data.ApiError
import app.wallet.data.NotificationSettings
import app.wallet.data.WalletRepository
import app.wallet.notify.Push
import kotlinx.coroutines.launch

/** Settings → notifications: server push for this phone, and when the server sends them. */
class NotificationsViewModel(private val app: Application, private val repo: WalletRepository) : ViewModel() {
    val pushConfigured = Push.configured
    var pushOn by mutableStateOf(Push.wanted(app))
        private set
    var serverHasPush by mutableStateOf<Boolean?>(null)
        private set
    var settings by mutableStateOf<NotificationSettings?>(null)
        private set
    var busy by mutableStateOf(false)
        private set
    var error by mutableStateOf<String?>(null)
        private set

    init {
        viewModelScope.launch {
            serverHasPush = runCatching { repo.pushEnabledOnServer() }.getOrNull()
            settings = runCatching { repo.notificationSettings() }.getOrNull()
        }
    }

    private fun act(block: suspend () -> Unit) {
        if (busy) return
        busy = true
        error = null
        viewModelScope.launch {
            try {
                block()
            } catch (e: ApiError) {
                error = e.message ?: e.status?.toString()
            } finally {
                busy = false
            }
        }
    }

    fun setPush(on: Boolean) = act {
        if (on) Push.enable(app) else Push.disable(app)
        pushOn = Push.wanted(app)
    }

    fun setFrequency(value: String) {
        val current = settings ?: return
        act { settings = repo.saveNotificationSettings(current.copy(summaryFrequency = value)) }
    }

    fun setThreshold(value: Int) {
        val current = settings ?: return
        if (value < 1) return
        act { settings = repo.saveNotificationSettings(current.copy(uncategorizedThreshold = value)) }
    }
}
