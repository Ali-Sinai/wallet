package app.wallet.ui.activity

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.wallet.R
import app.wallet.data.Direction
import app.wallet.ui.components.EmptyBox
import app.wallet.ui.components.ErrorBox
import app.wallet.ui.components.Load
import app.wallet.ui.components.LoadingBox
import app.wallet.ui.components.TransactionDetailSheet
import app.wallet.ui.components.TxRow
import app.wallet.ui.components.displayName
import app.wallet.ui.design.Choice
import app.wallet.ui.design.Choices
import app.wallet.ui.design.LineIcons
import app.wallet.ui.design.ScreenTitle
import app.wallet.ui.design.SectionHeader
import app.wallet.ui.design.TitleButton
import app.wallet.ui.design.faint
import app.wallet.ui.design.family
import app.wallet.ui.design.gutter
import app.wallet.ui.design.softCard
import app.wallet.ui.theme.Family
import app.wallet.ui.theme.WalletColors
import app.wallet.util.Fmt

/** All transactions: search, in/out and category filters — Activity in each design. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ActivityScreen(vm: ActivityViewModel, onAdd: () -> Unit, onSplit: (Long) -> Unit, onEdit: (Long) -> Unit) {
    val f = family
    val ready = (vm.state as? Load.Ready<*>)?.data as? ActivityData

    Column(Modifier.fillMaxSize()) {
        ScreenTitle(
            stringResource(R.string.tab_activity),
            right = if (f == Family.CLASSIC) null else ({ TitleButton(LineIcons.Plus, stringResource(R.string.add_transaction), onAdd) }),
        )
        SearchField(vm.search, vm::updateSearch)

        val directions = listOf(
            Choice<Direction?>(null, stringResource(R.string.filter_all)),
            Choice<Direction?>(Direction.WITHDRAWAL, stringResource(R.string.expense)),
            Choice<Direction?>(Direction.DEPOSIT, stringResource(R.string.income)),
        )
        Choices(
            directions,
            vm.direction,
            vm::selectDirection,
            Modifier.padding(horizontal = gutter).padding(top = if (f == Family.DARK) 22.dp else 12.dp),
        )
        val categories = ready?.lookups?.categories.orEmpty()
        if (categories.isNotEmpty()) {
            Choices(
                listOf(Choice<Long?>(null, stringResource(R.string.all_categories))) +
                    categories.map { Choice<Long?>(it.id, it.displayName()) },
                vm.categoryId,
                vm::selectCategory,
                Modifier.padding(horizontal = gutter).padding(top = 10.dp),
                scroll = true,
            )
        }

        PullToRefreshBox(
            isRefreshing = vm.refreshing,
            onRefresh = vm::refresh,
            modifier = Modifier
                .fillMaxSize()
                .padding(top = 6.dp),
        ) {
            when (val s = vm.state) {
                Load.Loading -> LoadingBox()
                is Load.Failed -> ErrorBox(s.message, onRetry = vm::refresh)
                is Load.Ready -> {
                    val data = s.data
                    // Still a scrollable when empty, so pull-to-refresh works there too.
                    LazyColumn(Modifier.fillMaxSize()) {
                        if (f != Family.CLASSIC) {
                            item {
                                SectionHeader(
                                    if (f == Family.DARK) stringResource(R.string.results_count, Fmt.digits(data.transactions.size))
                                    else stringResource(R.string.tab_activity),
                                    Modifier.padding(horizontal = gutter).padding(top = 22.dp, bottom = 8.dp),
                                ) {
                                    if (f == Family.SOFT) Text(Fmt.digits(data.transactions.size), fontSize = 12.5.sp, color = faint)
                                }
                            }
                        }
                        if (data.transactions.isEmpty()) item { EmptyBox(stringResource(R.string.no_transactions)) }
                        items(data.transactions, key = { it.id }) { tx ->
                            TxRow(tx, data.lookups, onClick = { vm.selected = tx })
                        }
                        item { Box(Modifier.height(16.dp)) }
                    }
                    vm.selected?.let { tx ->
                        TransactionDetailSheet(
                            tx,
                            data.lookups,
                            deleting = vm.deleting,
                            onDelete = { vm.delete(tx) },
                            onDismiss = { vm.selected = null },
                            onSplit = {
                                vm.selected = null
                                onSplit(tx.id)
                            },
                            onEdit = {
                                vm.selected = null
                                onEdit(tx.id)
                            },
                        )
                    }
                }
            }
        }
    }
}

/** The search box: classic outlined field, Dark an underline, Soft a white pill. */
@Composable
private fun SearchField(value: String, onChange: (String) -> Unit) {
    val p = WalletColors
    when (family) {
        Family.CLASSIC -> OutlinedTextField(
            value = value,
            onValueChange = onChange,
            placeholder = { Text(stringResource(R.string.search)) },
            leadingIcon = { Icon(Icons.Filled.Search, contentDescription = null) },
            singleLine = true,
            shape = RoundedCornerShape(14.dp),
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 22.dp, vertical = 10.dp),
        )
        Family.DARK, Family.SOFT -> {
            val dark = family == Family.DARK
            val line = p.ink.copy(alpha = 0.14f)
            Row(
                Modifier
                    .padding(horizontal = gutter)
                    .padding(top = if (dark) 30.dp else 18.dp)
                    .fillMaxWidth()
                    .then(
                        if (dark) {
                            Modifier.drawBehind {
                                drawLine(line, Offset(0f, size.height), Offset(size.width, size.height), 1.dp.toPx())
                            }
                        } else {
                            Modifier
                                .height(50.dp)
                                .softCard(p.surface, radius = 25.dp)
                                .padding(horizontal = 18.dp)
                        },
                    ),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                Icon(LineIcons.Search, null, Modifier.size(18.dp), tint = faint)
                Box(Modifier.weight(1f).padding(vertical = 12.dp)) {
                    if (value.isEmpty()) Text(stringResource(R.string.search), fontSize = if (dark) 15.sp else 14.sp, color = faint)
                    BasicTextField(
                        value,
                        onChange,
                        singleLine = true,
                        textStyle = TextStyle(fontSize = if (dark) 15.sp else 14.sp, color = p.foreground),
                        cursorBrush = SolidColor(p.primary),
                        modifier = Modifier.fillMaxWidth(),
                    )
                }
            }
        }
    }
}
