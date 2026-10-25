package app.wallet.ui.inbox

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.viewModelScope
import app.wallet.data.ApiError
import app.wallet.data.Lookups
import app.wallet.data.SmsAttempt
import app.wallet.data.WalletRepository
import app.wallet.sms.SmsSettings
import app.wallet.ui.components.TxListViewModel
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.launch

data class InboxData(val pending: List<SmsAttempt>, val unparsed: List<SmsAttempt>, val lookups: Lookups)

/** Per-card choices and progress, kept by attempt id so they survive reloads. */
data class CardState(
    val categoryId: Long? = null,
    val accountId: Long? = null,
    val busy: Boolean = false,
    val error: String? = null,
)

/** The SMS inbox — frontend/src/pages/Inbox.tsx. */
class InboxViewModel(repo: WalletRepository, private val sms: SmsSettings) : TxListViewModel<InboxData>(repo) {
    val cards = mutableStateMapOf<Long, CardState>()

    var pasting by mutableStateOf(false)
        private set
    var pasteResult by mutableStateOf<Int?>(null)
        private set
    var pasteError by mutableStateOf<String?>(null)
        private set

    init {
        start()
    }

    override suspend fun fetch(force: Boolean) = coroutineScope {
        val pending = async { repo.smsPending() }
        val unparsed = async { repo.smsUnparsed() }
        val lookups = async { repo.lookups(force) }
        if (sms.enabled) launch { refreshSenders() }
        InboxData(
            pending.await().sortedByDescending { it.receivedAt },
            unparsed.await().sortedByDescending { it.receivedAt },
            lookups.await(),
        )
    }

    /** Keep the phone's bank-sender list in step with the server's patterns. */
    private suspend fun refreshSenders() {
        runCatching { repo.smsPatterns() }.onSuccess { patterns ->
            sms.senders = patterns.filter { it.enabled }.map { it.senderMatch.trim() }.filter { it.isNotEmpty() }.toSet()
        }
    }

    fun card(id: Long) = cards[id] ?: CardState()

    fun pickCategory(id: Long, categoryId: Long?) {
        cards[id] = card(id).copy(categoryId = categoryId)
    }

    fun pickAccount(id: Long, accountId: Long) {
        cards[id] = card(id).copy(accountId = accountId)
    }

    fun confirm(attempt: SmsAttempt, needsAccount: Boolean) {
        val c = card(attempt.id)
        if (c.busy || (needsAccount && c.accountId == null)) return
        cards[attempt.id] = c.copy(busy = true, error = null)
        viewModelScope.launch {
            try {
                repo.confirmSms(attempt.id, c.categoryId, if (needsAccount) c.accountId else null)
                cards.remove(attempt.id)
            } catch (e: ApiError) {
                cards[attempt.id] = card(attempt.id).copy(busy = false, error = e.message ?: e.status?.toString())
            }
        }
    }

    fun ignore(attempt: SmsAttempt) {
        val c = card(attempt.id)
        if (c.busy) return
        cards[attempt.id] = c.copy(busy = true, error = null)
        viewModelScope.launch {
            try {
                repo.ignoreSms(attempt.id)
                cards.remove(attempt.id)
            } catch (e: ApiError) {
                cards[attempt.id] = card(attempt.id).copy(busy = false, error = e.message ?: e.status?.toString())
            }
        }
    }

    fun paste(text: String, onDone: () -> Unit) {
        if (pasting || text.isBlank()) return
        pasting = true
        pasteError = null
        viewModelScope.launch {
            try {
                pasteResult = repo.pasteSms(text).size
                onDone()
            } catch (e: ApiError) {
                pasteError = e.message ?: e.status?.toString()
            } finally {
                pasting = false
            }
        }
    }

    fun clearPasteResult() {
        pasteResult = null
    }
}
