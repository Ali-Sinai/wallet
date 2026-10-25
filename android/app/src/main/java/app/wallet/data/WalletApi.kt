package app.wallet.data

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
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
