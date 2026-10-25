package app.wallet.data

import okhttp3.HttpUrl
import okhttp3.HttpUrl.Companion.toHttpUrlOrNull

class AuthRepository(
    private val server: ServerStore,
    private val client: ApiClient,
    private val cookies: PersistentCookieJar,
) {
    val serverUrl: HttpUrl? get() = server.baseUrl?.toHttpUrlOrNull()

    /** Who the saved session belongs to, or null when there is no valid session. */
    suspend fun currentUser(): String? {
        val url = serverUrl ?: return null
        return try {
            client.call { client.forServer(url).me() }.username
        } catch (e: ApiError) {
            if (e.status == 401) null else throw e
        }
    }

    suspend fun login(url: HttpUrl, username: String, password: String): String {
        if (url != serverUrl) cookies.clear()
        val me = client.call { client.forServer(url).login(LoginRequest(username, password)) }
        server.baseUrl = url.toString()
        return me.username
    }

    suspend fun logout() {
        serverUrl?.let { url ->
            // Best effort: the local cookie goes either way, which is what logs us out.
            runCatching { client.call { client.forServer(url).logout() } }
        }
        cookies.clear()
    }
}
