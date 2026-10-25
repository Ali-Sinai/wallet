package app.wallet.ui.split

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.Button
import androidx.compose.material3.Checkbox
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextDirection
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.wallet.R
import app.wallet.ui.components.EmptyBox
import app.wallet.ui.components.ErrorBox
import app.wallet.ui.components.LoadingBox
import app.wallet.ui.theme.WalletColors
import app.wallet.util.Fmt

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun SplitScreen(vm: SplitViewModel, onClose: () -> Unit) {
    Column(
        Modifier
            .fillMaxSize()
            .imePadding(),
    ) {
        Row(Modifier.padding(horizontal = 8.dp, vertical = 4.dp), verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = onClose) { Icon(Icons.Filled.Close, contentDescription = stringResource(R.string.close)) }
            Text(stringResource(R.string.split), fontSize = 18.sp, fontWeight = FontWeight.Bold)
        }

        val tx = vm.tx
        when {
            vm.loading -> LoadingBox()
            vm.loadError != null || tx == null -> ErrorBox(vm.loadError, onRetry = vm::load)
            else -> Column(
                Modifier
                    .weight(1f)
                    .verticalScroll(rememberScrollState())
                    .padding(horizontal = 22.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp),
            ) {
                Text(tx.merchantText ?: tx.note ?: stringResource(R.string.transaction), fontWeight = FontWeight.Bold)
                Text(
                    Fmt.money(tx.amountCents) + " " + stringResource(R.string.toman),
                    fontSize = 28.sp,
                    fontWeight = FontWeight.Bold,
                )

                val split = vm.existing
                if (split != null) {
                    // Already split: show who carries what, and allow undoing it.
                    Text(stringResource(R.string.split_shares), color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp)
                    for (share in split.shares) {
                        val name = share.personId?.let { id -> vm.people.firstOrNull { it.id == id }?.name } ?: stringResource(R.string.me)
                        Row {
                            Text(name, Modifier.weight(1f))
                            Text(Fmt.money(share.amountCents))
                        }
                    }
                    vm.error?.let { Text(stringResource(R.string.error_server, it), color = WalletColors.expense, fontSize = 12.sp) }
                    OutlinedButton(onClick = { vm.deleteExisting(onClose) }, enabled = !vm.busy, modifier = Modifier.fillMaxWidth()) {
                        Text(stringResource(R.string.delete_split), color = WalletColors.expense)
                    }
                } else {
                    SingleChoiceSegmentedButtonRow(Modifier.fillMaxWidth()) {
                        SegmentedButton(selected = vm.iPaid, onClick = { vm.iPaid = true }, shape = SegmentedButtonDefaults.itemShape(0, 2)) {
                            Text(stringResource(R.string.i_paid))
                        }
                        SegmentedButton(selected = !vm.iPaid, onClick = { vm.iPaid = false }, shape = SegmentedButtonDefaults.itemShape(1, 2)) {
                            Text(stringResource(R.string.they_paid))
                        }
                    }

                    Text(stringResource(R.string.split_with), color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp)
                    if (vm.people.isEmpty()) EmptyBox(stringResource(R.string.no_people))
                    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        for (person in vm.people) {
                            FilterChip(
                                selected = person.id in vm.selected,
                                onClick = { vm.toggle(person.id) },
                                label = { Text(person.name) },
                            )
                        }
                    }
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Checkbox(checked = vm.includeMe, onCheckedChange = { vm.includeMe = it })
                        Text(stringResource(R.string.include_me))
                    }

                    SingleChoiceSegmentedButtonRow(Modifier.fillMaxWidth()) {
                        val methods = listOf(
                            SplitMethod.EQUAL to R.string.split_equal,
                            SplitMethod.AMOUNTS to R.string.split_amounts,
                            SplitMethod.PERCENTAGES to R.string.split_percentages,
                        )
                        methods.forEachIndexed { i, (m, label) ->
                            SegmentedButton(
                                selected = vm.method == m,
                                onClick = { vm.method = m },
                                shape = SegmentedButtonDefaults.itemShape(i, methods.size),
                            ) { Text(stringResource(label)) }
                        }
                    }

                    val keys = vm.participants
                    if (vm.method == SplitMethod.EQUAL) {
                        if (keys.isNotEmpty() && vm.selected.isNotEmpty()) {
                            Text(
                                stringResource(R.string.split_each, Fmt.money(tx.amountCents / keys.size)),
                                fontSize = 13.sp,
                            )
                        }
                    } else {
                        for (key in keys) {
                            val name = if (key == ME) stringResource(R.string.me) else vm.people.firstOrNull { it.id.toString() == key }?.name.orEmpty()
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                                Text(name, Modifier.weight(1f))
                                OutlinedTextField(
                                    value = vm.inputs[key].orEmpty(),
                                    onValueChange = { vm.inputs[key] = it },
                                    singleLine = true,
                                    suffix = {
                                        Text(if (vm.method == SplitMethod.PERCENTAGES) stringResource(R.string.percent_sign) else stringResource(R.string.toman_short))
                                    },
                                    textStyle = MaterialTheme.typography.bodyMedium.copy(textDirection = TextDirection.Ltr),
                                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                                    modifier = Modifier.width(150.dp),
                                )
                            }
                        }
                        val left = vm.remaining
                        Text(
                            if (vm.method == SplitMethod.PERCENTAGES) {
                                stringResource(R.string.split_left_percent, Fmt.digits(String.format(java.util.Locale.US, "%.1f", left)))
                            } else {
                                stringResource(R.string.split_left_amount, Fmt.money(Math.round(left)))
                            },
                            color = if (kotlin.math.abs(left) < 1) MaterialTheme.colorScheme.onSurfaceVariant else WalletColors.expense,
                            fontSize = 12.sp,
                        )
                    }

                    vm.error?.let { Text(stringResource(R.string.error_server, it), color = WalletColors.expense, fontSize = 12.sp) }
                }
            }
        }

        if (tx != null && vm.existing == null && !vm.loading) {
            Button(
                onClick = { vm.save(onClose) },
                enabled = vm.canSave,
                shape = RoundedCornerShape(14.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 22.dp, vertical = 12.dp)
                    .height(52.dp),
            ) { Text(stringResource(R.string.save), fontWeight = FontWeight.Bold) }
        }
    }
}
