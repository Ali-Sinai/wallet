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
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.wallet.R
import app.wallet.data.Direction
import app.wallet.ui.components.ErrorBox
import app.wallet.ui.components.LoadingBox
import app.wallet.ui.components.displayName
import app.wallet.ui.components.parseColor
import app.wallet.ui.theme.WalletColors
import app.wallet.util.Fmt

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun AddTransactionScreen(vm: AddTransactionViewModel, onClose: () -> Unit) {
    Column(
        Modifier
            .fillMaxSize()
            .imePadding(),
    ) {
        Row(Modifier.padding(horizontal = 8.dp, vertical = 4.dp), verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = onClose) { Icon(Icons.Filled.Close, contentDescription = stringResource(R.string.close)) }
            Text(
                stringResource(if (vm.attempt != null) R.string.resolve_manually else R.string.add_transaction),
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
                    vm.amountMissing -> WalletColors.Expense
                    vm.amount.isEmpty() -> MaterialTheme.colorScheme.onSurfaceVariant
                    vm.direction == Direction.WITHDRAWAL -> WalletColors.Expense
                    else -> WalletColors.Income
                }
                Row(
                    Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.Center,
                    verticalAlignment = Alignment.Bottom,
                ) {
                    Text(
                        if (vm.amount.isEmpty()) Fmt.digits("0") else Fmt.group(vm.amount.toLong() * 100),
                        fontSize = 40.sp,
                        fontWeight = FontWeight.Bold,
                        color = amountColor,
                    )
                    Text(
                        " " + stringResource(R.string.toman),
                        fontSize = 15.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(bottom = 8.dp),
                    )
                }
                if (vm.amountMissing) {
                    Text(stringResource(R.string.error_amount_required), color = WalletColors.Expense, fontSize = 12.sp)
                }
                Keypad(onKey = vm::press)

                if (lookups.accounts.isEmpty()) {
                    Text(stringResource(R.string.no_accounts), color = WalletColors.Expense)
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

                vm.error?.let { Text(stringResource(R.string.error_server, it), color = WalletColors.Expense) }
            }
        }

        if (lookups != null) {
            Button(
                onClick = { vm.save(onClose) },
                enabled = !vm.saving && vm.accountId != null,
                shape = RoundedCornerShape(14.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 22.dp, vertical = 12.dp)
                    .height(52.dp),
            ) {
                if (vm.saving) {
                    CircularProgressIndicator(Modifier.size(20.dp), strokeWidth = 2.dp)
                } else {
                    Text(stringResource(R.string.save), fontWeight = FontWeight.Bold)
                }
            }
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
                    Box(
                        Modifier
                            .weight(1f)
                            .clip(RoundedCornerShape(14.dp))
                            .background(Color.White.copy(alpha = 0.05f))
                            .clickable { onKey(key) }
                            .padding(vertical = 14.dp),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(Fmt.digits(key), fontSize = 18.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}
