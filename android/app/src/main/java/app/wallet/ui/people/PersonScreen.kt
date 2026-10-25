package app.wallet.ui.people

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
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
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextDirection
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.wallet.R
import app.wallet.data.PersonBalance
import app.wallet.ui.design.BigNumber
import app.wallet.ui.design.DarkLabel
import app.wallet.ui.design.LineIcons
import app.wallet.ui.design.PillButton
import app.wallet.ui.design.ScreenTitle
import app.wallet.ui.design.SectionHeader
import app.wallet.ui.design.SoftAvatar
import app.wallet.ui.design.TitleButton
import app.wallet.ui.design.TotalBar
import app.wallet.ui.design.faint
import app.wallet.ui.design.family
import app.wallet.ui.design.gutter
import app.wallet.ui.design.softCard
import app.wallet.ui.theme.Family
import app.wallet.data.Debt
import app.wallet.ui.components.EmptyBox
import app.wallet.ui.components.ErrorBox
import app.wallet.ui.components.Load
import app.wallet.ui.components.LoadingBox
import app.wallet.ui.components.TransactionDetailSheet
import app.wallet.ui.components.TxRow
import app.wallet.ui.theme.WalletColors
import app.wallet.util.Fmt

@Suppress("UNCHECKED_CAST")
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PersonScreen(vm: PersonViewModel, onClose: () -> Unit, onSplit: (Long) -> Unit, onEdit: (Long) -> Unit) {
    var editing by remember { mutableStateOf(false) }
    val f = family
    val loaded = (vm.state as? Load.Ready<PersonData>)?.data?.balance

    Column(Modifier.fillMaxSize()) {
        if (f == Family.CLASSIC) {
            Row(Modifier.padding(horizontal = 8.dp, vertical = 4.dp), verticalAlignment = Alignment.CenterVertically) {
                IconButton(onClick = onClose) { Icon(Icons.Filled.Close, contentDescription = stringResource(R.string.close)) }
                Text(stringResource(R.string.tab_people), Modifier.weight(1f), fontSize = 18.sp, fontWeight = FontWeight.Bold)
                IconButton(onClick = { editing = true }) { Icon(Icons.Filled.Edit, contentDescription = stringResource(R.string.edit)) }
            }
        } else {
            ScreenTitle(
                // Dark titles the page with the person; Soft keeps "People" and centres the name below.
                if (f == Family.DARK) loaded?.name.orEmpty() else stringResource(R.string.tab_people),
                left = { TitleButton(LineIcons.Back, stringResource(R.string.close), onClose, mirrored = true) },
                right = { TitleButton(LineIcons.Gear, stringResource(R.string.edit), { editing = true }) },
            )
        }

        PullToRefreshBox(isRefreshing = vm.refreshing, onRefresh = vm::refresh, modifier = Modifier.fillMaxSize()) {
            when (val s = vm.state) {
                Load.Loading -> LoadingBox()
                is Load.Failed -> ErrorBox(s.message, onRetry = vm::refresh)
                is Load.Ready -> {
                    val data = s.data
                    val person = data.balance
                    if (person == null) {
                        EmptyBox(stringResource(R.string.load_failed))
                    } else LazyColumn(Modifier.fillMaxSize()) {
                        item {
                            when (f) {
                                Family.CLASSIC -> ClassicPersonHead(person, data.note, vm)
                                Family.DARK -> DarkPersonHead(person, vm)
                                Family.SOFT -> SoftPersonHead(person, vm)
                            }
                            vm.error?.let {
                                Text(
                                    stringResource(R.string.error_server, it),
                                    Modifier.padding(horizontal = gutter),
                                    color = WalletColors.expense,
                                    fontSize = 12.sp,
                                )
                            }
                            Label(R.string.debts)
                            if (data.openDebts.isEmpty()) EmptyBox(stringResource(R.string.settled))
                        }
                        if (f == Family.SOFT && data.openDebts.isNotEmpty()) {
                            // Soft groups the debts in one white card.
                            item {
                                Column(
                                    Modifier
                                        .padding(horizontal = gutter)
                                        .fillMaxWidth()
                                        .softCard(WalletColors.surface)
                                        .padding(10.dp),
                                    verticalArrangement = Arrangement.spacedBy(10.dp),
                                ) { for (debt in data.openDebts) DebtRow(debt, vm) }
                            }
                        } else {
                            items(data.openDebts, key = { "d${it.id}" }) { debt -> DebtRow(debt, vm) }
                        }
                        item { Label(R.string.ledger) }
                        items(data.shared, key = { "t${it.id}" }) { tx ->
                            TxRow(tx, data.lookups, onClick = { vm.selected = tx })
                        }
                        item { Box(Modifier.height(16.dp)) }
                    }
                }
            }
        }
    }

    val ready = (vm.state as? Load.Ready<PersonData>)?.data
    vm.selected?.let { tx ->
        if (ready != null) {
            TransactionDetailSheet(
                tx,
                ready.lookups,
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

    val person = ready?.balance
    if (editing && ready != null && person != null) {
        PersonDialog(
            title = stringResource(R.string.edit),
            initialName = person.name,
            initialNote = ready.note.orEmpty(),
            busy = vm.busy,
            error = vm.error,
            onSave = { name, note -> vm.rename(name, note, onDone = { editing = false }) },
            onDismiss = { editing = false },
            onDelete = { vm.delete(onDone = onClose) },
        )
    }
}

@Composable
private fun ClassicPersonHead(person: PersonBalance, note: String?, vm: PersonViewModel) {
    val color = balanceColor(person.netCents)
    Row(
        Modifier.padding(horizontal = 22.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        Avatar(person.name, color, size = 52.dp)
        Column {
            Text(person.name, fontSize = 18.sp, fontWeight = FontWeight.Bold)
            note?.let { Text(it, fontSize = 11.5.sp, color = MaterialTheme.colorScheme.onSurfaceVariant) }
        }
    }
    Column(
        Modifier
            .padding(horizontal = 22.dp, vertical = 8.dp)
            .fillMaxWidth()
            .clip(RoundedCornerShape(20.dp))
            .background(WalletColors.primaryTint)
            .border(1.dp, WalletColors.primary.copy(alpha = 0.25f), RoundedCornerShape(20.dp))
            .padding(18.dp),
    ) {
        Text(balanceText(person.netCents), fontSize = 11.5.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(
            if (person.netCents == 0L) stringResource(R.string.settled) else Fmt.money(person.netCents, signed = true),
            fontSize = 30.sp,
            fontWeight = FontWeight.Bold,
            color = color,
        )
        if (person.openDebtCount > 0) {
            Button(
                onClick = vm::settleAll,
                enabled = !vm.busy,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 14.dp),
            ) { Text(stringResource(R.string.settle_up)) }
        }
    }
}

/** Wallet Dark: the person's standing as a label, the net as a big thin number, then the pill. */
@Composable
private fun DarkPersonHead(person: PersonBalance, vm: PersonViewModel) {
    Column(Modifier.padding(horizontal = gutter).padding(top = 40.dp)) {
        DarkLabel(balanceSub(person.netCents))
        BigNumber(
            if (person.netCents == 0L) stringResource(R.string.settled) else Fmt.money(person.netCents, signed = true),
            Modifier.padding(top = 12.dp),
            color = balanceColor(person.netCents),
        )
        if (person.openDebtCount > 0) {
            PillButton(stringResource(R.string.settle_up), vm::settleAll, Modifier.padding(top = 32.dp), busy = vm.busy)
        }
    }
}

/** Wallet Soft: a centred avatar, name and net, and the total bar to settle. */
@Composable
private fun SoftPersonHead(person: PersonBalance, vm: PersonViewModel) {
    val color = balanceColor(person.netCents)
    Column(
        Modifier
            .fillMaxWidth()
            .padding(horizontal = gutter)
            .padding(top = 20.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        SoftAvatar(Fmt.initials(person.name), color, 64.dp)
        Text(person.name, Modifier.padding(top = 10.dp), fontSize = 24.sp, fontWeight = FontWeight.Bold)
        Text(balanceSub(person.netCents), fontSize = 12.sp, color = faint)
        Text(
            if (person.netCents == 0L) stringResource(R.string.settled) else Fmt.money(person.netCents, signed = true),
            Modifier.padding(top = 8.dp),
            fontSize = 30.sp,
            fontWeight = FontWeight.Bold,
            color = color,
        )
        if (person.openDebtCount > 0) {
            TotalBar(
                balanceSub(person.netCents),
                Fmt.money(kotlin.math.abs(person.netCents)),
                stringResource(R.string.settle_up),
                vm::settleAll,
                Modifier.padding(top = 20.dp),
                busy = vm.busy,
            )
        }
    }
}

@Composable
private fun Label(res: Int) {
    SectionHeader(
        stringResource(res),
        Modifier.padding(horizontal = gutter).padding(top = if (family == Family.DARK) 40.dp else 18.dp, bottom = 8.dp),
    )
}

/** One open debt, with a partial settlement — DebtRow.tsx. */
@Composable
private fun DebtRow(debt: Debt, vm: PersonViewModel) {
    var open by remember { mutableStateOf(false) }
    var amount by remember { mutableStateOf("") }
    val color = if (debt.owedToMe) WalletColors.income else WalletColors.expense

    // Classic a tinted well; Dark a hairline-divided row; Soft a grey well inside its white card.
    val box = when (family) {
        Family.CLASSIC -> Modifier
            .padding(horizontal = 22.dp, vertical = 4.dp)
            .fillMaxWidth()
            .clip(RoundedCornerShape(15.dp))
            .background(WalletColors.ink.copy(alpha = 0.04f))
            .padding(horizontal = 14.dp, vertical = 12.dp)
        Family.DARK -> {
            val line = WalletColors.ink.copy(alpha = 0.08f)
            Modifier
                .padding(horizontal = gutter)
                .fillMaxWidth()
                .drawBehind { drawLine(line, Offset(0f, size.height), Offset(size.width, size.height), 1.dp.toPx()) }
                .padding(vertical = 14.dp)
        }
        Family.SOFT -> Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(18.dp))
            .background(WalletColors.background)
            .padding(horizontal = 16.dp, vertical = 14.dp)
    }
    Column(box, verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text(
                    stringResource(if (debt.owedToMe) R.string.owed_to_me_short else R.string.i_owe_short) +
                        " · " + Fmt.money(debt.remainingCents),
                    fontWeight = FontWeight.Bold,
                    fontSize = 13.sp,
                    color = color,
                )
                Text(
                    stringResource(R.string.remaining_of, Fmt.group(debt.remainingCents), Fmt.group(debt.amountCents)),
                    fontSize = 11.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            TextButton(onClick = { open = !open }) { Text(stringResource(R.string.settle)) }
        }
        if (open) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(
                    value = amount,
                    onValueChange = { amount = it },
                    placeholder = { Text(Fmt.digits(debt.remainingCents / 100)) },
                    singleLine = true,
                    textStyle = MaterialTheme.typography.bodyMedium.copy(textDirection = TextDirection.Ltr),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    modifier = Modifier.weight(1f),
                )
                OutlinedButton(
                    onClick = {
                        // Empty means the whole remainder.
                        val toman = Fmt.latinDigits(amount).filter { it.isDigit() }.toLongOrNull()
                        val cents = toman?.times(100) ?: debt.remainingCents
                        if (cents in 1..debt.remainingCents) {
                            vm.settle(debt, cents, onDone = {
                                amount = ""
                                open = false
                            })
                        }
                    },
                    enabled = !vm.busy,
                ) { Text(stringResource(R.string.settle)) }
            }
        }
    }
}
