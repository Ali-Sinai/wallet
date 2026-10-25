package app.wallet.ui.add

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import app.wallet.data.ApiError
import app.wallet.data.Direction
import app.wallet.data.Lookups
import app.wallet.data.TransactionIn
import app.wallet.data.WalletRepository
import java.time.Instant
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

/** AddTransactionModal in frontend/src/components/AddTransactionModal.tsx. */
class AddTransactionViewModel(private val repo: WalletRepository) : ViewModel() {
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

    private var categoryTouched = false
    private var suggestJob: Job? = null

    init {
        loadLookups()
    }

    fun loadLookups() {
        loadError = null
        viewModelScope.launch {
            try {
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

    fun save(onSaved: () -> Unit) {
        if (saving) return
        val toman = amount.toLongOrNull()
        if (toman == null || toman <= 0) {
            amountMissing = true
            return
        }
        val account = accountId ?: return
        saving = true
        error = null
        viewModelScope.launch {
            try {
                repo.createTransaction(
                    TransactionIn(
                        amountCents = toman * 100,
                        direction = direction,
                        accountId = account,
                        occurredAt = Instant.now().toString(),
                        categoryId = categoryId,
                        note = note.trim().ifEmpty { null },
                        merchantText = merchant.trim().ifEmpty { null },
                    ),
                )
                onSaved()
            } catch (e: ApiError) {
                error = e.message ?: e.status?.toString()
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
