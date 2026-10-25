package app.wallet.ui.people

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.viewModelScope
import app.wallet.data.ApiError
import app.wallet.data.Debt
import app.wallet.data.Lookups
import app.wallet.data.PersonBalance
import app.wallet.data.PersonIn
import app.wallet.data.Transaction
import app.wallet.data.WalletRepository
import app.wallet.ui.components.TxListViewModel
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.launch

/** frontend/src/pages/People.tsx: everyone, with what's outstanding between us. */
class PeopleViewModel(repo: WalletRepository) : TxListViewModel<List<PersonBalance>>(repo) {
    var saving by mutableStateOf(false)
        private set
    var error by mutableStateOf<String?>(null)
        private set

    init {
        start()
    }

    override suspend fun fetch(force: Boolean) =
        repo.balances().sortedWith(compareByDescending<PersonBalance> { it.openDebtCount > 0 }.thenBy { it.name })

    fun add(name: String, note: String, onDone: () -> Unit) {
        if (saving || name.isBlank()) return
        saving = true
        error = null
        viewModelScope.launch {
            try {
                repo.savePerson(null, PersonIn(name.trim(), note.trim().ifEmpty { null }))
                onDone()
            } catch (e: ApiError) {
                error = e.message ?: e.status?.toString()
            } finally {
                saving = false
            }
        }
    }
}

data class PersonData(
    val balance: PersonBalance?,
    val note: String?,
    val openDebts: List<Debt>,
    val shared: List<Transaction>,
    val lookups: Lookups,
)

/** frontend/src/pages/Person.tsx: one person's balance, open debts and shared transactions. */
class PersonViewModel(repo: WalletRepository, val personId: Long) : TxListViewModel<PersonData>(repo) {
    var busy by mutableStateOf(false)
        private set
    var error by mutableStateOf<String?>(null)
        private set

    init {
        start()
    }

    override suspend fun fetch(force: Boolean) = coroutineScope {
        val balances = async { repo.balances() }
        val people = async { repo.people() }
        val debts = async { repo.personDebts(personId) }
        val shared = async { repo.personTransactions(personId) }
        val lookups = async { repo.lookups(force) }
        PersonData(
            balance = balances.await().firstOrNull { it.personId == personId },
            note = people.await().firstOrNull { it.id == personId }?.contactNote,
            openDebts = debts.await().filter { it.remainingCents > 0 },
            shared = shared.await(),
            lookups = lookups.await(),
        )
    }

    private fun act(onDone: () -> Unit = {}, block: suspend () -> Unit) {
        if (busy) return
        busy = true
        error = null
        viewModelScope.launch {
            try {
                block()
                onDone()
            } catch (e: ApiError) {
                error = e.message ?: e.status?.toString()
            } finally {
                busy = false
            }
        }
    }

    fun settleAll() = act { repo.settleAll(personId) }

    fun settle(debt: Debt, amountCents: Long, onDone: () -> Unit) = act(onDone) { repo.settleDebt(debt.id, amountCents) }

    fun rename(name: String, note: String, onDone: () -> Unit) =
        act(onDone) { repo.savePerson(personId, PersonIn(name.trim(), note.trim().ifEmpty { null })) }

    fun delete(onDone: () -> Unit) = act(onDone) { repo.deletePerson(personId) }
}
