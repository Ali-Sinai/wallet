package app.wallet

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import app.wallet.data.ApiClient
import app.wallet.data.ApiError
import app.wallet.data.AuthRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

sealed interface SessionState {
    data object Checking : SessionState
    data object LoggedOut : SessionState
    data class LoggedIn(val username: String) : SessionState

    /** There is a saved session, but the server couldn't be asked about it. */
    data class Unreachable(val message: String?) : SessionState
}

/** Decides which screen the app shows: login, or the signed-in app. */
class SessionViewModel(private val auth: AuthRepository, api: ApiClient) : ViewModel() {
    private val _state = MutableStateFlow<SessionState>(SessionState.Checking)
    val state: StateFlow<SessionState> = _state.asStateFlow()

    val serverUrl: String? get() = auth.serverUrl?.toString()

    init {
        check()
        viewModelScope.launch {
            // Any 401 mid-session means the cookie expired: back to the login screen.
            api.unauthorized.collect {
                if (_state.value is SessionState.LoggedIn) _state.value = SessionState.LoggedOut
            }
        }
    }

    fun check() {
        _state.value = SessionState.Checking
        viewModelScope.launch {
            _state.value = try {
                auth.currentUser()?.let(SessionState::LoggedIn) ?: SessionState.LoggedOut
            } catch (e: ApiError) {
                SessionState.Unreachable(e.message)
            }
        }
    }

    fun loggedIn(username: String) {
        _state.value = SessionState.LoggedIn(username)
    }

    fun showLogin() {
        _state.value = SessionState.LoggedOut
    }

    fun logout() {
        viewModelScope.launch {
            auth.logout()
            _state.value = SessionState.LoggedOut
        }
    }
}
