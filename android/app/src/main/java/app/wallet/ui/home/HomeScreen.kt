package app.wallet.ui.home

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.material.icons.automirrored.filled.ExitToApp
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
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
import app.wallet.ui.components.parseColor
import app.wallet.ui.theme.WalletColors
import app.wallet.util.Fmt

/** The phone home screen — MobileHome in frontend/src/pages/Dashboard.tsx. */
@Suppress("UNCHECKED_CAST")
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(
    vm: HomeViewModel,
    username: String,
    serverUrl: String,
    onSeeAll: () -> Unit,
    onLogout: () -> Unit,
) {
    var confirmLogout by remember { mutableStateOf(false) }

    PullToRefreshBox(isRefreshing = vm.refreshing, onRefresh = vm::refresh, modifier = Modifier.fillMaxSize()) {
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
                    IconButton(onClick = { confirmLogout = true }) {
                        Icon(
                            Icons.AutoMirrored.Filled.ExitToApp,
                            contentDescription = stringResource(R.string.logout),
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
                    item { DailySpend(data.dashboard) }
                    if (data.slices.isNotEmpty()) item { Categories(data.slices, data) }
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

    val ready = (vm.state as? Load.Ready<HomeData>)?.data
    val selected = vm.selected
    if (ready != null && selected != null) {
        TransactionDetailSheet(
            selected,
            ready.lookups,
            deleting = vm.deleting,
            onDelete = { vm.delete(selected) },
            onDismiss = { vm.selected = null },
        )
    }

    if (confirmLogout) {
        AlertDialog(
            onDismissRequest = { confirmLogout = false },
            text = { Text(stringResource(R.string.logout_confirm, username, serverUrl.trimEnd('/'))) },
            confirmButton = {
                TextButton(onClick = {
                    confirmLogout = false
                    onLogout()
                }) { Text(stringResource(R.string.logout)) }
            },
            dismissButton = {
                TextButton(onClick = { confirmLogout = false }) { Text(stringResource(R.string.cancel)) }
            },
        )
    }
}

@Composable
private fun Hero(d: Dashboard) {
    val shape = RoundedCornerShape(22.dp)
    Column(
        Modifier
            .padding(horizontal = 22.dp)
            .padding(top = 14.dp)
            .fillMaxWidth()
            .clip(shape)
            .background(Brush.linearGradient(listOf(Color(0xFF12241D), Color(0xFF0B120F))))
            .border(BorderStroke(1.dp, WalletColors.Primary.copy(alpha = 0.28f)), shape)
            .padding(18.dp),
    ) {
        Text(stringResource(R.string.balance), fontSize = 11.5.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Row(verticalAlignment = Alignment.Bottom, horizontalArrangement = Arrangement.spacedBy(7.dp)) {
            Text(Fmt.money(d.netCents), fontSize = 34.sp, fontWeight = FontWeight.Bold)
            Text(
                stringResource(R.string.toman_short),
                fontSize = 14.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(bottom = 6.dp),
            )
        }
        Row(Modifier.padding(top = 14.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            MiniStat(
                stringResource(R.string.income),
                Fmt.short(d.totalInCents),
                stringResource(R.string.count_deposits, Fmt.digits(d.depositCount)),
                WalletColors.Income,
                Modifier.weight(1f),
            )
            MiniStat(
                stringResource(R.string.expense),
                Fmt.short(d.totalOutCents),
                stringResource(R.string.count_withdrawals, Fmt.digits(d.withdrawalCount)),
                WalletColors.Expense,
                Modifier.weight(1f),
            )
        }
    }
}

@Composable
private fun MiniStat(label: String, value: String, sub: String, color: Color, modifier: Modifier) {
    Column(
        modifier
            .clip(RoundedCornerShape(13.dp))
            .background(Color.White.copy(alpha = 0.04f))
            .padding(horizontal = 12.dp, vertical = 10.dp),
    ) {
        Text(label, fontSize = 11.5.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(value, fontSize = 15.5.sp, fontWeight = FontWeight.Bold, color = color)
        Text(sub, fontSize = 10.5.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

@Composable
private fun Section(content: @Composable () -> Unit) {
    Column(Modifier.padding(horizontal = 22.dp).padding(top = 16.dp)) {
        HorizontalDivider(color = Color.White.copy(alpha = 0.08f))
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
                        .background(if (bar.amountCents > max * 0.7) WalletColors.Primary else WalletColors.BarIdle),
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
                else data.lookups.category(slice.categoryId)?.nameFa ?: slice.label
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(5.dp)) {
                    Box(Modifier.size(7.dp).clip(RoundedCornerShape(2.dp)).background(parseColor(slice.color)))
                    Text("$name ${Fmt.digits(Math.round(slice.percentage))}٪", fontSize = 11.5.sp)
                }
            }
        }
    }
}
