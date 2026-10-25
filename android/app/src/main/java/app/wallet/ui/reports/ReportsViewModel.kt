package app.wallet.ui.reports

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import app.wallet.data.AccountBreakdown
import app.wallet.data.CategorySlice
import app.wallet.data.IncomeExpense
import app.wallet.data.Lookups
import app.wallet.data.MonthCategoryDelta
import app.wallet.data.Point
import app.wallet.data.WalletRepository
import app.wallet.ui.components.TxListViewModel
import app.wallet.util.Fmt
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope

/** The periods the server's reports take (reporting.py Period), minus "custom". */
enum class ReportPeriod(val api: String) { TODAY("today"), WEEK("week"), MONTH("month"), ALL("all") }

data class ReportsData(
    val totals: IncomeExpense,
    /** In time order, with display labels. */
    val spend: List<Point>,
    val slices: List<CategorySlice>,
    val accounts: List<AccountBreakdown>,
    /** Only for the month view: this month against last, per category. */
    val monthOverMonth: List<MonthCategoryDelta>,
    val lookups: Lookups,
)

/** frontend/src/pages/Reports.tsx. */
class ReportsViewModel(repo: WalletRepository) : TxListViewModel<ReportsData>(repo) {
    var period by mutableStateOf(ReportPeriod.MONTH)
        private set

    init {
        start()
    }

    fun select(value: ReportPeriod) {
        period = value
        reload()
    }

    override suspend fun fetch(force: Boolean) = coroutineScope {
        val p = period
        // "All time" by day would be hundreds of bars; months are the readable unit there.
        val byMonth = p == ReportPeriod.ALL
        val totals = async { repo.incomeVsExpense(p.api) }
        val spend = async { repo.spendOverTime(p.api, if (byMonth) "month" else "day") }
        val slices = async { repo.categoryBreakdown(p.api) }
        val accounts = async { repo.byAccount(p.api) }
        val mom = async { if (p == ReportPeriod.MONTH) repo.monthOverMonth() else emptyList() }
        val lookups = async { repo.lookups(force) }
        val points = spend.await().let { raw ->
            if (byMonth) {
                raw.sortedBy { it.label }.map { it.copy(label = Fmt.monthKeyLabel(it.label)) }
            } else {
                raw.sortedBy { Fmt.dayLabelOrder(it.label) }
            }
        }
        ReportsData(totals.await(), points, slices.await(), accounts.await(), mom.await(), lookups.await())
    }
}
