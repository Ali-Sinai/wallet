package app.wallet.ui.register

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextDirection
import androidx.compose.ui.unit.dp
import app.wallet.R

/** Sign-up: first the server address, then the account — see RegisterViewModel. */
@Composable
fun RegisterScreen(vm: RegisterViewModel, onRegistered: (String) -> Unit, onBackToLogin: () -> Unit) {
    BackHandler { if (!vm.back()) onBackToLogin() }
    // Addresses and credentials are Latin text; keep them left-to-right inside the RTL form.
    val ltr = MaterialTheme.typography.bodyLarge.copy(textDirection = TextDirection.Ltr)

    Column(
        Modifier
            .fillMaxSize()
            .safeDrawingPadding()
            .imePadding()
            .verticalScroll(rememberScrollState())
            .padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp, Alignment.CenterVertically),
    ) {
        Text(stringResource(R.string.register_title), style = MaterialTheme.typography.headlineMedium)
        Text(
            stringResource(
                if (vm.step == RegisterViewModel.Step.Server) R.string.register_server_intro else R.string.register_account_intro,
            ),
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Spacer(Modifier.height(12.dp))

        when (vm.step) {
            RegisterViewModel.Step.Server -> OutlinedTextField(
                value = vm.server,
                onValueChange = { vm.server = it },
                label = { Text(stringResource(R.string.login_server)) },
                supportingText = { Text(stringResource(R.string.login_server_hint)) },
                singleLine = true,
                textStyle = ltr,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Uri, imeAction = ImeAction.Go),
                keyboardActions = KeyboardActions(onGo = { vm.checkServer() }),
                modifier = Modifier.fillMaxWidth(),
            )

            RegisterViewModel.Step.Account -> {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        vm.checkedServer?.toString()?.trimEnd('/').orEmpty(),
                        style = ltr,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.weight(1f),
                    )
                    TextButton(onClick = { vm.back() }) { Text(stringResource(R.string.change_server)) }
                }
                OutlinedTextField(
                    value = vm.username,
                    onValueChange = { vm.username = it },
                    label = { Text(stringResource(R.string.login_username)) },
                    supportingText = { Text(stringResource(R.string.register_username_hint)) },
                    singleLine = true,
                    textStyle = ltr,
                    keyboardOptions = KeyboardOptions(autoCorrectEnabled = false, imeAction = ImeAction.Next),
                    modifier = Modifier.fillMaxWidth(),
                )
                OutlinedTextField(
                    value = vm.password,
                    onValueChange = { vm.password = it },
                    label = { Text(stringResource(R.string.login_password)) },
                    singleLine = true,
                    textStyle = ltr,
                    visualTransformation = PasswordVisualTransformation(),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password, imeAction = ImeAction.Next),
                    modifier = Modifier.fillMaxWidth(),
                )
                OutlinedTextField(
                    value = vm.confirm,
                    onValueChange = { vm.confirm = it },
                    label = { Text(stringResource(R.string.register_password_confirm)) },
                    singleLine = true,
                    textStyle = ltr,
                    visualTransformation = PasswordVisualTransformation(),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password, imeAction = ImeAction.Done),
                    keyboardActions = KeyboardActions(onDone = { vm.submit(onRegistered) }),
                    modifier = Modifier.fillMaxWidth(),
                )
            }
        }

        vm.error?.let { err ->
            Text(
                if (err.arg != null) stringResource(err.res, err.arg) else stringResource(err.res),
                color = MaterialTheme.colorScheme.error,
                style = MaterialTheme.typography.bodyMedium,
            )
        }

        Button(
            onClick = {
                if (vm.step == RegisterViewModel.Step.Server) vm.checkServer() else vm.submit(onRegistered)
            },
            enabled = !vm.busy,
            shape = RoundedCornerShape(12.dp),
            modifier = Modifier
                .fillMaxWidth()
                .height(52.dp),
        ) {
            if (vm.busy) {
                CircularProgressIndicator(Modifier.size(20.dp), strokeWidth = 2.dp)
            } else {
                Text(
                    stringResource(
                        if (vm.step == RegisterViewModel.Step.Server) R.string.register_next else R.string.register_submit,
                    ),
                )
            }
        }
        TextButton(onClick = onBackToLogin, modifier = Modifier.fillMaxWidth()) {
            Text(stringResource(R.string.register_have_account))
        }
    }
}
