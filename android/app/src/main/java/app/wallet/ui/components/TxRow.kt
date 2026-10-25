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
import app.wallet.ui.design.Dot
import app.wallet.ui.design.Mono
import app.wallet.ui.design.SoftAvatar
import app.wallet.ui.design.faint
import app.wallet.ui.design.family
import app.wallet.ui.design.gutter
import app.wallet.ui.design.softCard
import app.wallet.ui.theme.Family
import app.wallet.ui.theme.WalletColors
import app.wallet.util.Fmt

/** One transaction in a list, in the active design. */
@Composable
fun TxRow(tx: Transaction, lookups: Lookups, onClick: () -> Unit) {
    when (family) {
        Family.CLASSIC -> ClassicTxRow(tx, lookups, onClick)
        Family.DARK -> DarkTxRow(tx, lookups, onClick)
        Family.SOFT -> SoftTxRow(tx, lookups, onClick)
    }
}

/** Title, "category · account" and the signed amount every design shows for a row. */
private class RowText(val title: String, val category: String, val sub: String, val amount: String, val date: String, val out: Boolean)

@Composable
private fun rowText(tx: Transaction, lookups: Lookups): RowText {
    val category = lookups.category(tx.categoryId)?.displayName() ?: stringResource(R.string.uncategorized)
    val account = lookups.account(tx.accountId)?.shortName()
    return RowText(
        title = tx.merchantText ?: tx.note ?: stringResource(R.string.transaction),
        category = category,
        sub = if (account != null) "$category · $account" else category,
        amount = Fmt.money(tx.signedCents, signed = true),
        date = Fmt.localize(tx.occurredAtJalali),
        out = tx.direction == Direction.WITHDRAWAL,
    )
}

/** Wallet Dark: a coloured dot, plain title, mono amount and date; no dividers. */
@Composable
private fun DarkTxRow(tx: Transaction, lookups: Lookups, onClick: () -> Unit) {
    val v = rowText(tx, lookups)
    val color = if (v.out) WalletColors.expense else WalletColors.income
    Row(
        Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = gutter, vertical = 15.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(18.dp),
    ) {
        Dot(color)
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
            Text(v.title, fontSize = 15.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Text(v.sub, fontSize = 12.sp, color = faint, maxLines = 1, overflow = TextOverflow.Ellipsis)
        }
        Column(horizontalAlignment = Alignment.End, verticalArrangement = Arrangement.spacedBy(3.dp)) {
            Text(v.amount, fontSize = 14.sp, fontFamily = Mono, color = color)
            Text(v.date, fontSize = 10.5.sp, fontFamily = Mono, color = WalletColors.foreground.copy(alpha = 0.3f))
        }
    }
}

/** Wallet Soft: a white card with the title's first letter on a tinted circle. */
@Composable
private fun SoftTxRow(tx: Transaction, lookups: Lookups, onClick: () -> Unit) {
    val v = rowText(tx, lookups)
    val color = lookups.category(tx.categoryId)?.let { parseColor(it.color) } ?: NoCategoryColor
    Row(
        Modifier
            .padding(horizontal = gutter, vertical = 6.dp)
            .fillMaxWidth()
            .softCard(WalletColors.surface)
            .clickable(onClick = onClick)
            .padding(14.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        SoftAvatar(v.title.firstOrNull()?.toString() ?: "·", color)
        Column(Modifier.weight(1f)) {
            Text(v.title, fontSize = 15.sp, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Text("${v.date} · ${v.category}", fontSize = 12.sp, color = faint, maxLines = 1, overflow = TextOverflow.Ellipsis)
        }
        Text(
            v.amount,
            fontSize = 14.sp,
            fontWeight = FontWeight.Bold,
            color = if (v.out) WalletColors.foreground else WalletColors.income,
        )
    }
}

/** Classic: TxRowMobile in frontend/src/components/TxRow.tsx. */
@Composable
private fun ClassicTxRow(tx: Transaction, lookups: Lookups, onClick: () -> Unit) {
    val category = lookups.category(tx.categoryId)
    val account = lookups.account(tx.accountId)
    val categoryLabel = category?.displayName() ?: stringResource(R.string.uncategorized)
    val accountName = account?.shortName()
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
                    "${Fmt.localize(tx.occurredAtJalali)} · ${Fmt.time(tx.occurredAt)}",
                    fontSize = 10.5.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
        HorizontalDivider(Modifier.padding(horizontal = 22.dp), color = WalletColors.border)
    }
}
