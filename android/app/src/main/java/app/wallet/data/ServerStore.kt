package app.wallet.data

import android.content.Context
import androidx.core.content.edit
import okhttp3.HttpUrl
import okhttp3.HttpUrl.Companion.toHttpUrlOrNull

/** Remembers which backend this install talks to. */
class ServerStore(context: Context) {
    private val prefs = context.getSharedPreferences("server", Context.MODE_PRIVATE)

    var baseUrl: String?
        get() = prefs.getString(KEY_BASE_URL, null)
        set(value) = prefs.edit { putString(KEY_BASE_URL, value) }

    companion object {
        private const val KEY_BASE_URL = "base_url"

        /**
         * Turns what someone types into the server field into a base URL, or
         * null if it isn't one. An address without a scheme gets https://,
         * except a bare IP or localhost — those are a server on the home
         * network, which runs plain http (see usesCleartextTraffic).
         */
        fun normalize(input: String): HttpUrl? {
            val trimmed = input.trim().trimEnd('/')
            if (trimmed.isEmpty()) return null
            val withScheme = if ("://" in trimmed) {
                trimmed
            } else {
                val host = trimmed.substringBefore('/').substringBefore(':')
                val local = host == "localhost" || host.all { it.isDigit() || it == '.' }
                (if (local) "http://" else "https://") + trimmed
            }
            val url = withScheme.toHttpUrlOrNull() ?: return null
            // The API lives at <origin>/api, so anything after the origin is noise.
            return url.newBuilder().encodedPath("/").query(null).fragment(null).build()
        }
    }
}
