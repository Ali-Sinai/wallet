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
import androidx.compose.foundation.layout.width
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
import app.wallet.data.PersonBalance
import app.wallet.ui.design.BigNumber
import app.wallet.ui.design.DarkLabel
import app.wallet.ui.design.DirIcon
import app.wallet.ui.design.LineIcons
import app.wallet.ui.design.Mono
import app.wallet.ui.design.PrimaryAction
import app.wallet.ui.design.ScreenTitle
import app.wallet.ui.design.SectionHeader
import app.wallet.ui.design.SoftAvatar
import app.wallet.ui.design.SoftExpenseChip
import app.wallet.ui.design.StatChip
import app.wallet.ui.design.TitleButton
import app.wallet.ui.design.faint
import app.wallet.ui.design.family
import app.wallet.ui.design.gutter
import app.wallet.ui.design.softCard
import app.wallet.ui.split.SplitPickerDialog
import app.wallet.ui.theme.Family
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
fun PeopleScreen(vm: PeopleViewModel, onOpen: (Long) -> Unit, onSplit: (Long) -> Unit) {
    val f = family
    var adding by remember { mutableStateOf(false) }
    var pickingSplit by remember { mutableStateOf(false) }

    Column(Modifier.fillMaxSize()) {
        if (f == Family.CLASSIC) {
            Row(Modifier.padding(start = 22.dp, end = 8.dp, top = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                Text(stringResource(R.string.tab_people), Modifier.weight(1f), fontSize = 22.sp, fontWeight = FontWeight.Bold)
                TextButton(onClick = { adding = true }) { Text(stringResource(R.string.add_person)) }
            }
        } else {
            ScreenTitle(
                stringResource(R.string.tab_people),
                right = { TitleButton(LineIcons.Plus, stringResource(R.string.add_person), { adding = true }) },
            )
        }
        PullToRefreshBox(isRefreshing = vm.refreshing, onRefresh = vm::refresh, modifier = Modifier.fillMaxSize()) {
            when (val s = vm.state) {
                Load.Loading -> LoadingBox()
                is Load.Failed -> ErrorBox(s.message, onRetry = vm::refresh)
                is Load.Ready -> {
                    val people = s.data
                    val owed = people.filter { it.netCents > 0 }.sumOf { it.netCents }
                    val owe = people.filter { it.netCents < 0 }.sumOf { -it.netCents }
                    LazyColumn(Modifier.fillMaxSize()) {
                        when (f) {
                            Family.DARK -> item {
                                Row(Modifier.padding(horizontal = gutter).padding(top = 40.dp)) {
                                    Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                                        DarkLabel(stringResource(R.string.owed_to_me_short))
                                        BigNumber(Fmt.group(owed), size = 32.sp)
                                    }
                                    Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                                        DarkLabel(stringResource(R.string.i_owe_short))
                                        BigNumber(Fmt.group(owe), size = 32.sp, color = WalletColors.expense)
                                    }
                                }
                            }
                            Family.SOFT -> item {
                                Row(
                                    Modifier.padding(horizontal = gutter).padding(top = 22.dp),
                                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                                ) {
                                    StatChip(stringResource(R.string.owed_to_me_short), Fmt.short(owed), WalletColors.income, LineIcons.Up, Modifier.weight(1f))
                                    StatChip(stringResource(R.string.i_owe_short), Fmt.short(owe), SoftExpenseChip, LineIcons.Down, Modifier.weight(1f))
                                }
                            }
                            Family.CLASSIC -> Unit
                        }
                        if (f != Family.CLASSIC) {
                            item {
                                SectionHeader(
                                    stringResource(R.string.ledger),
                                    Modifier.padding(horizontal = gutter).padding(top = if (f == Family.DARK) 48.dp else 22.dp, bottom = 8.dp),
                                )
                            }
                        }
                        if (people.isEmpty()) item { EmptyBox(stringResource(R.string.no_people)) }
                        items(people, key = { it.personId }) { person -> PersonRow(person) { onOpen(person.personId) } }
                        if (f != Family.CLASSIC) {
                            item {
                                Box(Modifier.padding(horizontal = gutter).padding(top = 28.dp, bottom = 16.dp)) {
                                    PrimaryAction(
                                        stringResource(R.string.split_bill),
                                        onClick = { pickingSplit = true },
                                        label = stringResource(R.string.balance),
                                        value = Fmt.money(owed - owe, signed = true),
                                    )
                                }
                            }
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
    if (pickingSplit) {
        SplitPickerDialog(
            onPick = {
                pickingSplit = false
                onSplit(it)
            },
            onDismiss = { pickingSplit = false },
        )
    }
}

/** One person and what's outstanding between you, in the active design. */
@Composable
private fun PersonRow(person: PersonBalance, onClick: () -> Unit) {
    val color = balanceColor(person.netCents)
    when (family) {
        Family.CLASSIC -> Column(Modifier.clickable(onClick = onClick)) {
            Row(
                Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 22.dp, vertical = 12.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
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
        Family.DARK -> Row(
            Modifier
                .fillMaxWidth()
                .clickable(onClick = onClick)
                .padding(horizontal = gutter, vertical = 17.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(18.dp),
        ) {
            Text(Fmt.initials(person.name), Modifier.width(28.dp), fontFamily = Mono, fontSize = 13.sp, color = faint)
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
                Text(person.name, fontSize = 15.sp, maxLines = 1)
                Text(balanceSub(person.netCents), fontSize = 12.sp, color = faint)
            }
            Text(if (person.netCents == 0L) Fmt.digits(0) else Fmt.money(person.netCents, signed = true), fontFamily = Mono, fontSize = 14.sp, color = color)
            DirIcon(LineIcons.Chevron, 16.dp, WalletColors.foreground.copy(alpha = 0.27f))
        }
        Family.SOFT -> Row(
            Modifier
                .padding(horizontal = gutter, vertical = 5.dp)
                .fillMaxWidth()
                .softCard(WalletColors.surface)
                .clickable(onClick = onClick)
                .padding(horizontal = 16.dp, vertical = 14.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            SoftAvatar(Fmt.initials(person.name), color, 44.dp)
            Column(Modifier.weight(1f)) {
                Text(person.name, fontSize = 15.sp, fontWeight = FontWeight.Bold, maxLines = 1)
                Text(balanceSub(person.netCents), fontSize = 12.sp, color = faint)
            }
            Text(
                if (person.netCents == 0L) stringResource(R.string.settled) else Fmt.money(person.netCents, signed = true),
                fontSize = 14.sp,
                fontWeight = FontWeight.Bold,
                color = color,
            )
        }
    }
}

/** "Owes you" / "You owe" / "Settled", without the amount (the row shows it). */
@Composable
fun balanceSub(net: Long): String = stringResource(
    when {
        net > 0 -> R.string.owes_you_short
        net < 0 -> R.string.you_owe_short
        else -> R.string.settled
    },
)

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
