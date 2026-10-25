package app.wallet.ui.reports

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyListScope
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.wallet.R
import app.wallet.data.CategorySlice
import app.wallet.ui.components.EmptyBox
import app.wallet.ui.components.displayName
import app.wallet.ui.components.parseColor
import app.wallet.ui.design.BigNumber
import app.wallet.ui.design.Choice
import app.wallet.ui.design.Choices
import app.wallet.ui.design.DarkLabel
import app.wallet.ui.design.Dot
import app.wallet.ui.design.Mono
import app.wallet.ui.design.SectionHeader
import app.wallet.ui.design.SoftAvatar
import app.wallet.ui.design.SpendLineChart
import app.wallet.ui.design.ThinMeter
import app.wallet.ui.design.faint
import app.wallet.ui.design.gutter
import app.wallet.ui.design.softCard
import app.wallet.ui.theme.WalletColors
import app.wallet.util.Fmt

/* The statistics screens of Wallet Dark and Wallet Soft (DarkReports / SoftReports in the web app). */

@Composable
private fun sliceName(slice: CategorySlice, d: ReportsData): String =
    if (slice.categoryId == null) stringResource(R.string.uncategorized)
    else d.lookups.category(slice.categoryId)?.displayName() ?: slice.label

/** Wallet Dark: the period's spend as a big thin number, text tabs, the hairline chart, then plain ledger sections. */
@Composable
fun DarkReports(d: ReportsData, periods: List<Choice<ReportPeriod>>, period: ReportPeriod, onPeriod: (ReportPeriod) -> Unit) {
    val p = WalletColors
    val periodLabel = periods.firstOrNull { it.key == period }?.label.orEmpty()
    LazyColumn(Modifier.fillMaxSize()) {
        item {
            Column(Modifier.padding(horizontal = gutter).padding(top = 32.dp)) {
                DarkLabel("${stringResource(R.string.spent)} · $periodLabel")
                BigNumber(Fmt.group(d.total), Modifier.padding(top = 12.dp))
                Text(
                    stringResource(R.string.average, Fmt.short(d.average)),
                    Modifier.padding(top = 16.dp),
                    fontFamily = Mono,
                    fontSize = 13.sp,
                    color = faint,
                )
                Choices(periods, period, onPeriod, Modifier.padding(top = 32.dp))
                SpendLineChart(d.spend)
            }
        }

        darkSection(R.string.categories) {
            if (d.slices.isEmpty()) EmptyBox(stringResource(R.string.no_transactions))
            for (slice in d.slices) {
                DarkLine(sliceName(slice, d), parseColor(slice.color)) {
                    Text(Fmt.percent(slice.percentage), fontFamily = Mono, fontSize = 12.sp, color = faint)
                    Text(Fmt.short(slice.amountCents), Modifier.widthIn(min = 64.dp), fontFamily = Mono, fontSize = 13.sp, textAlign = TextAlign.End)
                }
            }
        }

        darkSection(R.string.income_vs_expense) {
            val ie = d.totals
            Row(Modifier.padding(top = 8.dp)) {
                Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(stringResource(R.string.income), fontSize = 12.sp, color = faint)
                    BigNumber(Fmt.group(ie.incomeCents), size = 30.sp, color = p.income)
                }
                Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(stringResource(R.string.expense), fontSize = 12.sp, color = faint)
                    BigNumber(Fmt.group(ie.expenseCents), size = 30.sp, color = p.expense)
                }
            }
            val ratio = if (ie.incomeCents > 0) ie.expenseCents * 100.0 / ie.incomeCents else 0.0
            Row(Modifier.padding(top = 18.dp)) {
                Text("${stringResource(R.string.expense)} / ${stringResource(R.string.income)}", Modifier.weight(1f), fontFamily = Mono, fontSize = 12.sp, color = faint)
                Text(Fmt.percent(ratio), fontFamily = Mono, fontSize = 12.sp, color = faint)
            }
            ThinMeter((ratio / 100).toFloat(), if (ratio > 100) p.expense else p.accent)
        }

        if (d.budgets.isNotEmpty()) {
            darkSection(R.string.budgets) {
                for (b in d.budgets) {
                    val used = d.slices.firstOrNull { it.categoryId == b.categoryId }?.amountCents ?: 0L
                    val fraction = if (b.limitCents > 0) used.toFloat() / b.limitCents else 0f
                    Column(Modifier.padding(vertical = 4.dp)) {
                        DarkLine(d.lookups.category(b.categoryId)?.displayName() ?: "—", null) {
                            Text("${Fmt.short(used)} / ${Fmt.short(b.limitCents)}", fontFamily = Mono, fontSize = 13.sp)
                        }
                        ThinMeter(fraction, if (fraction > 1f) p.expense else p.foreground)
                    }
                }
            }
        }

        if (d.monthOverMonth.isNotEmpty()) {
            darkSection(R.string.month_over_month) {
                for (m in d.monthOverMonth) {
                    val name = if (m.categoryId == null) stringResource(R.string.uncategorized)
                    else d.lookups.category(m.categoryId)?.displayName() ?: m.label
                    DarkLine(name, null) {
                        Text(Fmt.short(m.currentCents), fontFamily = Mono, fontSize = 13.sp, color = faint)
                        val delta = m.deltaPercentage
                        Text(
                            if (delta == null) "—" else (if (delta > 0) "+" else "−") + Fmt.percent(kotlin.math.abs(delta)),
                            fontFamily = Mono,
                            fontSize = 13.sp,
                            color = when {
                                delta == null -> faint
                                delta > 0 -> p.expense
                                else -> p.income
                            },
                        )
                    }
                }
            }
        }

        if (d.accounts.isNotEmpty()) {
            darkSection(R.string.by_account) {
                for (a in d.accounts) {
                    DarkLine(d.lookups.account(a.accountId)?.displayName() ?: a.label, null) {
                        Text("+" + Fmt.short(a.totalInCents), fontFamily = Mono, fontSize = 13.sp, color = p.income)
                        Text("−" + Fmt.short(a.totalOutCents), fontFamily = Mono, fontSize = 13.sp, color = p.expense)
                    }
                }
            }
        }
        item { Box(Modifier.height(24.dp)) }
    }
}

