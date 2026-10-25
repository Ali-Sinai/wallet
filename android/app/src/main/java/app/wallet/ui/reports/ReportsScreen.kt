package app.wallet.ui.reports

import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.wallet.R
import app.wallet.ui.components.EmptyBox
import app.wallet.ui.components.ErrorBox
import app.wallet.ui.components.Load
import app.wallet.ui.components.LoadingBox
import app.wallet.ui.components.displayName
import app.wallet.ui.components.parseColor
import app.wallet.ui.theme.WalletColors
import app.wallet.util.Fmt

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ReportsScreen(vm: ReportsViewModel) {
    Column(Modifier.fillMaxSize()) {
        Text(
            stringResource(R.string.tab_reports),
            Modifier.padding(start = 22.dp, end = 22.dp, top = 14.dp),
            fontSize = 22.sp,
            fontWeight = FontWeight.Bold,
        )
        Row(
            Modifier
                .horizontalScroll(rememberScrollState())
                .padding(horizontal = 22.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            for ((p, label) in listOf(
                ReportPeriod.TODAY to R.string.period_today,
                ReportPeriod.WEEK to R.string.period_week,
                ReportPeriod.MONTH to R.string.period_month,
                ReportPeriod.ALL to R.string.period_all,
            )) {
                FilterChip(selected = vm.period == p, onClick = { vm.select(p) }, label = { Text(stringResource(label)) })
            }
        }

        PullToRefreshBox(isRefreshing = vm.refreshing, onRefresh = vm::refresh, modifier = Modifier.fillMaxSize()) {
            when (val s = vm.state) {
                Load.Loading -> LoadingBox()
                is Load.Failed -> ErrorBox(s.message, onRetry = vm::refresh)
                is Load.Ready -> {
                    val d = s.data
                    LazyColumn(Modifier.fillMaxSize()) {
                        item { Totals(d) }
                        item { SpendBars(d) }
                        item { Categories(d) }
                        if (d.monthOverMonth.isNotEmpty()) item { MonthOverMonth(d) }
                        if (d.accounts.isNotEmpty()) item { Accounts(d) }
                        item { Box(Modifier.height(24.dp)) }
                    }
                }
            }
        }
    }
}

@Composable
private fun Card(title: String, content: @Composable () -> Unit) {
    Column(
        Modifier
            .padding(horizontal = 16.dp, vertical = 6.dp)
            .fillMaxWidth()
            .clip(RoundedCornerShape(18.dp))
            .background(WalletColors.surface)
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Text(title, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
        content()
    }
}

@Composable
private fun Totals(d: ReportsData) {
    val net = d.totals.incomeCents - d.totals.expenseCents
    Card(stringResource(R.string.income_vs_expense)) {
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            Stat(stringResource(R.string.income), Fmt.group(d.totals.incomeCents), WalletColors.income, Modifier.weight(1f))
            Stat(stringResource(R.string.expense), Fmt.group(d.totals.expenseCents), WalletColors.expense, Modifier.weight(1f))
        }
        Text(
            stringResource(R.string.net_line, Fmt.money(net, signed = true)),
            fontSize = 13.sp,
            fontWeight = FontWeight.Bold,
            color = if (net >= 0) WalletColors.income else WalletColors.expense,
        )
        val total = d.totals.incomeCents + d.totals.expenseCents
        if (total > 0) {
            Row(
                Modifier
                    .fillMaxWidth()
                    .height(8.dp)
                    .clip(RoundedCornerShape(4.dp)),
            ) {
                if (d.totals.incomeCents > 0) Box(Modifier.weight(d.totals.incomeCents.toFloat()).fillMaxHeight().background(WalletColors.income))
                if (d.totals.expenseCents > 0) Box(Modifier.weight(d.totals.expenseCents.toFloat()).fillMaxHeight().background(WalletColors.expense))
            }
        }
    }
}

@Composable
private fun Stat(label: String, value: String, color: Color, modifier: Modifier) {
    Column(modifier) {
        Text(label, fontSize = 11.5.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(value, fontSize = 18.sp, fontWeight = FontWeight.Bold, color = color)
    }
}

@Composable
private fun SpendBars(d: ReportsData) {
    Card(stringResource(R.string.spend_over_time)) {
        if (d.spend.isEmpty()) {
            EmptyBox(stringResource(R.string.no_transactions))
            return@Card
        }
        val max = d.spend.maxOf { it.amountCents }.coerceAtLeast(1L)
        Row(
            Modifier
                .horizontalScroll(rememberScrollState())
                .height(150.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.Bottom,
        ) {
            for (point in d.spend) {
                Column(
                    Modifier
                        .width(30.dp)
                        .fillMaxHeight(),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(4.dp, Alignment.Bottom),
                ) {
                    Text(Fmt.short(point.amountCents), fontSize = 8.5.sp, maxLines = 1, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    // The bar area takes what the two labels leave; the bar fills its share of it.
                    Box(Modifier.weight(1f).fillMaxWidth(), contentAlignment = Alignment.BottomCenter) {
                        Box(
                            Modifier
                                .fillMaxWidth()
                                .fillMaxHeight((point.amountCents.toFloat() / max).coerceAtLeast(0.03f))
                                .clip(RoundedCornerShape(topStart = 4.dp, topEnd = 4.dp))
                                .background(if (point.amountCents > max * 0.7) WalletColors.primary else WalletColors.barIdle),
                        )
                    }
                    Text(Fmt.localize(point.label).split(" ").first(), fontSize = 9.5.sp, maxLines = 1, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        }
    }
}

@Composable
private fun Categories(d: ReportsData) {
    val uncategorized = stringResource(R.string.uncategorized)
    Card(stringResource(R.string.categories)) {
        if (d.slices.isEmpty()) {
            EmptyBox(stringResource(R.string.no_transactions))
            return@Card
        }
        for (slice in d.slices) {
            val name = if (slice.categoryId == null) uncategorized else d.lookups.category(slice.categoryId)?.displayName() ?: slice.label
            Column(verticalArrangement = Arrangement.spacedBy(5.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Box(Modifier.size(8.dp).clip(CircleShape).background(parseColor(slice.color)))
                    Text(name, Modifier.weight(1f), fontSize = 13.sp)
                    Text(Fmt.group(slice.amountCents), fontSize = 13.sp, fontWeight = FontWeight.Bold)
                    Text(
                        Fmt.percent(slice.percentage),
                        fontSize = 11.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                Box(
                    Modifier
                        .fillMaxWidth()
                        .height(5.dp)
                        .clip(RoundedCornerShape(3.dp))
                        .background(WalletColors.barIdle),
                ) {
                    Box(
                        Modifier
                            .fillMaxWidth((slice.percentage / 100).toFloat().coerceIn(0f, 1f))
                            .fillMaxHeight()
                            .background(parseColor(slice.color)),
                    )
                }
            }
        }
    }
}

@Composable
private fun MonthOverMonth(d: ReportsData) {
    val uncategorized = stringResource(R.string.uncategorized)
    Card(stringResource(R.string.month_over_month)) {
        for ((i, row) in d.monthOverMonth.withIndex()) {
            if (i > 0) HorizontalDivider(color = WalletColors.border)
            val name = if (row.categoryId == null) uncategorized else d.lookups.category(row.categoryId)?.displayName() ?: row.label
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text(name, fontSize = 13.sp)
                    Text(
                        stringResource(R.string.previous_month, Fmt.group(row.previousCents)),
                        fontSize = 11.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                Column(horizontalAlignment = Alignment.End) {
                    Text(Fmt.group(row.currentCents), fontSize = 13.sp, fontWeight = FontWeight.Bold)
                    val delta = row.deltaPercentage
                    Text(
                        if (delta == null) stringResource(R.string.new_this_month)
                        else (if (delta > 0) "+" else if (delta < 0) "−" else "") +
                            Fmt.percent(kotlin.math.abs(delta)),
                        fontSize = 11.sp,
                        // Spending more than last month is the bad direction.
                        color = when {
                            delta == null -> MaterialTheme.colorScheme.onSurfaceVariant
                            delta > 0 -> WalletColors.expense
                            else -> WalletColors.income
                        },
                    )
                }
            }
        }
    }
}

@Composable
private fun Accounts(d: ReportsData) {
    Card(stringResource(R.string.by_account)) {
        for ((i, row) in d.accounts.withIndex()) {
            if (i > 0) HorizontalDivider(color = WalletColors.border)
            val name = d.lookups.account(row.accountId)?.displayName() ?: row.label
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(name, Modifier.weight(1f), fontSize = 13.sp)
                Column(horizontalAlignment = Alignment.End) {
                    Text("+" + Fmt.group(row.totalInCents), fontSize = 12.sp, color = WalletColors.income)
                    Text("−" + Fmt.group(row.totalOutCents), fontSize = 12.sp, color = WalletColors.expense)
                }
            }
        }
    }
}
