package app.wallet.data

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonElement
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.HTTP
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

/**
 * The backend's REST API (backend/app/routers). Paths are relative to the
 * server's origin. Field names are camelCase here and snake_case on the wire
 * (see the Json naming strategy in ApiClient).
 */
interface WalletApi {
    @POST("api/auth/login")
    suspend fun login(@Body body: LoginRequest): MeResponse

    /** Whether the server takes new accounts. Servers from before sign-up answer 404. */
    @GET("api/auth/signup")
    suspend fun signupStatus(): SignupStatus

    @POST("api/auth/register")
    suspend fun register(@Body body: LoginRequest): MeResponse

    @POST("api/auth/logout")
    suspend fun logout()

    @GET("api/auth/me")
    suspend fun me(): MeResponse

    @GET("api/dashboard")
    suspend fun dashboard(@Query("period") period: String = "month"): Dashboard

    @GET("api/reports/category-breakdown")
    suspend fun categoryBreakdown(@Query("period") period: String = "month"): List<CategorySlice>

    @GET("api/transactions")
    suspend fun transactions(
        @Query("limit") limit: Int? = null,
        @Query("direction") direction: Direction? = null,
        @Query("search") search: String? = null,
        @Query("person_id") personId: Long? = null,
        @Query("category_id") categoryId: Long? = null,
    ): List<Transaction>

    @GET("api/transactions/{id}")
    suspend fun transaction(@Path("id") id: Long): Transaction

    @POST("api/transactions")
    suspend fun createTransaction(@Body body: TransactionIn): Transaction

    @PATCH("api/transactions/{id}")
    suspend fun updateTransaction(@Path("id") id: Long, @Body body: TransactionIn): Transaction

    @DELETE("api/transactions/{id}")
    suspend fun deleteTransaction(@Path("id") id: Long)

    @GET("api/transactions/suggest-category/{merchant}")
    suspend fun suggestCategory(@Path("merchant") merchant: String): CategorySuggestion

    @GET("api/accounts")
    suspend fun accounts(): List<Account>

    @GET("api/categories")
    suspend fun categories(): List<Category>

    @POST("api/accounts")
    suspend fun createAccount(@Body body: AccountIn): Account

    @PATCH("api/accounts/{id}")
    suspend fun updateAccount(@Path("id") id: Long, @Body body: AccountIn): Account

    @DELETE("api/accounts/{id}")
    suspend fun deleteAccount(@Path("id") id: Long)

    @POST("api/categories")
    suspend fun createCategory(@Body body: CategoryIn): Category

    @PATCH("api/categories/{id}")
    suspend fun updateCategory(@Path("id") id: Long, @Body body: CategoryIn): Category

    @DELETE("api/categories/{id}")
    suspend fun deleteCategory(@Path("id") id: Long)

    @GET("api/budgets")
    suspend fun budgets(): List<Budget>

    @POST("api/budgets")
    suspend fun createBudget(@Body body: BudgetIn): Budget

    @PATCH("api/budgets/{id}")
    suspend fun updateBudget(@Path("id") id: Long, @Body body: BudgetIn): Budget

    @DELETE("api/budgets/{id}")
    suspend fun deleteBudget(@Path("id") id: Long)

    @GET("api/people")
    suspend fun people(): List<Person>

    @GET("api/people/balances")
    suspend fun balances(): List<PersonBalance>

    @POST("api/people")
    suspend fun createPerson(@Body body: PersonIn): Person

    @PATCH("api/people/{id}")
    suspend fun updatePerson(@Path("id") id: Long, @Body body: PersonIn): Person

    @DELETE("api/people/{id}")
    suspend fun deletePerson(@Path("id") id: Long)

    @GET("api/people/{id}/debts")
    suspend fun personDebts(@Path("id") id: Long): List<Debt>

    @POST("api/people/{id}/settle-all")
    suspend fun settleAll(@Path("id") id: Long)

    @POST("api/debts/{id}/settle")
    suspend fun settleDebt(@Path("id") id: Long, @Body body: SettleDebt): Debt

    /** The transaction's [Split], or JSON null when it has none (see WalletRepository.splitFor). */
    @GET("api/transactions/{id}/split")
    suspend fun splitFor(@Path("id") txId: Long): JsonElement

    @POST("api/transactions/{id}/split")
    suspend fun createSplit(@Path("id") txId: Long, @Body body: SplitRequest): Split

    @DELETE("api/splits/{id}")
    suspend fun deleteSplit(@Path("id") id: Long)

    @GET("api/reports/income-vs-expense")
    suspend fun incomeVsExpense(@Query("period") period: String): IncomeExpense

    @GET("api/reports/spend-over-time")
    suspend fun spendOverTime(@Query("period") period: String, @Query("group_by") groupBy: String): List<Point>

