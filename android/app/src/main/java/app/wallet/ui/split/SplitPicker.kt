package app.wallet.ui.split

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import app.wallet.R
import app.wallet.data.Direction
import app.wallet.data.Lookups
import app.wallet.data.Transaction
import app.wallet.data.WalletRepository
import app.wallet.ui.appViewModel
import app.wallet.ui.components.EmptyBox
import app.wallet.ui.components.LoadingBox
import app.wallet.ui.components.TxRow
import kotlinx.coroutines.launch

class SplitPickerViewModel(private val repo: WalletRepository) : ViewModel() {
    var rows by mutableStateOf<List<Transaction>?>(null)
        private set
    var lookups by mutableStateOf(Lookups())
        private set

    init {
        viewModelScope.launch {
            rows = runCatching {
                lookups = repo.lookups()
                repo.transactions(limit = 30, direction = Direction.WITHDRAWAL).filter { !it.isShared }
            }.getOrDefault(emptyList())
        }
    }
}

/**
 * Both new designs offer "split a bill" with no transaction in hand; a split
 * always starts from an expense, so this asks which one (SplitPicker in
 * frontend/src/designs/shared.tsx).
 */
@Composable
fun SplitPickerDialog(onPick: (Long) -> Unit, onDismiss: () -> Unit) {
    val vm = appViewModel { SplitPickerViewModel(it.wallet) }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(stringResource(R.string.pick_to_split)) },
        text = {
            val rows = vm.rows
            Column {
                when {
                    rows == null -> LoadingBox()
                    rows.isEmpty() -> EmptyBox(stringResource(R.string.nothing_to_split))
                    else -> LazyColumn(Modifier.heightIn(max = 420.dp)) {
                        items(rows, key = { it.id }) { tx -> TxRow(tx, vm.lookups, onClick = { onPick(tx.id) }) }
                    }
                }
            }
        },
        confirmButton = { TextButton(onClick = onDismiss) { Text(stringResource(R.string.cancel)) } },
    )
}
