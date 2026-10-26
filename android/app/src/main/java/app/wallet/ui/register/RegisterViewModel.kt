package app.wallet.ui.register

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import app.wallet.R
import app.wallet.data.ApiError
import app.wallet.data.AuthRepository
import app.wallet.data.ServerStore
import app.wallet.ui.login.LoginError
import kotlinx.coroutines.launch
import okhttp3.HttpUrl

/**
 * Creating an account takes two steps: which server it lives on, then the
 * account itself. The server comes first so it can be checked — reachable,
 * and taking sign-ups — before anyone types a password.
 */
class RegisterViewModel(private val auth: AuthRepository, savedServer: String?) : ViewModel() {
    enum class Step { Server, Account }

    var step by mutableStateOf(Step.Server)
        private set
    var server by mutableStateOf(savedServer?.trimEnd('/').orEmpty())
    var username by mutableStateOf("")
    var password by mutableStateOf("")
    var confirm by mutableStateOf("")
    var busy by mutableStateOf(false)
        private set
    var error by mutableStateOf<LoginError?>(null)
        private set

    /** The server checked in the first step; set whenever step is Account. */
    var checkedServer by mutableStateOf<HttpUrl?>(null)
        private set

    fun checkServer() {
        if (busy) return
        val url = ServerStore.normalize(server) ?: run {
            error = LoginError(if (server.isBlank()) R.string.error_fields_required else R.string.error_bad_server)
            return
        }
        busy = true
        error = null
        viewModelScope.launch {
            try {
                if (auth.signupOpen(url)) {
                    checkedServer = url
                    step = Step.Account
                } else {
                    error = LoginError(R.string.register_closed)
                }
            } catch (e: ApiError) {
                error = serverError(e)
            } finally {
                busy = false
            }
        }
    }

    /** Back from the account step; returns false when already on the first one. */
    fun back(): Boolean {
        if (step == Step.Server) return false
        step = Step.Server
        error = null
        return true
    }

    fun submit(onRegistered: (String) -> Unit) {
        if (busy) return
        val url = checkedServer ?: return
        val name = username.trim().lowercase()
        error = validate(name)
        if (error != null) return
        busy = true
        viewModelScope.launch {
            try {
                val me = auth.register(url, name, password)
                // The ViewModel outlives this sign-up; a later one starts clean.
                username = ""
                password = ""
                confirm = ""
                step = Step.Server
                onRegistered(me)
            } catch (e: ApiError) {
                error = when (e.status) {
                    409 -> LoginError(R.string.register_username_taken)
                    403 -> LoginError(R.string.register_closed)
                    else -> serverError(e)
                }
            } finally {
                busy = false
            }
        }
    }

    // The server checks all of this too (backend/app/routers/auth.py); asking
    // here first just says it in the app's language instead of the server's.
    private fun validate(name: String): LoginError? = when {
        name.isEmpty() || password.isEmpty() -> LoginError(R.string.error_fields_required)
        !USERNAME.matches(name) -> LoginError(R.string.register_username_rule)
        password.length < PASSWORD_MIN -> LoginError(R.string.register_password_short, PASSWORD_MIN.toString())
        password.toByteArray().size > PASSWORD_MAX_BYTES -> LoginError(R.string.register_password_long)
        password != confirm -> LoginError(R.string.register_password_mismatch)
        else -> null
    }

    private fun serverError(e: ApiError) = when (e.status) {
        null -> LoginError(R.string.error_network)
        else -> LoginError(R.string.error_server, e.message ?: e.status.toString())
    }

    companion object {
        private val USERNAME = Regex("^[a-z0-9][a-z0-9_.-]{2,31}$")
        private const val PASSWORD_MIN = 8
        private const val PASSWORD_MAX_BYTES = 72
    }
}