    @GET("api/reports/month-over-month")
    suspend fun monthOverMonth(): List<MonthCategoryDelta>

    @GET("api/reports/by-account")
    suspend fun byAccount(@Query("period") period: String): List<AccountBreakdown>

    @GET("api/push/status")
    suspend fun pushStatus(): PushStatus

    @POST("api/push/subscribe")
    suspend fun pushSubscribe(@Body body: PushToken)

    @HTTP(method = "DELETE", path = "api/push/subscribe", hasBody = true)
    suspend fun pushUnsubscribe(@Body body: PushToken)

    @GET("api/settings/notifications")
    suspend fun notificationSettings(): NotificationSettings

    @PATCH("api/settings/notifications")
    suspend fun updateNotificationSettings(@Body body: NotificationSettings): NotificationSettings

    @GET("api/sms/pending")
    suspend fun smsPending(): List<SmsAttempt>

    @GET("api/sms/unparsed")
    suspend fun smsUnparsed(): List<SmsAttempt>

    @POST("api/sms/{id}/confirm")
    suspend fun confirmSms(@Path("id") id: Long, @Body body: ConfirmSms): ConfirmResult

    @POST("api/sms/{id}/ignore")
    suspend fun ignoreSms(@Path("id") id: Long)

    @POST("api/sms/{id}/resolve-manually")
    suspend fun resolveSms(@Path("id") id: Long, @Body body: ResolveSms)

    @POST("api/ingest/sms/paste")
    suspend fun pasteSms(@Body body: PasteSms): List<SmsAttempt>

    @GET("api/sms-patterns")
    suspend fun smsPatterns(): List<SmsPattern>

    @POST("api/sms-patterns")
    suspend fun createPattern(@Body body: SmsPatternIn): SmsPattern

    @PATCH("api/sms-patterns/{id}")
    suspend fun updatePattern(@Path("id") id: Long, @Body body: SmsPatternIn): SmsPattern

    @DELETE("api/sms-patterns/{id}")
    suspend fun deletePattern(@Path("id") id: Long)

    @POST("api/sms-patterns/{id}/test")
    suspend fun testPattern(@Path("id") id: Long, @Body body: PatternTest): PatternTestResult

    @POST("api/settings/webhook-token/rotate")
    suspend fun rotateWebhookToken(): WebhookToken
}

@Serializable
data class LoginRequest(val username: String, val password: String)

@Serializable
data class MeResponse(val username: String)

@Serializable
data class SignupStatus(val enabled: Boolean)

@Serializable
enum class Direction {
    @SerialName("deposit") DEPOSIT,
    @SerialName("withdrawal") WITHDRAWAL,
    ;

    // Retrofit puts @Query enums in the URL via toString().
    override fun toString() = if (this == DEPOSIT) "deposit" else "withdrawal"
}

@Serializable
data class DailyBar(val label: String, val amountCents: Long)

@Serializable
data class Dashboard(
    val totalInCents: Long,
    val totalOutCents: Long,
    val netCents: Long,
    val biggestExpenseCents: Long,
    val transactionCount: Int,
    val depositCount: Int,
    val withdrawalCount: Int,
    val outstandingDebtsOwedToMeCents: Long,
    val dailySpend: List<DailyBar>,
)

@Serializable
data class CategorySlice(
    val categoryId: Long?,
    val label: String,
    val color: String,
    val amountCents: Long,
    val percentage: Double,
)

@Serializable
data class Transaction(
    val id: Long,
    val amountCents: Long,
    val direction: Direction,
    val accountId: Long,
    /** UTC, usually without an offset — see [app.wallet.util.Fmt.parseApiDate]. */
    val occurredAt: String,
    val occurredAtJalali: String,
    val categoryId: Long?,
    val note: String?,
    val source: String,
    val merchantText: String?,
    val isShared: Boolean = false,
) {
    val signedCents: Long get() = if (direction == Direction.WITHDRAWAL) -amountCents else amountCents
}

@Serializable
data class TransactionIn(
    val amountCents: Long,
    val direction: Direction,
    val accountId: Long,
    val occurredAt: String,
    val categoryId: Long?,
    val note: String?,
    val merchantText: String?,
)

@Serializable
data class CategorySuggestion(val categoryId: Long?)

@Serializable
data class Account(
    val id: Long,
    val nameFa: String,
    val nameEn: String,
    val bankName: String,
    val last4: String,
    val isActive: Boolean = true,
)

@Serializable
data class Category(
    val id: Long,
    val nameFa: String,
    val nameEn: String,
    val icon: String = "",
    val color: String = "#0f9b6e",
    val parentId: Long? = null,
    val sortOrder: Int = 0,
)

