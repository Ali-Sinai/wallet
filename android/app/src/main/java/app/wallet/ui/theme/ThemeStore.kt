package app.wallet.ui.theme

import android.content.Context
import androidx.core.content.edit
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/** The chosen theme, per device — as the web app keeps it in localStorage. */
class ThemeStore(context: Context) {
    private val prefs = context.getSharedPreferences("theme", Context.MODE_PRIVATE)
    private val _theme = MutableStateFlow(
        runCatching { ThemeId.valueOf(prefs.getString(KEY, null) ?: "") }.getOrDefault(ThemeId.CLASSIC),
    )
    val theme: StateFlow<ThemeId> = _theme.asStateFlow()

    fun set(id: ThemeId) {
        prefs.edit { putString(KEY, id.name) }
        _theme.value = id
    }

    private companion object {
        const val KEY = "theme"
    }
}
