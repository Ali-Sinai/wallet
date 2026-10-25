package app.wallet.ui.components

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import app.wallet.data.ApiError
import app.wallet.data.Transaction
import app.wallet.data.WalletRepository
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Job
import kotlinx.coroutines.ensureActive
import kotlinx.coroutines.flow.drop
import kotlinx.coroutines.launch

/** What a screen backed by the server is showing. */
sealed interface Load<out T> {
    data object Loading : Load<Nothing>
    data class Failed(val message: String?) : Load<Nothing>
    data class Ready<T>(val data: T) : Load<T>
}

/**
 * A screen that loads server data, reloads after any write anywhere in the
 * app, and opens transactions in the detail sheet (with delete).
 */
abstract class TxListViewModel<T>(protected val repo: WalletRepository) : ViewModel() {
    var state by mutableStateOf<Load<T>>(Load.Loading)
        private set
    var refreshing by mutableStateOf(false)
        private set
    var selected by mutableStateOf<Transaction?>(null)
    var deleting by mutableStateOf(false)
        private set

    private var job: Job? = null

    protected abstract suspend fun fetch(force: Boolean): T

    /** Call from the subclass's init, once its own fields are set. */
    protected fun start() {
        reload()
        viewModelScope.launch { repo.changes.drop(1).collect { reload() } }
    }

    fun refresh() = reload(force = true)

    protected fun reload(force: Boolean = false) {
        job?.cancel()
        if (state !is Load.Ready) state = Load.Loading
        refreshing = force
        job = viewModelScope.launch {
            try {
                state = Load.Ready(fetch(force))
            } catch (e: ApiError) {
                ensureActive() // superseded by a newer reload: its result wins, not this failure
                // Keep showing what we had; a failed background refresh isn't worth a full-screen error.
                if (state !is Load.Ready || force) state = Load.Failed(e.message)
            } catch (e: CancellationException) {
                throw e
            } finally {
                refreshing = false
            }
        }
    }

    fun delete(tx: Transaction) {
        if (deleting) return
        deleting = true
        viewModelScope.launch {
            try {
                repo.deleteTransaction(tx.id)
                selected = null
            } catch (_: ApiError) {
                // Leave the sheet open; the row is still there, so nothing is lost.
            } finally {
                deleting = false
            }
        }
    }
}
