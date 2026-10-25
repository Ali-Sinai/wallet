package app.wallet.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.wallet.R
import app.wallet.data.Direction
import app.wallet.data.Lookups
import app.wallet.data.Transaction
import app.wallet.ui.theme.WalletColors
import app.wallet.util.Fmt

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TransactionDetailSheet(
    tx: Transaction,
    lookups: Lookups,
    deleting: Boolean,
    onDelete: () -> Unit,
    onDismiss: () -> Unit,
    onSplit: (() -> Unit)? = null,
    onEdit: (() -> Unit)? = null,
) {
    var confirming by remember { mutableStateOf(false) }

    ModalBottomSheet(onDismissRequest = onDismiss, containerColor = MaterialTheme.colorScheme.surfaceContainer) {
        Column(
            Modifier
                .fillMaxWidth()
                .navigationBarsPadding()
                .padding(horizontal = 22.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            Text(
                tx.merchantText ?: tx.note ?: stringResource(R.string.transaction),
                style = MaterialTheme.typography.titleLarge,
            )
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                Text(
                    Fmt.money(tx.signedCents, signed = true),
                    fontSize = 30.sp,
                    fontWeight = FontWeight.Bold,
                    color = if (tx.direction == Direction.WITHDRAWAL) WalletColors.expense else WalletColors.income,
                )
                Text(
                    stringResource(R.string.toman),
                    modifier = Modifier.padding(top = 12.dp),
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            Spacer(Modifier.height(4.dp))
            DetailLine(R.string.date, "${tx.occurredAtJalali} · ${Fmt.time(tx.occurredAt)}")
            DetailLine(R.string.account, lookups.account(tx.accountId)?.displayName() ?: "—")
            DetailLine(
                R.string.category,
                lookups.category(tx.categoryId)?.displayName() ?: stringResource(R.string.uncategorized),
            )
            tx.merchantText?.let { DetailLine(R.string.merchant, it) }
            tx.note?.let { DetailLine(R.string.note, it) }
            DetailLine(
                R.string.source,
                stringResource(
                    when (tx.source) {
                        "sms" -> R.string.source_sms
                        "split_settlement" -> R.string.source_split_settlement
                        else -> R.string.source_manual
                    },
                ) + if (tx.isShared) " · " + stringResource(R.string.shared) else "",
            )
            Spacer(Modifier.height(8.dp))
            if (onEdit != null) {
                OutlinedButton(onClick = onEdit, modifier = Modifier.fillMaxWidth()) {
                    Text(stringResource(R.string.edit))
                }
            }
            if (onSplit != null && tx.direction == Direction.WITHDRAWAL) {
                OutlinedButton(onClick = onSplit, modifier = Modifier.fillMaxWidth()) {
                    Text(stringResource(if (tx.isShared) R.string.view_split else R.string.split))
                }
            }
            OutlinedButton(
                onClick = { confirming = true },
                enabled = !deleting,
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text(stringResource(R.string.delete), color = WalletColors.expense)
            }
            Spacer(Modifier.height(12.dp))
        }
    }

    if (confirming) {
        AlertDialog(
            onDismissRequest = { confirming = false },
            text = { Text(stringResource(R.string.delete_confirm)) },
            confirmButton = {
                TextButton(onClick = {
                    confirming = false
                    onDelete()
                }) { Text(stringResource(R.string.delete), color = WalletColors.expense) }
            },
            dismissButton = {
                TextButton(onClick = { confirming = false }) { Text(stringResource(R.string.cancel)) }
            },
        )
    }
}

@Composable
private fun DetailLine(label: Int, value: String) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(stringResource(label), color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 13.sp)
        Text(value, fontSize = 13.5.sp, modifier = Modifier.padding(start = 16.dp))
    }
}
