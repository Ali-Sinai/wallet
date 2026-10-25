package app.wallet.ui.inbox

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import app.wallet.data.ApiError
import app.wallet.data.PatternTestResult
import app.wallet.data.SmsPattern
import app.wallet.data.SmsPatternIn
import app.wallet.data.WalletRepository
import app.wallet.sms.SmsSettings
import kotlinx.coroutines.launch

/** The SMS patterns the server parses bank messages with (Settings → SMS patterns on the web). */
class SmsPatternsViewModel(private val repo: WalletRepository, private val sms: SmsSettings) : ViewModel() {
    var patterns by mutableStateOf<List<SmsPattern>?>(null)
        private set
    var error by mutableStateOf<String?>(null)
        private set

    fun load() {
        error = null
        viewModelScope.launch {
            try {
                val list = repo.smsPatterns()
                patterns = list
                // The phone's bank-sender list follows the patterns.
                sms.senders = list.filter { it.enabled }.map { it.senderMatch.trim() }.filter { it.isNotEmpty() }.toSet()
            } catch (e: ApiError) {
                error = e.message ?: e.status?.toString()
            }
        }
    }

    fun setEnabled(pattern: SmsPattern, enabled: Boolean) {
        viewModelScope.launch {
            try {
                repo.savePattern(
                    pattern.id,
                    SmsPatternIn(pattern.name, pattern.senderMatch, pattern.bodyRegex, pattern.amountUnit, pattern.kind, enabled),
                )
                load()
            } catch (e: ApiError) {
                error = e.message ?: e.status?.toString()
            }
        }
    }
}

/** Creates or edits one pattern, and tries it on a sample message. */
class SmsPatternViewModel(private val repo: WalletRepository, private val patternId: Long?) : ViewModel() {
    var name by mutableStateOf("")
    var sender by mutableStateOf("")
    var regex by mutableStateOf("")
    var rial by mutableStateOf(true)
    var otp by mutableStateOf(false)
    var enabled by mutableStateOf(true)
    var sample by mutableStateOf("")

    var loading by mutableStateOf(patternId != null)
        private set
    var busy by mutableStateOf(false)
        private set
    var error by mutableStateOf<String?>(null)
        private set
    var result by mutableStateOf<PatternTestResult?>(null)
        private set

    /** Set once saved: the test endpoint needs a stored pattern. */
    var savedId by mutableStateOf(patternId)
        private set

    init {
        if (patternId != null) {
            viewModelScope.launch {
                try {
                    repo.smsPatterns().firstOrNull { it.id == patternId }?.let { p ->
                        name = p.name
                        sender = p.senderMatch
                        regex = p.bodyRegex
                        rial = p.amountUnit == "rial"
                        otp = p.kind == "otp"
                        enabled = p.enabled
                    }
                } catch (e: ApiError) {
                    error = e.message ?: e.status?.toString()
                } finally {
                    loading = false
                }
            }
        }
    }

    private fun body() = SmsPatternIn(
        name = name.trim(),
        senderMatch = sender.trim(),
        bodyRegex = regex,
        amountUnit = if (rial) "rial" else "toman",
        kind = if (otp) "otp" else "transaction",
        enabled = enabled,
    )

    val canSave: Boolean get() = name.isNotBlank() && regex.isNotBlank() && !busy

    /** Saves; the server rejects a regex Python can't compile, with the reason. */
    fun save(onDone: () -> Unit = {}) {
        if (!canSave) return
        busy = true
        error = null
        viewModelScope.launch {
            try {
                savedId = repo.savePattern(savedId, body()).id
                onDone()
            } catch (e: ApiError) {
                error = e.message ?: e.status?.toString()
            } finally {
                busy = false
            }
        }
    }

    /** Saves the current form first, so the test runs against what's on screen. */
    fun test() {
        if (!canSave || sample.isBlank()) return
        busy = true
        error = null
        result = null
        viewModelScope.launch {
            try {
                val id = repo.savePattern(savedId, body()).id
                savedId = id
                result = repo.testPattern(id, sample)
            } catch (e: ApiError) {
                error = e.message ?: e.status?.toString()
            } finally {
                busy = false
            }
        }
    }

    fun delete(onDone: () -> Unit) {
        val id = savedId ?: return onDone()
        busy = true
        viewModelScope.launch {
            try {
                repo.deletePattern(id)
                onDone()
            } catch (e: ApiError) {
                error = e.message ?: e.status?.toString()
            } finally {
                busy = false
            }
        }
    }
}
