package app.wallet.data

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update

/** Names for the ids a transaction carries. */
data class Lookups(
    val accounts: List<Account> = emptyList(),
    val categories: List<Category> = emptyList(),
) {
    private val accountsById = accounts.associateBy { it.id }
    private val categoriesById = categories.associateBy { it.id }

    fun account(id: Long?) = id?.let(accountsById::get)
    fun category(id: Long?) = id?.let(categoriesById::get)
}

class WalletRepository(private val auth: AuthRepository, private val client: ApiClient) {
    private val api: WalletApi
        get() = client.forServer(auth.serverUrl ?: throw ApiError(null, "no server"))

    private val _changes = MutableStateFlow(0)

    /** Bumps after every write, so screens showing server data know to reload. */
    val changes: StateFlow<Int> = _changes.asStateFlow()

    private var lookups: Lookups? = null

    /** Accounts and categories change rarely; fetched once, then reused until [force]. */
    suspend fun lookups(force: Boolean = false): Lookups {
        if (!force) lookups?.let { return it }
        val accounts = client.call { api.accounts() }
        val categories = client.call { api.categories() }
        return Lookups(accounts, categories).also { lookups = it }
    }

    suspend fun dashboard() = client.call { api.dashboard() }

    suspend fun categoryBreakdown() = client.call { api.categoryBreakdown() }

    suspend fun transactions(limit: Int? = null, direction: Direction? = null, search: String? = null) =
        client.call { api.transactions(limit, direction, search?.takeIf { it.isNotBlank() }) }

    suspend fun suggestCategory(merchant: String): Long? =
        client.call { api.suggestCategory(merchant) }.categoryId

    suspend fun createTransaction(body: TransactionIn): Transaction =
        client.call { api.createTransaction(body) }.also { _changes.update { it + 1 } }

    suspend fun deleteTransaction(id: Long) {
        client.call { api.deleteTransaction(id) }
        _changes.update { it + 1 }
    }
}
