package app.wallet.ui.add

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.DateRange
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.TextButton
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.wallet.R
import app.wallet.ui.design.BigNumber
import app.wallet.ui.design.PrimaryAction
import app.wallet.ui.design.family
import app.wallet.ui.design.gutter
import app.wallet.ui.design.softCard
import app.wallet.ui.theme.Family
import app.wallet.data.Direction
import app.wallet.ui.components.ErrorBox
import app.wallet.ui.components.JalaliDateTimeDialog
import app.wallet.ui.components.LoadingBox
import app.wallet.ui.components.displayName
import app.wallet.ui.components.parseColor
import app.wallet.ui.theme.WalletColors
import app.wallet.util.Fmt

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun AddTransactionScreen(vm: AddTransactionViewModel, onClose: () -> Unit) {
    var pickingDate by remember { mutableStateOf(false) }

    if (pickingDate) {
        JalaliDateTimeDialog(
            initialMillis = vm.occurredAt,
            onConfirm = {
                vm.occurredAt = it
                pickingDate = false
            },
            onDismiss = { pickingDate = false },
        )
    }

    if (vm.queued) {
        AlertDialog(
            onDismissRequest = onClose,
            text = { Text(stringResource(R.string.queued_offline)) },
            confirmButton = { TextButton(onClick = onClose) { Text(stringResource(R.string.close)) } },
        )
    }

    Column(
        Modifier
            .fillMaxSize()
            .imePadding(),
    ) {
        Row(Modifier.padding(horizontal = 8.dp, vertical = 4.dp), verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = onClose) { Icon(Icons.Filled.Close, contentDescription = stringResource(R.string.close)) }
            Text(
                stringResource(
                    when {
                        vm.attempt != null -> R.string.resolve_manually
                        vm.editing != null -> R.string.edit_transaction
                        else -> R.string.add_transaction
                    },
                ),
                fontSize = 18.sp,
                fontWeight = FontWeight.Bold,
            )
        }

        val lookups = vm.lookups
        when {
            lookups == null && vm.loadError != null -> ErrorBox(vm.loadError, onRetry = vm::loadLookups)
            lookups == null -> LoadingBox()
            else -> Column(
                Modifier
                    .weight(1f)
                    .verticalScroll(rememberScrollState())
                    .padding(horizontal = 22.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp),
            ) {
                vm.attempt?.rawBody?.let { body ->
                    Text(
                        body,
                        fontSize = 13.sp,
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(14.dp))
                            .background(MaterialTheme.colorScheme.surface)
                            .padding(12.dp),
                    )
                }
                SingleChoiceSegmentedButtonRow(Modifier.fillMaxWidth()) {
                    val options = listOf(Direction.WITHDRAWAL to R.string.expense, Direction.DEPOSIT to R.string.income)
                    options.forEachIndexed { i, (dir, label) ->
                        SegmentedButton(
                            selected = vm.direction == dir,
                            onClick = { vm.direction = dir },
                            shape = SegmentedButtonDefaults.itemShape(i, options.size),
                        ) { Text(stringResource(label)) }
                    }
                }

                // Amount display + keypad
                val amountColor = when {
                    vm.amountMissing -> WalletColors.expense
                    vm.amount.isEmpty() -> MaterialTheme.colorScheme.onSurfaceVariant
                    vm.direction == Direction.WITHDRAWAL -> WalletColors.expense
                    else -> WalletColors.income
                }
                Row(
                    Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.Center,
                    verticalAlignment = Alignment.Bottom,
                ) {
                    val amountText = if (vm.amount.isEmpty()) Fmt.digits("0") else Fmt.group(vm.amount.toLong() * 100)
                    // Dark's thin oversized numeral; Soft and classic draw it bold.
                    if (family == Family.DARK) {
                        BigNumber(amountText, size = 52.sp, color = amountColor)
                    } else {
                        Text(amountText, fontSize = if (family == Family.SOFT) 36.sp else 40.sp, fontWeight = FontWeight.Bold, color = amountColor)
                    }
                    Text(
                        " " + stringResource(R.string.toman),
                        fontSize = 15.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(bottom = 8.dp),
                    )
                }
                if (vm.amountMissing) {
                    Text(stringResource(R.string.error_amount_required), color = WalletColors.expense, fontSize = 12.sp)
                }
                Keypad(onKey = vm::press)

                if (lookups.accounts.isEmpty()) {
                    Text(stringResource(R.string.no_accounts), color = WalletColors.expense)
                } else {
                    Label(R.string.account)
                    Row(
                        Modifier.horizontalScroll(rememberScrollState()),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        for (account in lookups.accounts.filter { it.isActive || it.id == vm.accountId }) {
                            FilterChip(
                                selected = vm.accountId == account.id,
                                onClick = { vm.accountId = account.id },
                                label = { Text(account.displayName()) },
                            )
                        }
                    }
                }

                Label(R.string.date)
                Row(
                    Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(14.dp))
                        .background(WalletColors.ink.copy(alpha = 0.05f))
                        .clickable { pickingDate = true }
                        .padding(horizontal = 14.dp, vertical = 14.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(Icons.Filled.DateRange, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text(
                        "${Fmt.jalaliDate(vm.occurredAt)} · ${Fmt.time(vm.occurredAt)}",
                        Modifier
                            .weight(1f)
                            .padding(horizontal = 10.dp),
                    )
                }

                // A resolved SMS keeps the merchant the server already read from it.
                if (vm.attempt == null) {
                    OutlinedTextField(
                        value = vm.merchant,
                        onValueChange = vm::updateMerchant,
                        label = { Text(stringResource(R.string.merchant)) },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                    )
                }

                Label(R.string.category)
                FlowRow(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalArrangement = Arrangement.spacedBy(2.dp),
                ) {
                    for (category in lookups.categories) {
                        FilterChip(
                            selected = vm.categoryId == category.id,
                            onClick = { vm.pickCategory(if (vm.categoryId == category.id) null else category.id) },
                            label = { Text(listOf(category.icon, category.displayName()).filter { it.isNotBlank() }.joinToString(" ")) },
                            leadingIcon = {
                                Box(Modifier.size(8.dp).clip(CircleShape).background(parseColor(category.color)))
                            },
                        )
                    }
                }

                OutlinedTextField(
                    value = vm.note,
                    onValueChange = { vm.note = it },
                    label = { Text(stringResource(R.string.note)) },
                    modifier = Modifier.fillMaxWidth(),
                )

                vm.error?.let { Text(stringResource(R.string.error_server, it), color = WalletColors.expense) }
            }
        }

        if (lookups != null) {
            PrimaryAction(
                stringResource(R.string.save),
                onClick = { vm.save(onClose) },
                enabled = vm.accountId != null,
                busy = vm.saving,
                modifier = Modifier.padding(horizontal = gutter, vertical = 12.dp),
            )
        }
    }
}

