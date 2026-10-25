package app.wallet.data

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
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
    ): List<Transaction>

    @POST("api/transactions")
    suspend fun createTransaction(@Body body: TransactionIn): Transaction

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

    @POST("api/settings/webhook-token/rotate")
    suspend fun rotateWebhookToken(): WebhookToken
}

@Serializable
data class LoginRequest(val username: String, val password: String)

@Serializable
data class MeResponse(val username: String)

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
    val kind: String = "transaction",
    val enabled: Boolean = true,
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
