package app.wallet.ui.home

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LocalContentColor
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.wallet.R
import app.wallet.data.CategorySlice
import app.wallet.data.Dashboard
import app.wallet.ui.components.ErrorBox
import app.wallet.ui.components.LoadingBox
import app.wallet.ui.components.Load
import app.wallet.ui.components.TransactionDetailSheet
import app.wallet.ui.components.TxRow
import app.wallet.ui.design.family
import app.wallet.ui.split.SplitPickerDialog
import app.wallet.ui.theme.Family
import app.wallet.ui.components.displayName
import app.wallet.ui.components.parseColor
import app.wallet.ui.theme.WalletColors
import app.wallet.util.Fmt

/** What the home screens can open. */
class HomeActions(
    val seeAll: () -> Unit,
    val openInbox: () -> Unit,
    val settings: () -> Unit,
    val split: (Long) -> Unit,
    val edit: (Long) -> Unit,
    val add: () -> Unit,
    val reports: () -> Unit,
)

/** Home, in the active design: classic MobileHome, DarkHome or SoftHome (frontend/src/pages/Dashboard.tsx). */
@Suppress("UNCHECKED_CAST")
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(vm: HomeViewModel, username: String, actions: HomeActions) {
    var pickingSplit by remember { mutableStateOf(false) }
    PullToRefreshBox(isRefreshing = vm.refreshing, onRefresh = vm::refresh, modifier = Modifier.fillMaxSize()) {
        when (family) {
            Family.CLASSIC -> ClassicHome(vm, actions)
            Family.DARK -> DarkHome(vm, actions, onSplitPicker = { pickingSplit = true })
            Family.SOFT -> SoftHome(vm, username, actions)
        }
    }

    val ready = (vm.state as? Load.Ready<HomeData>)?.data
    val selected = vm.selected
    if (ready != null && selected != null) {
        TransactionDetailSheet(
            selected,
            ready.lookups,
            deleting = vm.deleting,
            onDelete = { vm.delete(selected) },
            onDismiss = { vm.selected = null },
            onSplit = {
                vm.selected = null
                actions.split(selected.id)
            },
            onEdit = {
                vm.selected = null
                actions.edit(selected.id)
            },
        )
    }
    if (pickingSplit) {
        SplitPickerDialog(
            onPick = {
                pickingSplit = false
                actions.split(it)
            },
            onDismiss = { pickingSplit = false },
        )
    }
}

