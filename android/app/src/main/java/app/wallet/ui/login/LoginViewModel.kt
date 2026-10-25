package app.wallet.ui.login

import androidx.annotation.StringRes
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import app.wallet.R
import app.wallet.data.ApiError
import app.wallet.data.AuthRepository
import app.wallet.data.ServerStore
import kotlinx.coroutines.launch

/** A message to show: a string resource, optionally formatted with the server's own text. */
data class LoginError(@StringRes val res: Int, val arg: String? = null)

class LoginViewModel(private val auth: AuthRepository, savedServer: String?) : ViewModel() {
    var server by mutableStateOf(savedServer?.trimEnd('/').orEmpty())
    var username by mutableStateOf("")
    var password by mutableStateOf("")
    var busy by mutableStateOf(false)
        private set
    var error by mutableStateOf<LoginError?>(null)
        private set

    fun submit(onLoggedIn: (String) -> Unit) {
        if (busy) return
        if (server.isBlank() || username.isBlank() || password.isEmpty()) {
            error = LoginError(R.string.error_fields_required)
            return
        }
        val url = ServerStore.normalize(server) ?: run {
            error = LoginError(R.string.error_bad_server)
            return
        }
        busy = true
        error = null
        viewModelScope.launch {
            try {
                val me = auth.login(url, username.trim(), password)
                password = ""
                onLoggedIn(me)
            } catch (e: ApiError) {
                error = when (e.status) {
                    null -> LoginError(R.string.error_network)
                    401 -> LoginError(R.string.error_invalid_credentials)
                    else -> LoginError(R.string.error_server, e.message ?: e.status.toString())
                }
            } finally {
                busy = false
            }
        }
    }
}
