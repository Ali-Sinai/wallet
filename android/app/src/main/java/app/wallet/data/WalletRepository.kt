package app.wallet.data

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.serialization.json.JsonNull

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

    suspend fun categoryBreakdown(period: String = "month") = client.call { api.categoryBreakdown(period) }

    suspend fun transactions(limit: Int? = null, direction: Direction? = null, search: String? = null) =
        client.call { api.transactions(limit, direction, search?.takeIf { it.isNotBlank() }) }

    suspend fun transaction(id: Long) = client.call { api.transaction(id) }

    suspend fun suggestCategory(merchant: String): Long? =
        client.call { api.suggestCategory(merchant) }.categoryId

    suspend fun createTransaction(body: TransactionIn): Transaction =
        client.call { api.createTransaction(body) }.also { _changes.update { it + 1 } }

    /** After a change to accounts or categories: drop the cached names, tell every screen. */
    private fun lookupsChanged() {
        lookups = null
        notifyChanged()
    }

    suspend fun saveAccount(id: Long?, body: AccountIn) {
        client.call { if (id == null) api.createAccount(body) else api.updateAccount(id, body) }
        lookupsChanged()
    }

    suspend fun deleteAccount(id: Long) {
        client.call { api.deleteAccount(id) }
        lookupsChanged()
    }

    suspend fun saveCategory(id: Long?, body: CategoryIn) {
        client.call { if (id == null) api.createCategory(body) else api.updateCategory(id, body) }
        lookupsChanged()
    }

    suspend fun deleteCategory(id: Long) {
        client.call { api.deleteCategory(id) }
        lookupsChanged()
    }

    suspend fun budgets() = client.call { api.budgets() }

    suspend fun saveBudget(id: Long?, body: BudgetIn) {
        client.call { if (id == null) api.createBudget(body) else api.updateBudget(id, body) }
        notifyChanged()
    }

    suspend fun deleteBudget(id: Long) {
        client.call { api.deleteBudget(id) }
        notifyChanged()
    }

    suspend fun balances() = client.call { api.balances() }

    suspend fun people() = client.call { api.people() }

    suspend fun savePerson(id: Long?, body: PersonIn) {
        client.call { if (id == null) api.createPerson(body) else api.updatePerson(id, body) }
        notifyChanged()
    }

    suspend fun deletePerson(id: Long) {
        client.call { api.deletePerson(id) }
        notifyChanged()
    }

    suspend fun personDebts(id: Long) = client.call { api.personDebts(id) }

    suspend fun personTransactions(id: Long) = client.call { api.transactions(personId = id) }

    suspend fun settleAll(personId: Long) {
        client.call { api.settleAll(personId) }
        notifyChanged()
    }

    suspend fun settleDebt(id: Long, amountCents: Long) {
        client.call { api.settleDebt(id, SettleDebt(amountCents)) }
        notifyChanged()
    }

    // Retrofit's converter can't decode a bare JSON null into a nullable type, so decode by hand.
    suspend fun splitFor(txId: Long): Split? {
        val body = client.call { api.splitFor(txId) }
        return if (body is JsonNull) null else client.json.decodeFromJsonElement(Split.serializer(), body)
    }

    suspend fun createSplit(txId: Long, body: SplitRequest) {
        client.call { api.createSplit(txId, body) }
        notifyChanged()
    }

    suspend fun deleteSplit(id: Long) {
        client.call { api.deleteSplit(id) }
        notifyChanged()
    }

    suspend fun incomeVsExpense(period: String) = client.call { api.incomeVsExpense(period) }

    suspend fun spendOverTime(period: String, groupBy: String) = client.call { api.spendOverTime(period, groupBy) }

    suspend fun monthOverMonth() = client.call { api.monthOverMonth() }

    suspend fun byAccount(period: String) = client.call { api.byAccount(period) }

    suspend fun pushEnabledOnServer() = client.call { api.pushStatus() }.enabled

    suspend fun pushSubscribe(token: String) = client.call { api.pushSubscribe(PushToken(token)) }

    suspend fun pushUnsubscribe(token: String) = client.call { api.pushUnsubscribe(PushToken(token)) }

    suspend fun notificationSettings() = client.call { api.notificationSettings() }

    suspend fun saveNotificationSettings(body: NotificationSettings) =
        client.call { api.updateNotificationSettings(body) }

    /** Something outside the repository (the SMS worker) changed server data. */
    fun notifyChanged() = _changes.update { it + 1 }

    suspend fun smsPending() = client.call { api.smsPending() }

    suspend fun smsUnparsed() = client.call { api.smsUnparsed() }

    suspend fun confirmSms(id: Long, categoryId: Long?, accountId: Long?): ConfirmResult =
        client.call { api.confirmSms(id, ConfirmSms(categoryId = categoryId, accountId = accountId)) }
            .also { notifyChanged() }

    suspend fun ignoreSms(id: Long) {
        client.call { api.ignoreSms(id) }
        notifyChanged()
    }

    suspend fun resolveSms(id: Long, body: ResolveSms) {
        client.call { api.resolveSms(id, body) }
        notifyChanged()
    }

    suspend fun pasteSms(text: String): List<SmsAttempt> =
        client.call { api.pasteSms(PasteSms(text)) }.also { notifyChanged() }

    suspend fun smsPatterns() = client.call { api.smsPatterns() }

    suspend fun savePattern(id: Long?, body: SmsPatternIn): SmsPattern =
        client.call { if (id == null) api.createPattern(body) else api.updatePattern(id, body) }

    suspend fun deletePattern(id: Long) = client.call { api.deletePattern(id) }

    suspend fun testPattern(id: Long, sample: String) = client.call { api.testPattern(id, PatternTest(sample)) }

    suspend fun rotateWebhookToken(): String = client.call { api.rotateWebhookToken() }.token

    suspend fun updateTransaction(id: Long, body: TransactionIn): Transaction =
        client.call { api.updateTransaction(id, body) }.also { notifyChanged() }

    suspend fun deleteTransaction(id: Long) {
        client.call { api.deleteTransaction(id) }
        _changes.update { it + 1 }
    }
}
