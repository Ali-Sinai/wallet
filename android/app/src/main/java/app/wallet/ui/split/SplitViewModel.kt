package app.wallet.ui.split

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import app.wallet.data.ApiError
import app.wallet.data.Person
import app.wallet.data.Split
import app.wallet.data.SplitRequest
import app.wallet.data.Transaction
import app.wallet.data.WalletRepository
import app.wallet.util.Fmt
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.launch

enum class SplitMethod(val api: String) { EQUAL("equal"), AMOUNTS("custom"), PERCENTAGES("percentage") }

/** Participant key, as the API wants it: "me" or a person id. */
const val ME = "me"

/** SplitModal.tsx: split one transaction between me and people, or show the split it has. */
class SplitViewModel(private val repo: WalletRepository, private val txId: Long) : ViewModel() {
    var tx by mutableStateOf<Transaction?>(null)
        private set
    var people by mutableStateOf<List<Person>>(emptyList())
        private set
    var existing by mutableStateOf<Split?>(null)
        private set
    var loading by mutableStateOf(true)
        private set
    var loadError by mutableStateOf<String?>(null)
        private set
    var busy by mutableStateOf(false)
        private set
    var error by mutableStateOf<String?>(null)
        private set

    var iPaid by mutableStateOf(true)
    var includeMe by mutableStateOf(true)
    var method by mutableStateOf(SplitMethod.EQUAL)
    val selected = mutableStateListOf<Long>()

    /** What's typed per participant: Toman for AMOUNTS, percent for PERCENTAGES. */
    val inputs = mutableStateMapOf<String, String>()

    init {
        load()
    }

    fun load() {
        loading = true
        loadError = null
        viewModelScope.launch {
            try {
                coroutineScope {
                    val t = async { repo.transaction(txId) }
                    val p = async { repo.people() }
                    val s = async { repo.splitFor(txId) }
                    tx = t.await()
                    people = p.await()
                    existing = s.await()
                }
            } catch (e: ApiError) {
                loadError = e.message ?: e.status?.toString()
            } finally {
                loading = false
            }
        }
    }

    fun toggle(personId: Long) {
        if (personId in selected) selected.remove(personId) else selected.add(personId)
    }

    val participants: List<String>
        get() = (if (includeMe) listOf(ME) else emptyList()) + selected.map { it.toString() }

    private fun number(key: String): Double? =
        inputs[key]?.let { Fmt.latinDigits(it).replace('٫', '.').trim() }?.takeIf { it.isNotEmpty() }?.toDoubleOrNull()

    /** Cents still to hand out (AMOUNTS) or percent still to assign (PERCENTAGES); 0 when it adds up. */
    val remaining: Double
        get() {
            val total = tx?.amountCents ?: 0L
            return when (method) {
                SplitMethod.EQUAL -> 0.0
                SplitMethod.AMOUNTS -> total - participants.sumOf { (number(it) ?: 0.0) * 100 }
                SplitMethod.PERCENTAGES -> 100 - participants.sumOf { number(it) ?: 0.0 }
            }
        }

    val canSave: Boolean
        get() = selected.isNotEmpty() && !busy && when (method) {
            SplitMethod.EQUAL -> true
            SplitMethod.AMOUNTS -> kotlin.math.abs(remaining) < 1
            SplitMethod.PERCENTAGES -> kotlin.math.abs(remaining) < 0.01
        }

    fun save(onDone: () -> Unit) {
        if (!canSave) return
        val keys = participants
        val body = SplitRequest(
            mode = if (iPaid) "i_paid" else "they_paid",
            method = method.api,
            participantPersonIds = selected.toList(),
            includeMe = includeMe,
            percentages = if (method == SplitMethod.PERCENTAGES) keys.associateWith { number(it) ?: 0.0 } else null,
            customAmounts = if (method == SplitMethod.AMOUNTS) {
                keys.associateWith { Math.round((number(it) ?: 0.0) * 100) }
            } else {
                null
            },
        )
        busy = true
        error = null
        viewModelScope.launch {
            try {
                repo.createSplit(txId, body)
                onDone()
            } catch (e: ApiError) {
                error = e.message ?: e.status?.toString()
            } finally {
                busy = false
            }
        }
    }

    fun deleteExisting(onDone: () -> Unit) {
        val split = existing ?: return
        if (busy) return
        busy = true
        error = null
        viewModelScope.launch {
            try {
                repo.deleteSplit(split.id)
                onDone()
            } catch (e: ApiError) {
                error = e.message ?: e.status?.toString()
            } finally {
                busy = false
            }
        }
    }
}