/** A bank SMS the server read (parseStatus "parsed") or couldn't ("unparsed", with [rawBody]). */
@Serializable
data class SmsAttempt(
    val id: Long,
    val sender: String,
    val parseStatus: String,
    val amountCents: Long? = null,
    val direction: Direction? = null,
    val accountLast4: String? = null,
    val occurredAt: String? = null,
    val merchant: String? = null,
    val rawBody: String? = null,
    val receivedAt: String,
)

@Serializable
data class ConfirmSms(val categoryId: Long?, val note: String? = null, val accountId: Long? = null)

@Serializable
data class ConfirmResult(val duplicate: Boolean, val transactionId: Long? = null)

@Serializable
data class ResolveSms(
    val amountCents: Long,
    val direction: Direction,
    val accountId: Long,
    val occurredAt: String,
    val categoryId: Long?,
    val note: String?,
)

@Serializable
data class PasteSms(val text: String, val senderHint: String = "paste")

@Serializable
data class SmsPattern(
    val id: Long,
    val name: String,
    val senderMatch: String,
    val bodyRegex: String = "",
    /** "rial" or "toman": what the message's amount is written in. */
    val amountUnit: String = "rial",
    /** "transaction", or "otp" for a purchase-code message that names the seller. */
    val kind: String = "transaction",
    val enabled: Boolean = true,
)

@Serializable
data class SmsPatternIn(
    val name: String,
    val senderMatch: String,
    val bodyRegex: String,
    val amountUnit: String,
    val kind: String,
    val enabled: Boolean,
)

@Serializable
data class PatternTest(val sampleText: String)

@Serializable
data class PatternTestResult(
    val matched: Boolean,
    val kind: String? = null,
    val groups: Map<String, String?> = emptyMap(),
    val amountCents: Long? = null,
    val warning: String? = null,
)

@Serializable
data class WebhookToken(val token: String)

@Serializable
data class AccountIn(
    val nameFa: String,
    val nameEn: String,
    val bankName: String,
    val last4: String,
    val isActive: Boolean = true,
)

@Serializable
data class CategoryIn(
    val nameFa: String,
    val nameEn: String,
    val icon: String,
    val color: String,
    val parentId: Long? = null,
    val sortOrder: Int = 0,
)

/** A monthly spending limit; [monthJalali] null means every month. */
@Serializable
data class Budget(val id: Long, val categoryId: Long, val limitCents: Long, val monthJalali: String? = null)

@Serializable
data class BudgetIn(val categoryId: Long, val limitCents: Long, val monthJalali: String? = null)

@Serializable
data class Person(val id: Long, val name: String, val contactNote: String? = null)

@Serializable
data class PersonIn(val name: String, val contactNote: String? = null)

/** [netCents] > 0: they owe me; < 0: I owe them. */
@Serializable
data class PersonBalance(val personId: Long, val name: String, val netCents: Long, val openDebtCount: Int)

@Serializable
data class Debt(
    val id: Long,
    val personId: Long,
    /** "owed_to_me" or "i_owe". */
    val direction: String,
    val amountCents: Long,
    val amountSettledCents: Long,
    val status: String,
) {
    val remainingCents: Long get() = amountCents - amountSettledCents
    val owedToMe: Boolean get() = direction == "owed_to_me"
}

@Serializable
data class SettleDebt(val amountCents: Long, val note: String? = null)

@Serializable
data class SplitShare(val personId: Long?, val amountCents: Long)

@Serializable
data class Split(val id: Long, val transactionId: Long, val mode: String, val shares: List<SplitShare>)

/**
 * POST /transactions/{id}/split. Participant keys in [percentages] and
 * [customAmounts] are "me" or a person id as a string.
 */
@Serializable
data class SplitRequest(
    /** "i_paid" or "they_paid". */
    val mode: String,
    /** "equal", "percentage" or "custom". */
    val method: String,
    val participantPersonIds: List<Long>,
    val includeMe: Boolean,
    val percentages: Map<String, Double>? = null,
    val customAmounts: Map<String, Long>? = null,
)

@Serializable
data class IncomeExpense(val incomeCents: Long, val expenseCents: Long)

@Serializable
data class Point(val label: String, val amountCents: Long)

@Serializable
data class MonthCategoryDelta(
    val categoryId: Long?,
    val label: String,
    val currentCents: Long,
    val previousCents: Long,
    val deltaPercentage: Double? = null,
)

@Serializable
data class AccountBreakdown(val accountId: Long, val label: String, val totalInCents: Long, val totalOutCents: Long)

@Serializable
data class PushStatus(val enabled: Boolean)

@Serializable
data class PushToken(val fcmToken: String)

/** When the server pushes: a summary ("off", "weekly", "monthly"), and after this many uncategorized transactions. */
@Serializable
data class NotificationSettings(val uncategorizedThreshold: Int, val summaryFrequency: String)