private fun LazyListScope.darkSection(title: Int, content: @Composable () -> Unit) {
    item {
        Column(Modifier.padding(horizontal = gutter).padding(top = 40.dp)) {
            SectionHeader(stringResource(title), Modifier.padding(bottom = 8.dp))
            content()
        }
    }
}

/** A Dark ledger line: optional dot, the name, then mono figures at the end. */
@Composable
private fun DarkLine(name: String, dot: Color?, figures: @Composable () -> Unit) {
    Row(
        Modifier
            .fillMaxWidth()
            .padding(vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(18.dp),
    ) {
        if (dot != null) Dot(dot)
        Text(name, Modifier.weight(1f), fontSize = 14.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) { figures() }
    }
}

/** Wallet Soft: the total centred over a segmented control and the line, top spending as cards, then the report cards. */
@Composable
fun SoftReports(d: ReportsData, periods: List<Choice<ReportPeriod>>, period: ReportPeriod, onPeriod: (ReportPeriod) -> Unit) {
    val periodLabel = periods.firstOrNull { it.key == period }?.label.orEmpty()
    LazyColumn(Modifier.fillMaxSize()) {
        item {
            Column(Modifier.padding(horizontal = gutter).padding(top = 22.dp)) {
                Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(Fmt.group(d.total), fontSize = 30.sp, fontWeight = FontWeight.Bold)
                    Text("${stringResource(R.string.spent)} · $periodLabel", fontSize = 12.sp, color = faint)
                }
                Choices(periods, period, onPeriod, Modifier.padding(top = 22.dp))
                SpendLineChart(d.spend)
            }
        }
        item {
            SectionHeader(stringResource(R.string.top_spending), Modifier.padding(start = gutter + 4.dp, end = gutter, top = 22.dp, bottom = 6.dp))
        }
        val top = d.slices.take(3)
        if (top.isEmpty()) item { EmptyBox(stringResource(R.string.no_transactions)) }
        items(top, key = { it.categoryId ?: -1L }) { slice ->
            val name = sliceName(slice, d)
            Row(
                Modifier
                    .padding(horizontal = gutter, vertical = 6.dp)
                    .fillMaxWidth()
                    .softCard(WalletColors.surface)
                    .padding(14.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(14.dp),
            ) {
                SoftAvatar(name.firstOrNull()?.toString() ?: "·", parseColor(slice.color))
                Column(Modifier.weight(1f)) {
                    Text(name, fontSize = 15.sp, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    Text(Fmt.percent(slice.percentage), fontSize = 12.sp, color = faint)
                }
                Text("−" + Fmt.short(slice.amountCents), fontSize = 14.sp, fontWeight = FontWeight.Bold)
            }
        }
        item { Box(Modifier.height(16.dp)) }
        item { Totals(d) }
        if (d.monthOverMonth.isNotEmpty()) item { MonthOverMonth(d) }
        if (d.accounts.isNotEmpty()) item { Accounts(d) }
        item { Box(Modifier.height(24.dp)) }
    }
}
