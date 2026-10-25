package app.wallet.ui.settings

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.viewModelScope
import app.wallet.data.AccountIn
import app.wallet.data.ApiError
import app.wallet.data.Budget
import app.wallet.data.BudgetIn
import app.wallet.data.CategoryIn
import app.wallet.data.Lookups
import app.wallet.data.WalletRepository
import app.wallet.ui.components.TxListViewModel
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.launch

data class SettingsData(val lookups: Lookups, val budgets: List<Budget>)

/** Accounts, categories and budgets — the data half of frontend/src/pages/Settings.tsx. */
class SettingsViewModel(repo: WalletRepository) : TxListViewModel<SettingsData>(repo) {
    var saving by mutableStateOf(false)
        private set
    var error by mutableStateOf<String?>(null)
        private set

    init {
        start()
    }

    override suspend fun fetch(force: Boolean) = coroutineScope {
        val lookups = async { repo.lookups(force) }
        val budgets = async { repo.budgets() }
        SettingsData(lookups.await(), budgets.await())
    }

    fun clearError() {
        error = null
    }

    /** Runs a write; [onDone] (closing the editor) only once it succeeded. */
    private fun write(onDone: () -> Unit, block: suspend () -> Unit) {
        if (saving) return
        saving = true
        error = null
        viewModelScope.launch {
            try {
                block()
                onDone()
            } catch (e: ApiError) {
                error = e.message ?: e.status?.toString()
            } finally {
                saving = false
            }
        }
    }

    fun saveAccount(id: Long?, body: AccountIn, onDone: () -> Unit) = write(onDone) { repo.saveAccount(id, body) }

    fun deleteAccount(id: Long, onDone: () -> Unit) = write(onDone) { repo.deleteAccount(id) }

    fun saveCategory(id: Long?, body: CategoryIn, onDone: () -> Unit) = write(onDone) { repo.saveCategory(id, body) }

    fun deleteCategory(id: Long, onDone: () -> Unit) = write(onDone) { repo.deleteCategory(id) }

    fun saveBudget(id: Long?, body: BudgetIn, onDone: () -> Unit) = write(onDone) { repo.saveBudget(id, body) }

    fun deleteBudget(id: Long, onDone: () -> Unit) = write(onDone) { repo.deleteBudget(id) }
}
