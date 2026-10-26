package app.wallet.ui.inbox

import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.wallet.R
import app.wallet.ui.design.DesignCard
import app.wallet.ui.design.Dot
import app.wallet.ui.design.LineIcons
import app.wallet.ui.design.Mono
import app.wallet.ui.design.ScreenTitle
import app.wallet.ui.design.SectionHeader
import app.wallet.ui.design.SoftAvatar
import app.wallet.ui.design.TitleButton
import app.wallet.ui.design.family
import app.wallet.ui.design.gutter
import app.wallet.ui.theme.Family
import app.wallet.data.Direction
import app.wallet.data.Lookups
import app.wallet.data.SmsAttempt
import app.wallet.ui.components.EmptyBox
import app.wallet.ui.components.ErrorBox
import app.wallet.ui.components.Load
import app.wallet.ui.components.LoadingBox
import app.wallet.ui.components.displayName
import app.wallet.ui.components.parseColor
import app.wallet.ui.theme.WalletColors
import app.wallet.util.Fmt

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun InboxScreen(vm: InboxViewModel, onResolve: (Long) -> Unit, onSettings: () -> Unit) {
    var pasteOpen by remember { mutableStateOf(false) }

    // The phone may have uploaded new messages since this screen was last open.
    LaunchedEffect(Unit) { vm.refresh() }

    Column(Modifier.fillMaxSize()) {
        if (family == Family.CLASSIC) {
            Row(Modifier.padding(start = 22.dp, end = 8.dp, top = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                Text(stringResource(R.string.tab_inbox), Modifier.weight(1f), fontSize = 22.sp, fontWeight = FontWeight.Bold)
                TextButton(onClick = { pasteOpen = true }) { Text(stringResource(R.string.paste_sms)) }
                IconButton(onClick = onSettings) {
                    Icon(Icons.Filled.Settings, contentDescription = stringResource(R.string.sms_settings))
                }
            }
        } else {
            ScreenTitle(
                stringResource(R.string.tab_inbox),
                left = { TitleButton(LineIcons.Plus, stringResource(R.string.paste_sms), { pasteOpen = true }) },
                right = { TitleButton(LineIcons.Gear, stringResource(R.string.sms_settings), onSettings) },
            )
        }

        PullToRefreshBox(isRefreshing = vm.refreshing, onRefresh = vm::refresh, modifier = Modifier.fillMaxSize()) {
            when (val s = vm.state) {
                Load.Loading -> LoadingBox()
                is Load.Failed -> ErrorBox(s.message, onRetry = vm::refresh)
                is Load.Ready -> {
                    val data = s.data
                    LazyColumn(Modifier.fillMaxSize()) {
                        if (data.pending.isEmpty() && data.unparsed.isEmpty()) {
                            item { EmptyBox(stringResource(R.string.inbox_empty)) }
                        }
                        if (data.pending.isNotEmpty()) {
                            item { SectionTitle(stringResource(R.string.inbox_pending, Fmt.digits(data.pending.size))) }
                            items(data.pending, key = { it.id }) { attempt ->
                                PendingCard(attempt, data.lookups, vm)
                            }
                        }
                        if (data.unparsed.isNotEmpty()) {
                            item { SectionTitle(stringResource(R.string.inbox_unparsed, Fmt.digits(data.unparsed.size))) }
                            items(data.unparsed, key = { it.id }) { attempt ->
                                UnparsedCard(attempt, vm, onResolve)
                            }
                        }
                    }
                }
            }
        }
    }

    if (pasteOpen) PasteDialog(vm, onDismiss = { pasteOpen = false })

    vm.pasteResult?.let { count ->
        AlertDialog(
            onDismissRequest = vm::clearPasteResult,
            text = { Text(stringResource(R.string.paste_result, Fmt.digits(count))) },
            confirmButton = { TextButton(onClick = vm::clearPasteResult) { Text(stringResource(R.string.close)) } },
        )
    }
}

@Composable
private fun SectionTitle(text: String) {
    SectionHeader(text, Modifier.padding(horizontal = gutter).padding(top = if (family == Family.DARK) 28.dp else 14.dp, bottom = 6.dp))
}

@Composable
private fun Card(content: @Composable () -> Unit) {
    // Classic's tinted card, Dark's hairline-topped block, Soft's white card (MobileSmsCard's three forms).
    DesignCard(
        Modifier
            .padding(horizontal = if (family == Family.CLASSIC) 16.dp else gutter, vertical = 5.dp)
            .fillMaxWidth(),
        padding = 14.dp,
    ) { content() }
}

/** The "detected from SMS" card — MobileSmsCard in the web app. */
@Composable
private fun PendingCard(attempt: SmsAttempt, lookups: Lookups, vm: InboxViewModel) {
    val card = vm.card(attempt.id)
    val active = lookups.accounts.filter { it.isActive }
    val matched = attempt.accountLast4?.let { last4 ->
        lookups.accounts.filter { it.last4 == last4 }.let { m -> m.firstOrNull { it.isActive } ?: m.firstOrNull() }
    }
    // Mirrors _resolve_account on the server: an explicit account is needed when the
    // message's card matches nothing, or names no card and there's more than one account.
    val needsAccount = matched == null && (attempt.accountLast4 != null || active.size > 1)
    val out = attempt.direction == Direction.WITHDRAWAL
    val cents = attempt.amountCents ?: 0L

    Card {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(14.dp)) {
            val title = attempt.merchant ?: stringResource(if (out) R.string.expense else R.string.income)
            val tone = if (out) WalletColors.expense else WalletColors.income
            when (family) {
                Family.DARK -> Dot(tone)
                Family.SOFT -> SoftAvatar(title.firstOrNull()?.toString() ?: "·", tone)
                Family.CLASSIC -> Unit
            }
            Column(Modifier.weight(1f)) {
                Text(
                    title,
                    fontWeight = if (family == Family.DARK) FontWeight.Normal else FontWeight.Bold,
                    fontSize = 15.sp,
                )
                val account = matched?.displayName()
                    ?: attempt.accountLast4?.let { "····" + Fmt.digits(it) }
                    ?: stringResource(R.string.no_card_in_sms)
                val time = attempt.occurredAt ?: attempt.receivedAt
                Text(
                    "$account · ${Fmt.jalaliDate(time)} ${Fmt.time(time)}",
                    fontSize = 11.5.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            Text(
                Fmt.money(if (out) -cents else cents, signed = true),
                fontWeight = if (family == Family.DARK) FontWeight.Normal else FontWeight.Bold,
                fontFamily = if (family == Family.DARK) Mono else null,
                fontSize = if (family == Family.DARK) 15.sp else 17.sp,
                color = if (out) WalletColors.expense else WalletColors.income,
            )
        }

        if (needsAccount) {
            Text(stringResource(R.string.pick_account), fontSize = 12.sp, color = WalletColors.expense)
            Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                for (account in active) {
                    FilterChip(
                        selected = card.accountId == account.id,
                        onClick = { vm.pickAccount(attempt.id, account.id) },
                        label = { Text(account.displayName()) },
                    )
                }
            }
        }

        Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            for (category in lookups.categories) {
                FilterChip(
                    selected = card.categoryId == category.id,
                    onClick = { vm.pickCategory(attempt.id, if (card.categoryId == category.id) null else category.id) },
                    label = { Text(listOf(category.icon, category.displayName()).filter { it.isNotBlank() }.joinToString(" ")) },
                    leadingIcon = { Box(Modifier.size(8.dp).clip(CircleShape).background(parseColor(category.color))) },
                )
            }
        }

        card.error?.let { Text(it, color = WalletColors.expense, fontSize = 12.sp) }

        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            Button(
                onClick = { vm.confirm(attempt, needsAccount) },
                enabled = !card.busy && (!needsAccount || card.accountId != null),
                modifier = Modifier.weight(1f),
            ) {
                if (card.busy) CircularProgressIndicator(Modifier.size(18.dp), strokeWidth = 2.dp)
                else Text(stringResource(R.string.confirm))
            }
            OutlinedButton(onClick = { vm.ignore(attempt) }, enabled = !card.busy) {
                Text(stringResource(R.string.ignore))
            }
        }
    }
}

