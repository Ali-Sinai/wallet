package app.wallet

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.SystemBarStyle
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import app.wallet.ui.SignedInApp
import app.wallet.ui.login.LoginScreen
import app.wallet.ui.login.LoginViewModel
import app.wallet.ui.theme.WalletTheme
import app.wallet.ui.theme.paletteFor

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        val container = (application as WalletApp).container
        setContent {
            val theme by container.theme.theme.collectAsStateWithLifecycle()
            val dark = paletteFor(theme).dark
            // Status/navigation bar icons have to contrast with the theme, not the phone's own setting.
            LaunchedEffect(dark) {
                val transparent = android.graphics.Color.TRANSPARENT
                val style = if (dark) SystemBarStyle.dark(transparent) else SystemBarStyle.light(transparent, transparent)
                enableEdgeToEdge(statusBarStyle = style, navigationBarStyle = style)
            }
            WalletTheme(theme) {
                val session: SessionViewModel = viewModel(
                    factory = viewModelFactory { initializer { SessionViewModel(container.auth, container.api) } },
                )
                val state by session.state.collectAsStateWithLifecycle()
                when (val s = state) {
                    SessionState.Checking -> Centered { CircularProgressIndicator() }
                    SessionState.LoggedOut -> {
                        val login: LoginViewModel = viewModel(
                            factory = viewModelFactory {
                                initializer { LoginViewModel(container.auth, session.serverUrl) }
                            },
                        )
                        LoginScreen(login, onLoggedIn = session::loggedIn)
                    }
                    is SessionState.LoggedIn -> SignedInApp(
                        username = s.username,
                        serverUrl = session.serverUrl.orEmpty(),
                        onLogout = session::logout,
                    )
                    is SessionState.Unreachable -> Centered {
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.spacedBy(12.dp),
                        ) {
                            Text(stringResource(R.string.startup_unreachable), style = MaterialTheme.typography.titleMedium)
                            s.message?.let {
                                Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                            Button(onClick = session::check) { Text(stringResource(R.string.retry)) }
                            TextButton(onClick = session::showLogin) { Text(stringResource(R.string.change_server)) }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun Centered(content: @Composable () -> Unit) {
    Box(
        Modifier
            .fillMaxSize()
            .padding(24.dp),
        contentAlignment = Alignment.Center,
    ) { content() }
}
