package app.wallet.ui.inbox

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDirection
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.wallet.R
import app.wallet.ui.components.EmptyBox
import app.wallet.ui.components.ErrorBox
import app.wallet.ui.components.LoadingBox
import app.wallet.ui.theme.WalletColors
import app.wallet.util.Fmt

@Composable
private fun Header(title: Int, onClose: () -> Unit, action: (@Composable () -> Unit)? = null) {
    Row(Modifier.padding(horizontal = 8.dp, vertical = 4.dp), verticalAlignment = Alignment.CenterVertically) {
        IconButton(onClick = onClose) { Icon(Icons.Filled.Close, contentDescription = stringResource(R.string.close)) }
        Text(stringResource(title), Modifier.weight(1f), fontSize = 18.sp, fontWeight = FontWeight.Bold)
        action?.invoke()
    }
}

@Composable
fun SmsPatternsScreen(vm: SmsPatternsViewModel, onOpen: (Long?) -> Unit, onClose: () -> Unit) {
    // Reload on every visit: the editor may have just changed one.
    LaunchedEffect(Unit) { vm.load() }

    Column(Modifier.fillMaxSize()) {
        Header(R.string.sms_patterns, onClose) {
            TextButton(onClick = { onOpen(null) }) { Text(stringResource(R.string.add)) }
        }
        val patterns = vm.patterns
        when {
            patterns == null && vm.error != null -> ErrorBox(vm.error, onRetry = vm::load)
            patterns == null -> LoadingBox()
            patterns.isEmpty() -> EmptyBox(stringResource(R.string.sms_patterns_empty))
            else -> LazyColumn(Modifier.fillMaxSize()) {
                items(patterns, key = { it.id }) { p ->
                    Column(Modifier.clickable { onOpen(p.id) }) {
                        Row(
                            Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 22.dp, vertical = 10.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Column(Modifier.weight(1f)) {
                                Text(p.name, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                                Text(
                                    listOf(
                                        p.senderMatch.ifBlank { stringResource(R.string.any_sender) },
                                        stringResource(if (p.kind == "otp") R.string.kind_otp else R.string.kind_transaction),
                                    ).joinToString(" · "),
                                    fontSize = 11.5.sp,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                            Switch(checked = p.enabled, onCheckedChange = { vm.setEnabled(p, it) })
                        }
                        HorizontalDivider(Modifier.padding(horizontal = 22.dp), color = WalletColors.border)
                    }
                }
                vm.error?.let { item { Text(it, Modifier.padding(22.dp), color = WalletColors.expense, fontSize = 12.sp) } }
            }
        }
    }
}

@Composable
fun SmsPatternScreen(vm: SmsPatternViewModel, onClose: () -> Unit) {
    Column(
        Modifier
            .fillMaxSize()
            .imePadding(),
    ) {
        Header(if (vm.savedId == null) R.string.new_pattern else R.string.edit_pattern, onClose)
        if (vm.loading) LoadingBox() else SmsPatternForm(vm, onClose)
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ColumnScope.SmsPatternForm(vm: SmsPatternViewModel, onClose: () -> Unit) {
    var armed by remember { mutableStateOf(false) }
    val ltr = MaterialTheme.typography.bodyMedium.copy(textDirection = TextDirection.Ltr)
    val mono = ltr.copy(fontFamily = FontFamily.Monospace)
    Column(
        Modifier
            .weight(1f)
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 22.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        OutlinedTextField(vm.name, { vm.name = it }, Modifier.fillMaxWidth(), label = { Text(stringResource(R.string.pattern_name)) }, singleLine = true)
        OutlinedTextField(
            vm.sender,
            { vm.sender = it },
            Modifier.fillMaxWidth(),
            label = { Text(stringResource(R.string.pattern_sender)) },
            supportingText = { Text(stringResource(R.string.pattern_sender_hint)) },
            singleLine = true,
            textStyle = ltr,
        )
        OutlinedTextField(
            vm.regex,
            { vm.regex = it },
            Modifier
                .fillMaxWidth()
                .heightIn(min = 120.dp),
            label = { Text(stringResource(R.string.pattern_regex)) },
            supportingText = { Text(stringResource(R.string.pattern_regex_hint)) },
            textStyle = mono,
        )

        SingleChoiceSegmentedButtonRow(Modifier.fillMaxWidth()) {
            SegmentedButton(selected = !vm.otp, onClick = { vm.otp = false }, shape = SegmentedButtonDefaults.itemShape(0, 2)) {
                Text(stringResource(R.string.kind_transaction))
            }
            SegmentedButton(selected = vm.otp, onClick = { vm.otp = true }, shape = SegmentedButtonDefaults.itemShape(1, 2)) {
                Text(stringResource(R.string.kind_otp))
            }
        }
        SingleChoiceSegmentedButtonRow(Modifier.fillMaxWidth()) {
            SegmentedButton(selected = vm.rial, onClick = { vm.rial = true }, shape = SegmentedButtonDefaults.itemShape(0, 2)) {
                Text(stringResource(R.string.unit_rial))
            }
            SegmentedButton(selected = !vm.rial, onClick = { vm.rial = false }, shape = SegmentedButtonDefaults.itemShape(1, 2)) {
                Text(stringResource(R.string.toman))
            }
        }
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(stringResource(R.string.active), Modifier.weight(1f))
            Switch(checked = vm.enabled, onCheckedChange = { vm.enabled = it })
        }

        HorizontalDivider(color = WalletColors.border)
        Text(stringResource(R.string.pattern_test), fontWeight = FontWeight.Bold)
        OutlinedTextField(
            vm.sample,
            { vm.sample = it },
            Modifier
                .fillMaxWidth()
                .heightIn(min = 100.dp),
            placeholder = { Text(stringResource(R.string.pattern_test_hint)) },
        )
        OutlinedButton(onClick = vm::test, enabled = vm.canSave && vm.sample.isNotBlank()) {
            Text(stringResource(R.string.pattern_run_test))
        }
        vm.result?.let { r ->
            if (!r.matched) {
                Text(stringResource(R.string.pattern_no_match), color = WalletColors.expense)
            } else {
                Text(stringResource(R.string.pattern_matched), color = WalletColors.income, fontWeight = FontWeight.Bold)
                r.amountCents?.let { Text(stringResource(R.string.amount) + ": " + Fmt.group(it) + " " + stringResource(R.string.toman)) }
                for ((key, value) in r.groups) {
                    Text("$key = ${value ?: "—"}", style = mono)
                }
                r.warning?.let { Text(it, color = WalletColors.expense, fontSize = 12.sp) }
            }
        }

        vm.error?.let { Text(stringResource(R.string.error_server, it), color = WalletColors.expense, fontSize = 12.sp) }

        if (vm.savedId != null) {
            TextButton(onClick = { if (armed) vm.delete(onClose) else armed = true }, enabled = !vm.busy) {
                Text(stringResource(if (armed) R.string.delete_tap_again else R.string.delete), color = WalletColors.expense)
            }
        }
    }
    Button(
        onClick = { vm.save(onClose) },
        enabled = vm.canSave,
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 22.dp, vertical = 12.dp),
    ) { Text(stringResource(R.string.save)) }
}
