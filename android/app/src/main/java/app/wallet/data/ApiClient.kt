package app.wallet.data

import java.io.IOException
import java.util.concurrent.TimeUnit
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.serialization.ExperimentalSerializationApi
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonNamingStrategy
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.jsonObject
import okhttp3.HttpUrl
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import retrofit2.HttpException
import retrofit2.Retrofit
import retrofit2.converter.kotlinx.serialization.asConverterFactory

/** A failed API call: [status] is the HTTP status, or null when the server was never reached. */
class ApiError(val status: Int?, message: String?) : Exception(message)

class ApiClient(cookieJar: PersistentCookieJar) {
    @OptIn(ExperimentalSerializationApi::class)
    val json = Json {
        ignoreUnknownKeys = true
        explicitNulls = false
        namingStrategy = JsonNamingStrategy.SnakeCase
    }

    private val _unauthorized = MutableSharedFlow<Unit>(extraBufferCapacity = 1)

    /** Fires whenever the server answers 401: the session cookie is gone or expired. */
    val unauthorized: SharedFlow<Unit> = _unauthorized

    /** Also used directly by the SMS upload worker, which talks to the token-auth webhook. */
    val http: OkHttpClient = OkHttpClient.Builder()
        .cookieJar(cookieJar)
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .build()

    private var cached: Pair<HttpUrl, WalletApi>? = null

    /** The API for [baseUrl]; rebuilt only when the server changes. */
    @Synchronized
    fun forServer(baseUrl: HttpUrl): WalletApi {
        cached?.let { (url, api) -> if (url == baseUrl) return api }
        val api = Retrofit.Builder()
            .baseUrl(baseUrl)
            .client(http)
            .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
            .build()
            .create(WalletApi::class.java)
        cached = baseUrl to api
        return api
    }

    /** Runs [block], turning every failure into an [ApiError] carrying the server's `detail`. */
    suspend fun <T> call(block: suspend () -> T): T = try {
        block()
    } catch (e: HttpException) {
        if (e.code() == 401) _unauthorized.tryEmit(Unit)
        throw ApiError(e.code(), e.response()?.errorBody()?.string()?.let(::detailOf))
    } catch (e: IOException) {
        throw ApiError(null, e.message)
    } catch (e: kotlinx.serialization.SerializationException) {
        // A 200 that isn't our JSON — usually the address points at some other site.
        throw ApiError(null, e.message)
    }

    /**
     * Error bodies look like `{"detail": ..., "request_body": ...}` (see
     * backend/app/errors.py). `detail` is a string for our own errors and a
     * list of `{msg: ...}` for validation errors.
     */
    private fun detailOf(body: String): String? = runCatching {
        when (val detail = json.parseToJsonElement(body).jsonObject["detail"]) {
            is JsonPrimitive -> detail.contentOrNull
            is JsonArray -> detail.joinToString("\n") {
                ((it as? JsonObject)?.get("msg") as? JsonPrimitive)?.contentOrNull ?: it.toString()
            }
            else -> null
        }
    }.getOrNull()
}
