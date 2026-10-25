package app.wallet.ui.theme

import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.ReadOnlyComposable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.sp
import app.wallet.R
import app.wallet.util.Lang

private val LocalPalette = staticCompositionLocalOf { paletteFor(ThemeId.CLASSIC) }

/** The active theme's colours. */
val WalletColors: Palette
    @Composable @ReadOnlyComposable
    get() = LocalPalette.current

val Rooyin = FontFamily(
    Font(R.font.rooyin_regular, FontWeight.Normal),
    Font(R.font.rooyin_bold, FontWeight.Bold),
)

private fun Palette.colorScheme() = if (dark) {
    darkColorScheme(
        primary = primary,
        onPrimary = onPrimary,
        primaryContainer = primaryTint,
        onPrimaryContainer = accent,
        secondaryContainer = primaryTint2,
        onSecondaryContainer = foreground,
        background = background,
        onBackground = foreground,
        surface = surface,
        onSurface = foreground,
        surfaceVariant = surface2,
        onSurfaceVariant = muted,
        surfaceContainer = surface2,
        surfaceContainerHigh = surface3,
        surfaceContainerLow = surface,
        outline = ink.copy(alpha = 0.16f),
        outlineVariant = border,
        error = expense,
    )
} else {
    lightColorScheme(
        primary = primary,
        onPrimary = onPrimary,
        primaryContainer = primaryTint,
        onPrimaryContainer = primary,
        secondaryContainer = primaryTint2,
        onSecondaryContainer = foreground,
        background = background,
        onBackground = foreground,
        surface = surface,
        onSurface = foreground,
        surfaceVariant = surface3,
        onSurfaceVariant = muted,
        surfaceContainer = surface,
        surfaceContainerHigh = surface3,
        surfaceContainerLow = surface,
        outline = ink.copy(alpha = 0.16f),
        outlineVariant = border,
        error = expense,
    )
}

private val typography = Typography().let { base ->
    fun TextStyle.rooyin() = copy(fontFamily = Rooyin, letterSpacing = 0.sp)
    Typography(
        displayLarge = base.displayLarge.rooyin(),
        displayMedium = base.displayMedium.rooyin(),
        displaySmall = base.displaySmall.rooyin(),
        headlineLarge = base.headlineLarge.rooyin(),
        headlineMedium = base.headlineMedium.rooyin(),
        headlineSmall = base.headlineSmall.rooyin(),
        titleLarge = base.titleLarge.rooyin(),
        titleMedium = base.titleMedium.rooyin(),
        titleSmall = base.titleSmall.rooyin(),
        bodyLarge = base.bodyLarge.rooyin(),
        bodyMedium = base.bodyMedium.rooyin(),
        bodySmall = base.bodySmall.rooyin(),
        labelLarge = base.labelLarge.rooyin(),
        labelMedium = base.labelMedium.rooyin(),
        labelSmall = base.labelSmall.rooyin(),
    )
}

/**
 * Layout follows the app's own language (right-to-left in Persian), not the
 * phone's. Letter spacing is off: tracking breaks joined Persian script.
 */
@Composable
fun WalletTheme(theme: ThemeId = ThemeId.CLASSIC, content: @Composable () -> Unit) {
    val palette = paletteFor(theme)
    CompositionLocalProvider(LocalPalette provides palette) {
        MaterialTheme(colorScheme = palette.colorScheme(), typography = typography) {
            CompositionLocalProvider(LocalLayoutDirection provides if (Lang.fa) LayoutDirection.Rtl else LayoutDirection.Ltr) {
                // Surface, not a plain background, so text defaults to the foreground colour.
                Surface(Modifier.fillMaxSize(), color = palette.background, content = content)
            }
        }
    }
}
