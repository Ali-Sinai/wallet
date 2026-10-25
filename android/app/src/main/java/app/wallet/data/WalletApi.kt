package app.wallet.data

import kotlinx.serialization.Serializable
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST

/** The backend's REST API (backend/app/routers). Paths are relative to the server's origin. */
interface WalletApi {
    @POST("api/auth/login")
    suspend fun login(@Body body: LoginRequest): MeResponse

    @POST("api/auth/logout")
    suspend fun logout()

    @GET("api/auth/me")
    suspend fun me(): MeResponse
}

@Serializable
data class LoginRequest(val username: String, val password: String)

@Serializable
data class MeResponse(val username: String)
