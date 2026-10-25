package app.wallet.ui.add

import android.app.Application
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import app.wallet.data.ApiError
import app.wallet.data.Direction
import app.wallet.data.Lookups
import app.wallet.data.ResolveSms
import app.wallet.data.SmsAttempt
import app.wallet.data.Transaction
import app.wallet.data.TransactionIn
import app.wallet.data.WalletRepository
import app.wallet.offline.TransactionUploadWorker
import app.wallet.util.Fmt
import java.time.Instant
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

/**
 * AddTransactionModal in frontend/src/components/AddTransactionModal.tsx,
 * in one of three modes:
 * - new (neither id): a manual transaction, queued for later when offline;
 * - [attemptId]: records an SMS the server couldn't read ("resolve
 *   manually") — the message is shown above the form, and saving turns that
 *   inbox entry into the transaction;
 * - [transactionId]: edits an existing transaction.
 */
class AddTransactionViewModel(
    private val app: Application,
    private val repo: WalletRepository,
    private val attemptId: Long? = null,
    private val transactionId: Long? = null,
) : ViewModel() {
    /** Whole Toman, as typed on the keypad. */
    var amount by mutableStateOf("")
        private set
    var direction by mutableStateOf(Direction.WITHDRAWAL)
    var accountId by mutableStateOf<Long?>(null)
    var categoryId by mutableStateOf<Long?>(null)
        private set
    var merchant by mutableStateOf("")
        private set
    var note by mutableStateOf("")
    var occurredAt by mutableLongStateOf(System.currentTimeMillis())
    var lookups by mutableStateOf<Lookups?>(null)
        private set
    var loadError by mutableStateOf<String?>(null)
        private set
    var saving by mutableStateOf(false)
        private set
    var error by mutableStateOf<String?>(null)
        private set
    var amountMissing by mutableStateOf(false)
        private set
    var attempt by mutableStateOf<SmsAttempt?>(null)
        private set
    var editing by mutableStateOf<Transaction?>(null)
        private set

    /** Set when the save went to the offline queue rather than the server. */
    var queued by mutableStateOf(false)
        private set

    private var categoryTouched = false
    private var suggestJob: Job? = null

    init {
        loadLookups()
    }

    fun loadLookups() {
        loadError = null
        viewModelScope.launch {
            try {
                if (attemptId != null && attempt == null) {
                    val a = repo.smsUnparsed().firstOrNull { it.id == attemptId }
                    attempt = a
                    a?.amountCents?.let { amount = (it / 100).toString() }
                    a?.direction?.let { direction = it }
                    (a?.occurredAt ?: a?.receivedAt)?.let { occurredAt = Fmt.parseApiDate(it).toEpochMilli() }
                }
                if (transactionId != null && editing == null) {
                    val tx = repo.transaction(transactionId)
                    editing = tx
                    amount = (tx.amountCents / 100).toString()
                    direction = tx.direction
                    accountId = tx.accountId
                    categoryId = tx.categoryId
                    categoryTouched = true
                    merchant = tx.merchantText.orEmpty()
                    note = tx.note.orEmpty()
                    occurredAt = Fmt.parseApiDate(tx.occurredAt).toEpochMilli()
                }
                val l = repo.lookups()
                lookups = l
                if (accountId == null) accountId = l.accounts.firstOrNull { it.isActive }?.id ?: l.accounts.firstOrNull()?.id
            } catch (e: ApiError) {
                loadError = e.message ?: ""
            }
        }
    }

    fun press(key: String) {
        amountMissing = false
        amount = when {
            key == BACKSPACE -> amount.dropLast(1)
            amount.isEmpty() && key.startsWith("0") -> amount // no leading zeros
            amount.length + key.length > MAX_DIGITS -> amount
            else -> amount + key
        }
    }

    fun pickCategory(id: Long?) {
        categoryTouched = true
        categoryId = id
    }

    fun updateMerchant(value: String) {
        merchant = value
        suggestJob?.cancel()
        val text = value.trim()
        if (text.isEmpty() || categoryTouched) return
        // The server remembers which category this merchant was filed under last time.
        suggestJob = viewModelScope.launch {
            delay(400)
            val suggested = runCatching { repo.suggestCategory(text) }.getOrNull()
            if (suggested != null && !categoryTouched) categoryId = suggested
        }
    }

    /**
     * The amount to save, in cents. An edited transaction keeps its exact
     * cents (Toman can carry a fraction from a Rial SMS) unless the amount
     * was actually changed.
     */
    private fun amountCents(toman: Long): Long {
        val original = editing?.amountCents
        return if (original != null && original / 100 == toman) original else toman * 100
    }

    fun save(onSaved: () -> Unit) {
        if (saving) return
        val toman = amount.toLongOrNull()
        if (toman == null || toman <= 0) {
            amountMissing = true
            return
        }
        val account = accountId ?: return
        val at = Instant.ofEpochMilli(occurredAt).toString()
        val body = TransactionIn(
            amountCents = amountCents(toman),
            direction = direction,
            accountId = account,
            occurredAt = at,
            categoryId = categoryId,
            note = note.trim().ifEmpty { null },
            merchantText = merchant.trim().ifEmpty { null },
        )
        saving = true
        error = null
        viewModelScope.launch {
            try {
                val a = attempt
                val tx = editing
                when {
                    a != null -> repo.resolveSms(
                        a.id,
                        ResolveSms(body.amountCents, direction, account, at, categoryId, body.note),
                    )
                    tx != null -> repo.updateTransaction(tx.id, body)
                    else -> repo.createTransaction(body)
                }
                onSaved()
            } catch (e: ApiError) {
                if (e.status == null && attempt == null && editing == null) {
                    // Offline: keep it and send it when there's a network. A server rejection
                    // is a real problem, though, and is shown rather than queued.
                    TransactionUploadWorker.enqueue(app, body)
                    queued = true
                } else {
                    error = e.message ?: e.status?.toString()
                }
            } finally {
                saving = false
            }
        }
    }

    companion object {
        const val BACKSPACE = "⌫"
        val KEYS = listOf("1", "2", "3", "4", "5", "6", "7", "8", "9", "000", "0", BACKSPACE)
        private const val MAX_DIGITS = 13
    }
}