@Composable
private fun UnparsedCard(attempt: SmsAttempt, vm: InboxViewModel, onResolve: (Long) -> Unit) {
    val card = vm.card(attempt.id)
    Card {
        Text(
            "${attempt.sender} · ${Fmt.jalaliDate(attempt.receivedAt)} ${Fmt.time(attempt.receivedAt)}",
            fontSize = 11.5.sp,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Text(attempt.rawBody.orEmpty(), fontSize = 13.sp)
        card.error?.let { Text(it, color = WalletColors.expense, fontSize = 12.sp) }
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            Button(onClick = { onResolve(attempt.id) }, enabled = !card.busy, modifier = Modifier.weight(1f)) {
                Text(stringResource(R.string.resolve_manually))
            }
            OutlinedButton(onClick = { vm.ignore(attempt) }, enabled = !card.busy) {
                Text(stringResource(R.string.ignore))
            }
        }
    }
}

@Composable
private fun PasteDialog(vm: InboxViewModel, onDismiss: () -> Unit) {
    var text by remember { mutableStateOf("") }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(stringResource(R.string.paste_sms)) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(stringResource(R.string.paste_hint), fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                OutlinedTextField(
                    value = text,
                    onValueChange = { text = it },
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(min = 140.dp),
                )
                vm.pasteError?.let { Text(stringResource(R.string.error_server, it), color = WalletColors.expense, fontSize = 12.sp) }
            }
        },
        confirmButton = {
            TextButton(onClick = { vm.paste(text, onDone = onDismiss) }, enabled = !vm.pasting && text.isNotBlank()) {
                Text(stringResource(R.string.send))
            }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text(stringResource(R.string.cancel)) } },
    )
}
