package app.wallet.ui.inbox

import android.Manifest
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDirection
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import app.wallet.R
import app.wallet.sms.SmsSettings
import app.wallet.ui.theme.WalletColors
import app.wallet.util.Fmt
import java.time.Instant

@Composable
fun SmsSettingsScreen(vm: SmsSettingsViewModel, onClose: () -> Unit) {
    val context = LocalContext.current
    var permissionDenied by remember { mutableStateOf(false) }
    var confirmRotate by remember { mutableStateOf(false) }
    val permission = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        permissionDenied = !granted
        if (granted) vm.updateEnabled(true)
    }
    val hasPermission = ContextCompat.checkSelfPermission(context, Manifest.permission.RECEIVE_SMS) ==
        PackageManager.PERMISSION_GRANTED

    Column(Modifier.fillMaxSize()) {
        Row(Modifier.padding(horizontal = 8.dp, vertical = 4.dp), verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = onClose) { Icon(Icons.Filled.Close, contentDescription = stringResource(R.string.close)) }
            Text(stringResource(R.string.sms_settings), fontSize = 18.sp, fontWeight = FontWeight.Bold)
        }

        Column(
            Modifier
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 22.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text(stringResource(R.string.sms_auto_read), fontWeight = FontWeight.Bold)
                    Text(stringResource(R.string.sms_auto_read_hint), fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                Switch(
                    checked = vm.enabled && hasPermission,
                    onCheckedChange = { on ->
                        when {
                            !on -> vm.updateEnabled(false)
                            hasPermission -> vm.updateEnabled(true)
                            else -> permission.launch(Manifest.permission.RECEIVE_SMS)
                        }
                    },
                )
            }
            if (permissionDenied) {
                Text(stringResource(R.string.sms_permission_denied), color = WalletColors.Expense, fontSize = 12.sp)
            }

            HorizontalDivider(color = WalletColors.Border)

            Text(stringResource(R.string.sms_token), fontWeight = FontWeight.Bold)
            Text(stringResource(R.string.sms_token_hint), fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
            OutlinedTextField(
                value = vm.token,
                onValueChange = vm::updateToken,
                singleLine = true,
                textStyle = MaterialTheme.typography.bodyMedium.copy(textDirection = TextDirection.Ltr),
                modifier = Modifier.fillMaxWidth(),
            )
            OutlinedButton(onClick = { confirmRotate = true }, enabled = !vm.rotating) {
                Text(stringResource(R.string.sms_token_rotate))
            }
            if (vm.enabled && vm.token.isBlank()) {
                Text(stringResource(R.string.sms_token_missing), color = WalletColors.Expense, fontSize = 12.sp)
            }

            HorizontalDivider(color = WalletColors.Border)

            Text(stringResource(R.string.sms_senders), fontWeight = FontWeight.Bold)
            Text(stringResource(R.string.sms_senders_hint), fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
            if (vm.senders.isEmpty() && !vm.loadingSenders) {
                Text(stringResource(R.string.sms_senders_empty), color = WalletColors.Expense, fontSize = 12.sp)
            }
            for (sender in vm.senders) {
                Text("• $sender", style = MaterialTheme.typography.bodyMedium.copy(textDirection = TextDirection.Ltr))
            }
            TextButton(onClick = vm::refreshSenders, enabled = !vm.loadingSenders) {
                Text(stringResource(R.string.sms_senders_refresh))
            }

            vm.lastStatus?.let { status ->
                HorizontalDivider(color = WalletColors.Border)
                val label = stringResource(
                    when (status) {
                        "parsed" -> R.string.sms_status_parsed
                        "unparsed" -> R.string.sms_status_unparsed
                        "otp" -> R.string.sms_status_otp
                        "ignored_account" -> R.string.sms_status_ignored_account
                        SmsSettings.STATUS_BAD_TOKEN -> R.string.sms_status_bad_token
                        else -> R.string.sms_status_rejected
                    },
                )
                val at = Instant.ofEpochMilli(vm.lastStatusAt).toString()
                Text(
                    stringResource(R.string.sms_last_status, "${Fmt.jalaliDate(at)} ${Fmt.time(at)}", label),
                    fontSize = 12.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }

            vm.error?.let { Text(stringResource(R.string.error_server, it), color = WalletColors.Expense, fontSize = 12.sp) }
        }
    }

    if (confirmRotate) {
        AlertDialog(
            onDismissRequest = { confirmRotate = false },
            text = { Text(stringResource(R.string.sms_token_rotate_confirm)) },
            confirmButton = {
                TextButton(onClick = {
                    confirmRotate = false
                    vm.rotateToken()
                }) { Text(stringResource(R.string.sms_token_rotate)) }
            },
            dismissButton = { TextButton(onClick = { confirmRotate = false }) { Text(stringResource(R.string.cancel)) } },
        )
    }
}
