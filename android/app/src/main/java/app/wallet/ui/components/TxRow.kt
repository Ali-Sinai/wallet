package app.wallet.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.wallet.R
import app.wallet.data.Direction
import app.wallet.data.Lookups
import app.wallet.data.Transaction
import app.wallet.ui.theme.WalletColors
import app.wallet.util.Fmt

/** One transaction in a list — TxRowMobile in frontend/src/components/TxRow.tsx. */
@Composable
fun TxRow(tx: Transaction, lookups: Lookups, onClick: () -> Unit) {
    val category = lookups.category(tx.categoryId)
    val account = lookups.account(tx.accountId)
    val categoryLabel = category?.displayName() ?: stringResource(R.string.uncategorized)
    val accountName = account?.let { it.nameFa.ifBlank { it.nameEn.ifBlank { it.bankName } } }
    val out = tx.direction == Direction.WITHDRAWAL

    Column(Modifier.clickable(onClick = onClick)) {
        Row(
            Modifier
                .fillMaxWidth()
                .padding(horizontal = 22.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Box(
                Modifier
                    .width(3.dp)
                    .height(26.dp)
                    .background(category?.let { parseColor(it.color) } ?: NoCategoryColor, RoundedCornerShape(2.dp)),
            )
            Column(Modifier.weight(1f)) {
                Text(
                    tx.merchantText ?: tx.note ?: stringResource(R.string.transaction),
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                Text(
                    if (accountName != null) "$categoryLabel · $accountName" else categoryLabel,
                    fontSize = 11.5.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
            Column(horizontalAlignment = Alignment.End) {
                Text(
                    Fmt.money(tx.signedCents, signed = true),
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp,
                    color = if (out) WalletColors.expense else WalletColors.income,
                )
                Text(
                    "${tx.occurredAtJalali} · ${Fmt.time(tx.occurredAt)}",
                    fontSize = 10.5.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
        HorizontalDivider(Modifier.padding(horizontal = 22.dp), color = WalletColors.border)
    }
}