@Composable
private fun Label(res: Int) {
    Text(stringResource(res), fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
}

/** 1–9, 000, 0, ⌫ — the keypad from the design, laid out like the web one (RTL rows). */
@Composable
private fun Keypad(onKey: (String) -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        for (row in AddTransactionViewModel.KEYS.chunked(3)) {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                for (key in row) {
                    // KEY_STYLES in AddTransactionModal.tsx: grey blocks (classic), bare thin
                    // numerals (Dark), white tiles (Soft).
                    val tile = when (family) {
                        Family.CLASSIC -> Modifier
                            .clip(RoundedCornerShape(14.dp))
                            .background(WalletColors.ink.copy(alpha = 0.05f))
                        Family.DARK -> Modifier.clip(RoundedCornerShape(14.dp))
                        Family.SOFT -> Modifier.softCard(WalletColors.surface, 18.dp)
                    }
                    Box(
                        Modifier
                            .weight(1f)
                            .then(tile)
                            .clickable { onKey(key) }
                            .padding(vertical = if (family == Family.DARK) 12.dp else 14.dp),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(
                            Fmt.digits(key),
                            fontSize = when (family) {
                                Family.CLASSIC -> 18.sp
                                Family.DARK -> 26.sp
                                Family.SOFT -> 19.sp
                            },
                            fontWeight = when (family) {
                                Family.CLASSIC -> FontWeight.Bold
                                Family.DARK -> FontWeight.Light
                                Family.SOFT -> FontWeight.Medium
                            },
                        )
                    }
                }
            }
        }
    }
}
