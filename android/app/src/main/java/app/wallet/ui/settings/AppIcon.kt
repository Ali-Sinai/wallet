package app.wallet.ui.settings

import android.content.ComponentName
import android.content.Context
import android.content.pm.PackageManager
import androidx.annotation.DrawableRes
import androidx.annotation.StringRes
import app.wallet.R

/**
 * The launcher icons from the Liquid Glass set. Each is an <activity-alias> in
 * AndroidManifest.xml; choosing one enables its alias and disables the rest,
 * so the package manager itself remembers the choice.
 */
enum class AppIcon(val alias: String, @DrawableRes val preview: Int, @StringRes val label: Int) {
    DEFAULT("LauncherDefault", R.drawable.app_icon_default, R.string.app_icon_default),
    DARK("LauncherDark", R.drawable.app_icon_dark, R.string.app_icon_dark),
    CLEAR("LauncherClear", R.drawable.app_icon_clear, R.string.app_icon_clear),
    TINTED("LauncherTinted", R.drawable.app_icon_tinted, R.string.app_icon_tinted),
    TINTED_RED("LauncherTintedRed", R.drawable.app_icon_tinted_red, R.string.app_icon_tinted_red),
    ;

    private fun component(context: Context) = ComponentName(context, "app.wallet.$alias")

    companion object {
        fun current(context: Context): AppIcon {
            val pm = context.packageManager
            // DEFAULT is the one enabled in the manifest, so "default state" means enabled for it only.
            return entries.firstOrNull { icon ->
                when (pm.getComponentEnabledSetting(icon.component(context))) {
                    PackageManager.COMPONENT_ENABLED_STATE_ENABLED -> true
                    PackageManager.COMPONENT_ENABLED_STATE_DEFAULT -> icon == DEFAULT
                    else -> false
                }
            } ?: DEFAULT
        }

        fun set(context: Context, chosen: AppIcon) {
            val pm = context.packageManager
            // Enable the new alias first so the app never has zero launcher entries.
            val ordered = listOf(chosen) + entries.filter { it != chosen }
            for (icon in ordered) {
                pm.setComponentEnabledSetting(
                    icon.component(context),
                    if (icon == chosen) PackageManager.COMPONENT_ENABLED_STATE_ENABLED
                    else PackageManager.COMPONENT_ENABLED_STATE_DISABLED,
                    PackageManager.DONT_KILL_APP,
                )
            }
        }
    }
}
