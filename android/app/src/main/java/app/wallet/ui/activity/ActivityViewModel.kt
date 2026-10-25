package app.wallet.ui.activity

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.viewModelScope
import app.wallet.data.Direction
import app.wallet.data.Lookups
import app.wallet.data.Transaction
import app.wallet.data.WalletRepository
import app.wallet.ui.components.TxListViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

data class ActivityData(val transactions: List<Transaction>, val lookups: Lookups)

class ActivityViewModel(repo: WalletRepository) : TxListViewModel<ActivityData>(repo) {
    var direction by mutableStateOf<Direction?>(null)
        private set
    var search by mutableStateOf("")
        private set
    var categoryId by mutableStateOf<Long?>(null)
        private set

    private var searchJob: Job? = null

    init {
        start()
    }

    fun selectDirection(value: Direction?) {
        direction = value
        reload()
    }

    fun selectCategory(value: Long?) {
        categoryId = value
        reload()
    }

    fun updateSearch(value: String) {
        search = value
        searchJob?.cancel()
        // Wait for a pause in typing rather than querying on every keystroke.
        searchJob = viewModelScope.launch {
            delay(350)
            reload()
        }
    }

    override suspend fun fetch(force: Boolean) = coroutineScope {
        val txs = async { repo.transactions(limit = 200, direction = direction, search = search.trim(), categoryId = categoryId) }
        val lookups = async { repo.lookups(force) }
        ActivityData(txs.await(), lookups.await())
    }
}
