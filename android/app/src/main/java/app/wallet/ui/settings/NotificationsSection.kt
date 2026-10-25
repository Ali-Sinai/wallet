package app.wallet.ui.settings

import android.Manifest
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.FilterChip
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
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
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.wallet.R
import app.wallet.notify.Notifications
import app.wallet.ui.theme.WalletColors
import app.wallet.util.Fmt

/** Notification permission, server push, and the server's push schedule. */
@Composable
fun NotificationsSection(vm: NotificationsViewModel) {
    val context = LocalContext.current
    var allowed by remember { mutableStateOf(Notifications.allowed(context)) }
    var pendingPush by remember { mutableStateOf(false) }
    val permission = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        allowed = granted
        if (granted && pendingPush) vm.setPush(true)
        pendingPush = false
    }
    fun ask() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) permission.launch(Manifest.permission.POST_NOTIFICATIONS)
    }

    Column(Modifier.padding(horizontal = 22.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text(stringResource(R.string.notify_allow), fontWeight = FontWeight.Bold, fontSize = 14.sp)
                Text(stringResource(R.string.notify_allow_hint), fontSize = 11.5.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Switch(checked = allowed, onCheckedChange = { if (it && !allowed) ask() }, enabled = !allowed)
        }

        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text(stringResource(R.string.notify_push), fontWeight = FontWeight.Bold, fontSize = 14.sp)
                Text(
                    stringResource(
                        when {
                            !vm.pushConfigured -> R.string.notify_push_not_built
                            vm.serverHasPush == false -> R.string.notify_push_server_off
                            else -> R.string.notify_push_hint
                        },
                    ),
                    fontSize = 11.5.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            Switch(
                checked = vm.pushOn,
                onCheckedChange = { on ->
                    when {
                        !on -> vm.setPush(false)
                        allowed -> vm.setPush(true)
                        else -> {
                            pendingPush = true
                            ask()
                        }
                    }
                },
                enabled = vm.pushConfigured && vm.serverHasPush != false && !vm.busy,
            )
        }

        val settings = vm.settings
        if (vm.pushOn && settings != null) {
            Text(stringResource(R.string.notify_summary), fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                for ((value, label) in listOf(
                    "off" to R.string.summary_off,
                    "weekly" to R.string.summary_weekly,
                    "monthly" to R.string.summary_monthly,
                )) {
                    FilterChip(
                        selected = settings.summaryFrequency == value,
                        onClick = { vm.setFrequency(value) },
                        label = { Text(stringResource(label)) },
                    )
                }
            }
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(stringResource(R.string.notify_threshold), Modifier.weight(1f), fontSize = 13.sp)
                IconButton(onClick = { vm.setThreshold(settings.uncategorizedThreshold - 1) }, enabled = !vm.busy) { Text("−") }
                Text(Fmt.digits(settings.uncategorizedThreshold), fontWeight = FontWeight.Bold)
                IconButton(onClick = { vm.setThreshold(settings.uncategorizedThreshold + 1) }, enabled = !vm.busy) { Text("+") }
            }
        }
        vm.error?.let { Text(stringResource(R.string.error_server, it), color = WalletColors.expense, fontSize = 12.sp) }
    }
}
