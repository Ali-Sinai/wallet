package app.wallet.data

import android.content.Context
import androidx.core.content.edit
import okhttp3.Cookie
import okhttp3.CookieJar
import okhttp3.HttpUrl
import okhttp3.HttpUrl.Companion.toHttpUrlOrNull

/**
 * Keeps the backend's `wallet_session` cookie across app restarts, so the
 * server's existing cookie login works unchanged — the same way it does in
 * the browser.
 */
class PersistentCookieJar(context: Context) : CookieJar {
    private val prefs = context.getSharedPreferences("cookies", Context.MODE_PRIVATE)
    private val cookies = mutableListOf<Cookie>()

    init {
        for (line in prefs.getStringSet(KEY, emptySet()).orEmpty()) {
            val (url, header) = line.split('\t', limit = 2).takeIf { it.size == 2 } ?: continue
            val parsed = url.toHttpUrlOrNull()?.let { Cookie.parse(it, header) } ?: continue
            cookies += parsed
        }
        dropExpired()
    }

    @Synchronized
    override fun saveFromResponse(url: HttpUrl, cookies: List<Cookie>) {
        for (cookie in cookies) {
            this.cookies.removeAll { it.name == cookie.name && it.domain == cookie.domain && it.path == cookie.path }
            this.cookies += cookie
        }
        dropExpired()
        persist()
    }

    @Synchronized
    override fun loadForRequest(url: HttpUrl): List<Cookie> {
        dropExpired()
        return cookies.filter { it.matches(url) }
    }

    @Synchronized
    fun clear() {
        cookies.clear()
        persist()
    }

    // A cookie with an expiry of now or earlier is the server deleting it (logout).
    private fun dropExpired() {
        val now = System.currentTimeMillis()
        cookies.removeAll { it.expiresAt <= now }
    }

    private fun persist() {
        // Only persistent cookies survive a restart, as in a browser.
        val lines = cookies.filter { it.persistent }.map { cookie ->
            val scheme = if (cookie.secure) "https" else "http"
            "$scheme://${cookie.domain}${cookie.path}\t$cookie"
        }
        prefs.edit { putStringSet(KEY, lines.toSet()) }
    }

    private companion object {
        const val KEY = "cookies"
    }
}
