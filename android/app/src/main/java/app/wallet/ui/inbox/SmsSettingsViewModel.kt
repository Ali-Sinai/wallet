package app.wallet.ui.inbox

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import app.wallet.data.ApiError
import app.wallet.data.WalletRepository
import app.wallet.sms.SmsSettings
import kotlinx.coroutines.launch

class SmsSettingsViewModel(private val repo: WalletRepository, private val sms: SmsSettings) : ViewModel() {
    var enabled by mutableStateOf(sms.enabled)
        private set
    var token by mutableStateOf(sms.token.orEmpty())
        private set
    var senders by mutableStateOf(sms.senders.sorted())
        private set
    var loadingSenders by mutableStateOf(false)
        private set
    var rotating by mutableStateOf(false)
        private set
    var error by mutableStateOf<String?>(null)
        private set

    val lastStatus: String? get() = sms.lastStatus
    val lastStatusAt: Long get() = sms.lastStatusAt

    init {
        refreshSenders()
    }

    fun turnOn(value: Boolean) {
        sms.enabled = value
        enabled = value
        if (value) refreshSenders()
    }

    fun updateToken(value: String) {
        token = value
        sms.token = value
    }

    /** Makes a new webhook token and keeps it here. Any forwarder app using the old one stops working. */
    fun rotateToken() {
        if (rotating) return
        rotating = true
        error = null
        viewModelScope.launch {
            try {
                updateToken(repo.rotateWebhookToken())
            } catch (e: ApiError) {
                error = e.message ?: e.status?.toString()
            } finally {
                rotating = false
            }
        }
    }

    fun refreshSenders() {
        loadingSenders = true
        viewModelScope.launch {
            try {
                val patterns = repo.smsPatterns()
                sms.senders = patterns.filter { it.enabled }.map { it.senderMatch.trim() }.filter { it.isNotEmpty() }.toSet()
                senders = sms.senders.sorted()
            } catch (e: ApiError) {
                error = e.message ?: e.status?.toString()
            } finally {
                loadingSenders = false
            }
        }
    }
}
