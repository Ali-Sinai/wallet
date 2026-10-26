package app.wallet.data

import app.wallet.sms.SmsSettings
import okhttp3.HttpUrl
import okhttp3.HttpUrl.Companion.toHttpUrlOrNull

class AuthRepository(
    private val server: ServerStore,
    private val client: ApiClient,
    private val cookies: PersistentCookieJar,
    private val sms: SmsSettings,
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
        signedIn(url, me.username)
        return me.username
    }

    /**
     * Whether [url] is a wallet server that takes new accounts. A server too
     * old to know about sign-up answers 404, which comes back as false too:
     * either way there is no form worth showing.
     */
    suspend fun signupOpen(url: HttpUrl): Boolean = try {
        client.call { client.forServer(url).signupStatus() }.enabled
    } catch (e: ApiError) {
        if (e.status == 404) false else throw e
    }

    /** Creates the account and signs it in — the server sets the session cookie, as on login. */
    suspend fun register(url: HttpUrl, username: String, password: String): String {
        if (url != serverUrl) cookies.clear()
        val me = client.call { client.forServer(url).register(LoginRequest(username, password)) }
        signedIn(url, me.username)
        return me.username
    }

    suspend fun logout() {
        serverUrl?.let { url ->
            // Best effort: the local cookie goes either way, which is what logs us out.
            runCatching { client.call { client.forServer(url).logout() } }
        }
        cookies.clear()
    }

    /**
     * Remembers the server, and forgets the SMS webhook token when someone
     * else signs in. The token names its owner on the server, so keeping it
     * would send this phone's bank messages to the previous account's inbox.
     * Signing back in as the same person keeps it.
     */
    private fun signedIn(url: HttpUrl, username: String) {
        server.baseUrl = url.toString()
        val account = "$url $username"
        if (server.lastAccount != null && server.lastAccount != account) sms.token = null
        server.lastAccount = account
    }
}
