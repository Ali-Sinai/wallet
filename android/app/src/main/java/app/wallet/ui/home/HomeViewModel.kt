package app.wallet.ui.home

import app.wallet.data.CategorySlice
import app.wallet.data.Dashboard
import app.wallet.data.Lookups
import app.wallet.data.Transaction
import app.wallet.data.WalletRepository
import app.wallet.ui.components.TxListViewModel
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope

data class HomeData(
    val dashboard: Dashboard,
    val slices: List<CategorySlice>,
    val recent: List<Transaction>,
    val lookups: Lookups,
)

class HomeViewModel(repo: WalletRepository) : TxListViewModel<HomeData>(repo) {
    init {
        start()
    }

    override suspend fun fetch(force: Boolean) = coroutineScope {
        val dashboard = async { repo.dashboard() }
        val slices = async { repo.categoryBreakdown() }
        val recent = async { repo.transactions(limit = 5) }
        val lookups = async { repo.lookups(force) }
        HomeData(dashboard.await(), slices.await(), recent.await(), lookups.await())
    }
}