/** Classic: MobileHome in frontend/src/pages/Dashboard.tsx. */
@Composable
private fun ClassicHome(vm: HomeViewModel, actions: HomeActions) {
    val onSeeAll = actions.seeAll
    val onOpenInbox = actions.openInbox
    val onSettings = actions.settings
    LazyColumn(Modifier.fillMaxSize()) {
        item {
            Row(
                Modifier.padding(start = 22.dp, end = 10.dp, top = 8.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Column(Modifier.weight(1f)) {
                    Text(stringResource(R.string.app_name), fontSize = 22.sp, fontWeight = FontWeight.Bold)
                    Text(Fmt.jalaliMonthLabel(), fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                IconButton(onClick = onSettings) {
                    Icon(
                        Icons.Filled.Settings,
                        contentDescription = stringResource(R.string.settings),
                        tint = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
        }
        when (val s = vm.state) {
            Load.Loading -> item { LoadingBox() }
            is Load.Failed -> item { ErrorBox(s.message, onRetry = vm::refresh) }
            is Load.Ready -> {
                val data = s.data
                item { Hero(data.dashboard) }
                if (data.pendingSms > 0) item { PendingSmsBanner(data.pendingSms, onOpenInbox) }
                item { DailySpend(data.dashboard) }
                if (data.slices.isNotEmpty()) item { Categories(data.slices, data) }
                if (data.budgets.isNotEmpty()) item { Budgets(data) }
                item {
                    Row(
                        Modifier
                            .fillMaxWidth()
                            .padding(start = 22.dp, end = 10.dp, top = 18.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        SectionLabel(stringResource(R.string.recent), Modifier.weight(1f))
                        TextButton(onClick = onSeeAll) { Text(stringResource(R.string.see_all), fontSize = 12.sp) }
                    }
                }
                items(data.recent, key = { it.id }) { tx ->
                    TxRow(tx, data.lookups, onClick = { vm.selected = tx })
                }
            }
        }
    }
}

@Composable
private fun Hero(d: Dashboard) {
    val shape = RoundedCornerShape(22.dp)
    val palette = WalletColors
    val fg = palette.heroForeground
    CompositionLocalProvider(LocalContentColor provides fg) {
        Column(
            Modifier
                .padding(horizontal = 22.dp)
                .padding(top = 14.dp)
                .fillMaxWidth()
                .clip(shape)
                .background(palette.hero)
                .border(BorderStroke(1.dp, palette.heroBorder), shape)
                .padding(18.dp),
        ) {
            Text(stringResource(R.string.balance), fontSize = 11.5.sp, color = fg.copy(alpha = 0.5f))
            Row(verticalAlignment = Alignment.Bottom, horizontalArrangement = Arrangement.spacedBy(7.dp)) {
                Text(Fmt.money(d.netCents), fontSize = 34.sp, fontWeight = FontWeight.Bold)
                Text(
                    stringResource(R.string.toman_short),
                    fontSize = 14.sp,
                    color = fg.copy(alpha = 0.5f),
                    modifier = Modifier.padding(bottom = 6.dp),
                )
            }
            Row(Modifier.padding(top = 14.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                MiniStat(
                    stringResource(R.string.income),
                    Fmt.short(d.totalInCents),
                    stringResource(R.string.count_deposits, Fmt.digits(d.depositCount)),
                    palette.heroIncome,
                    Modifier.weight(1f),
                )
                MiniStat(
                    stringResource(R.string.expense),
                    Fmt.short(d.totalOutCents),
                    stringResource(R.string.count_withdrawals, Fmt.digits(d.withdrawalCount)),
                    palette.heroExpense,
                    Modifier.weight(1f),
                )
            }
        }
    }
}

/** Stands in for the web home's SMS highlight card: there are messages to confirm. */
@Composable
private fun PendingSmsBanner(count: Int, onClick: () -> Unit) {
    Row(
        Modifier
            .padding(horizontal = 22.dp)
            .padding(top = 14.dp)
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(WalletColors.primaryTint)
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(stringResource(R.string.pending_sms_banner, Fmt.digits(count)), Modifier.weight(1f), fontSize = 13.5.sp)
        Text(stringResource(R.string.review), color = WalletColors.income, fontWeight = FontWeight.Bold, fontSize = 13.sp)
    }
}

@Composable
private fun MiniStat(label: String, value: String, sub: String, color: Color, modifier: Modifier) {
    Column(
        modifier
            .clip(RoundedCornerShape(13.dp))
            .background(LocalContentColor.current.copy(alpha = 0.06f))
            .padding(horizontal = 12.dp, vertical = 10.dp),
    ) {
        val faint = LocalContentColor.current.copy(alpha = 0.5f)
        Text(label, fontSize = 11.5.sp, color = faint)
        Text(value, fontSize = 15.5.sp, fontWeight = FontWeight.Bold, color = color)
        Text(sub, fontSize = 10.5.sp, color = faint)
    }
}

@Composable
private fun Section(content: @Composable () -> Unit) {
    Column(Modifier.padding(horizontal = 22.dp).padding(top = 16.dp)) {
        HorizontalDivider(color = WalletColors.ink.copy(alpha = 0.08f))
        Column(Modifier.padding(top = 13.dp)) { content() }
    }
}

@Composable
private fun SectionLabel(text: String, modifier: Modifier = Modifier) {
    Text(text, modifier, fontSize = 11.5.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
}

@Composable
private fun DailySpend(d: Dashboard) {
    val bars = d.dailySpend
    val max = (bars.maxOfOrNull { it.amountCents } ?: 0L).coerceAtLeast(1L)
    val avg = if (bars.isEmpty()) 0L else bars.sumOf { it.amountCents } / bars.size
    Section {
        Row(verticalAlignment = Alignment.CenterVertically) {
            SectionLabel(stringResource(R.string.daily_spend), Modifier.weight(1f))
            Text(stringResource(R.string.average, Fmt.short(avg)), fontSize = 11.5.sp)
        }
        Row(
            Modifier
                .fillMaxWidth()
                .height(62.dp)
                .padding(top = 11.dp),
            horizontalArrangement = Arrangement.spacedBy(5.dp),
            verticalAlignment = Alignment.Bottom,
        ) {
            for (bar in bars) {
                val fraction = (bar.amountCents.toFloat() / max).coerceAtLeast(0.06f)
                Box(
                    Modifier
                        .weight(1f)
                        .fillMaxHeight(fraction)
                        .clip(RoundedCornerShape(topStart = 3.dp, topEnd = 3.dp))
                        .background(if (bar.amountCents > max * 0.7) WalletColors.primary else WalletColors.barIdle),
                )
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun Categories(slices: List<CategorySlice>, data: HomeData) {
    val uncategorized = stringResource(R.string.uncategorized)
    Section {
        SectionLabel(stringResource(R.string.categories))
        Row(
            Modifier
                .padding(top = 10.dp)
                .fillMaxWidth()
                .height(9.dp)
                .clip(RoundedCornerShape(3.dp)),
        ) {
            for (slice in slices) {
                val weight = slice.percentage.toFloat()
                if (weight > 0f) Box(Modifier.weight(weight).fillMaxHeight().background(parseColor(slice.color)))
            }
        }
        FlowRow(
            Modifier.padding(top = 9.dp),
            horizontalArrangement = Arrangement.spacedBy(14.dp),
            verticalArrangement = Arrangement.spacedBy(5.dp),
        ) {
            for (slice in slices) {
                val name = if (slice.categoryId == null) uncategorized
                else data.lookups.category(slice.categoryId)?.displayName() ?: slice.label
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(5.dp)) {
                    Box(Modifier.size(7.dp).clip(RoundedCornerShape(2.dp)).background(parseColor(slice.color)))
                    Text("$name ${Fmt.percent(slice.percentage)}", fontSize = 11.5.sp)
                }
            }
        }
    }
}

/** Each budget against this month's spend in its category — BudgetsCard in ReportCards.tsx. */
@Composable
private fun Budgets(data: HomeData) {
    Section {
        SectionLabel(stringResource(R.string.budget_this_month))
        Column(Modifier.padding(top = 10.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            for (budget in data.budgets) {
                val category = data.lookups.category(budget.categoryId)
                val used = data.slices.firstOrNull { it.categoryId == budget.categoryId }?.amountCents ?: 0L
                val fraction = if (budget.limitCents > 0) used.toFloat() / budget.limitCents else 0f
                Column(verticalArrangement = Arrangement.spacedBy(5.dp)) {
                    Row {
                        Text(category?.displayName() ?: "—", Modifier.weight(1f), fontSize = 12.sp)
                        Text("${Fmt.short(used)} / ${Fmt.short(budget.limitCents)}", fontSize = 12.sp)
                    }
                    Box(
                        Modifier
                            .fillMaxWidth()
                            .height(6.dp)
                            .clip(RoundedCornerShape(3.dp))
                            .background(WalletColors.barIdle),
                    ) {
                        Box(
                            Modifier
                                .fillMaxWidth(fraction.coerceIn(0f, 1f))
                                .fillMaxHeight()
                                .background(if (fraction > 1f) WalletColors.expense else category?.let { parseColor(it.color) } ?: WalletColors.primary),
                        )
                    }
                }
            }
        }
    }
}
