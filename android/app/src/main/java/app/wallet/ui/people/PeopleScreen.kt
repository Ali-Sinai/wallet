package app.wallet.ui.people

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.wallet.R
import app.wallet.ui.components.EmptyBox
import app.wallet.ui.components.ErrorBox
import app.wallet.ui.components.Load
import app.wallet.ui.components.LoadingBox
import app.wallet.ui.theme.WalletColors
import app.wallet.util.Fmt

/** Green when they owe me, red when I owe them, muted when even. */
@Composable
fun balanceColor(net: Long): Color = when {
    net > 0 -> WalletColors.income
    net < 0 -> WalletColors.expense
    else -> MaterialTheme.colorScheme.onSurfaceVariant
}

@Composable
fun balanceText(net: Long): String = when {
    net > 0 -> stringResource(R.string.owes_you, Fmt.group(net))
    net < 0 -> stringResource(R.string.you_owe, Fmt.group(net))
    else -> stringResource(R.string.settled)
}

@Composable
fun Avatar(name: String, color: Color, size: Dp = 40.dp) {
    Box(
        Modifier
            .size(size)
            .clip(CircleShape)
            .background(color.copy(alpha = 0.16f)),
        contentAlignment = Alignment.Center,
    ) {
        Text(Fmt.initials(name), color = color, fontWeight = FontWeight.Bold, fontSize = (size.value * 0.36f).sp)
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PeopleScreen(vm: PeopleViewModel, onOpen: (Long) -> Unit) {
    var adding by remember { mutableStateOf(false) }

    Column(Modifier.fillMaxSize()) {
        Row(Modifier.padding(start = 22.dp, end = 8.dp, top = 8.dp), verticalAlignment = Alignment.CenterVertically) {
            Text(stringResource(R.string.tab_people), Modifier.weight(1f), fontSize = 22.sp, fontWeight = FontWeight.Bold)
            TextButton(onClick = { adding = true }) { Text(stringResource(R.string.add_person)) }
        }
        PullToRefreshBox(isRefreshing = vm.refreshing, onRefresh = vm::refresh, modifier = Modifier.fillMaxSize()) {
            when (val s = vm.state) {
                Load.Loading -> LoadingBox()
                is Load.Failed -> ErrorBox(s.message, onRetry = vm::refresh)
                is Load.Ready -> LazyColumn(Modifier.fillMaxSize()) {
                    if (s.data.isEmpty()) item { EmptyBox(stringResource(R.string.no_people)) }
                    items(s.data, key = { it.personId }) { person ->
                        Column(Modifier.clickable { onOpen(person.personId) }) {
                            Row(
                                Modifier
                                    .fillMaxWidth()
                                    .padding(horizontal = 22.dp, vertical = 12.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(12.dp),
                            ) {
                                val color = balanceColor(person.netCents)
                                Avatar(person.name, color)
                                Column(Modifier.weight(1f)) {
                                    Text(person.name, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                                    Text(balanceText(person.netCents), fontSize = 11.5.sp, color = color)
                                }
                                if (person.openDebtCount > 0) {
                                    Text(
                                        stringResource(R.string.open_debts, Fmt.digits(person.openDebtCount)),
                                        fontSize = 11.sp,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    )
                                }
                            }
                            HorizontalDivider(Modifier.padding(horizontal = 22.dp), color = WalletColors.border)
                        }
                    }
                }
            }
        }
    }

    if (adding) {
        PersonDialog(
            title = stringResource(R.string.add_person),
            initialName = "",
            initialNote = "",
            busy = vm.saving,
            error = vm.error,
            onSave = { name, note -> vm.add(name, note, onDone = { adding = false }) },
            onDismiss = { adding = false },
        )
    }
}

@Composable
fun PersonDialog(
    title: String,
    initialName: String,
    initialNote: String,
    busy: Boolean,
    error: String?,
    onSave: (String, String) -> Unit,
    onDismiss: () -> Unit,
    onDelete: (() -> Unit)? = null,
) {
    var name by remember { mutableStateOf(initialName) }
    var note by remember { mutableStateOf(initialNote) }
    var armed by remember { mutableStateOf(false) }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(title) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text(stringResource(R.string.person_name)) },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
                OutlinedTextField(
                    value = note,
                    onValueChange = { note = it },
                    label = { Text(stringResource(R.string.contact_note)) },
                    modifier = Modifier.fillMaxWidth(),
                )
                error?.let { Text(stringResource(R.string.error_server, it), color = WalletColors.expense, fontSize = 12.sp) }
                if (onDelete != null) {
                    TextButton(onClick = { if (armed) onDelete() else armed = true }, enabled = !busy) {
                        Text(
                            stringResource(if (armed) R.string.delete_tap_again else R.string.delete),
                            color = WalletColors.expense,
                        )
                    }
                }
            }
        },
        confirmButton = {
            TextButton(onClick = { onSave(name, note) }, enabled = !busy && name.isNotBlank()) {
                Text(stringResource(R.string.save))
            }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text(stringResource(R.string.cancel)) } },
    )
}
