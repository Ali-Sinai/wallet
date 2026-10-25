package app.wallet.ui.home

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import app.wallet.R

/** Placeholder for the signed-in app until the dashboard lands (stage 2). */
@Composable
fun HomeScreen(username: String, serverUrl: String, onLogout: () -> Unit) {
    Column(
        Modifier
            .fillMaxSize()
            .safeDrawingPadding()
            .padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Text(stringResource(R.string.home_greeting, username), style = MaterialTheme.typography.headlineSmall)
        Text(
            stringResource(R.string.home_connected_to, serverUrl.trimEnd('/')),
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Text(stringResource(R.string.home_placeholder), style = MaterialTheme.typography.bodyLarge)
        OutlinedButton(onClick = onLogout) { Text(stringResource(R.string.logout)) }
    }
}
