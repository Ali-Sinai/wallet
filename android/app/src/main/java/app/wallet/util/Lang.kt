package app.wallet.util

import android.content.Context
import android.content.res.Configuration
import java.util.Locale

/**
 * The app's language — Persian (the default) or English, chosen in
 * settings like the web app's language toggle. Kept per device. Changing
 * it recreates the activity, so reading [fa] once per composition is fine.
 */
object Lang {
    @Volatile
    var fa: Boolean = true
        private set

    private const val PREFS = "lang"
    private const val KEY = "lang"

    fun load(context: Context) {
        fa = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY, "fa") != "en"
    }

    fun set(context: Context, persian: Boolean) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(KEY, if (persian) "fa" else "en").apply()
        fa = persian
    }

    /** [base] with its resources in the chosen language — values/ is Persian, values-en/ English. */
    fun wrap(base: Context): Context {
        load(base)
        val locale = if (fa) Locale("fa", "IR") else Locale.ENGLISH
        val config = Configuration(base.resources.configuration)
        config.setLocale(locale)
        config.setLayoutDirection(locale)
        return base.createConfigurationContext(config)
    }
}
