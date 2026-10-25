package app.wallet.ui.activity

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
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

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ActivityScreen(vm: ActivityViewModel) {
    Column(Modifier.fillMaxSize()) {
        Text(
            stringResource(R.string.tab_activity),
            Modifier.padding(start = 22.dp, end = 22.dp, top = 14.dp),
            fontSize = 22.sp,
            fontWeight = FontWeight.Bold,
        )
        OutlinedTextField(
            value = vm.search,
            onValueChange = vm::updateSearch,
            placeholder = { Text(stringResource(R.string.search)) },
            leadingIcon = { Icon(Icons.Filled.Search, contentDescription = null) },
            singleLine = true,
            shape = RoundedCornerShape(14.dp),
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 22.dp, vertical = 10.dp),
        )
        Row(Modifier.padding(horizontal = 22.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            for ((value, label) in listOf(
                null to R.string.filter_all,
                Direction.WITHDRAWAL to R.string.expense,
                Direction.DEPOSIT to R.string.income,
            )) {
                FilterChip(
                    selected = vm.direction == value,
                    onClick = { vm.selectDirection(value) },
                    label = { Text(stringResource(label)) },
                )
            }
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
                    if (data.transactions.isEmpty()) {
                        // Still a scrollable, so pull-to-refresh works on an empty list too.
                        LazyColumn(Modifier.fillMaxSize()) {
                            item { EmptyBox(stringResource(R.string.no_transactions)) }
                        }
                    } else {
                        LazyColumn(Modifier.fillMaxSize()) {
                            items(data.transactions, key = { it.id }) { tx ->
                                TxRow(tx, data.lookups, onClick = { vm.selected = tx })
                            }
                        }
                    }
                    vm.selected?.let { tx ->
                        TransactionDetailSheet(
                            tx,
                            data.lookups,
                            deleting = vm.deleting,
                            onDelete = { vm.delete(tx) },
                            onDismiss = { vm.selected = null },
                        )
                    }
                }
            }
        }
    }
}
