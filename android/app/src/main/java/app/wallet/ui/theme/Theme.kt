package app.wallet.ui.theme

import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.sp
import app.wallet.R

// The "classic" palette from frontend/src/styles.css (:root).
object WalletColors {
    val Background = Color(0xFF08090A)
    val Surface = Color(0xFF0E1110)
    val Surface2 = Color(0xFF101318)
    val Surface3 = Color(0xFF141820)
    val Foreground = Color(0xFFE8EAEC)
    val Muted = Color(0x73E8EAEC) // fg at 45%
    val Primary = Color(0xFF0F9B6E)
    val OnPrimary = Color(0xFF04120C)
    val PrimaryTint = Color(0xFF101A16)
    val Income = Color(0xFF3FD39A)
    val Expense = Color(0xFFFF7A6B)
    val Border = Color(0x12FFFFFF) // ink at 7%
}

val Rooyin = FontFamily(
    Font(R.font.rooyin_regular, FontWeight.Normal),
    Font(R.font.rooyin_bold, FontWeight.Bold),
)

private val colors = darkColorScheme(
    primary = WalletColors.Primary,
    onPrimary = WalletColors.OnPrimary,
    primaryContainer = WalletColors.PrimaryTint,
    onPrimaryContainer = WalletColors.Income,
    background = WalletColors.Background,
    onBackground = WalletColors.Foreground,
    surface = WalletColors.Surface,
    onSurface = WalletColors.Foreground,
    surfaceVariant = WalletColors.Surface2,
    onSurfaceVariant = WalletColors.Muted,
    surfaceContainer = WalletColors.Surface2,
    surfaceContainerHigh = WalletColors.Surface3,
    outline = WalletColors.Border,
    outlineVariant = WalletColors.Border,
    error = WalletColors.Expense,
)

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
 * The app is Persian-first, so layout is right-to-left whatever the phone's
 * own language is. Letter spacing is off: tracking breaks joined Persian script.
 */
@Composable
fun WalletTheme(content: @Composable () -> Unit) {
    MaterialTheme(colorScheme = colors, typography = typography) {
        CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Rtl) {
            // Surface, not a plain background, so text defaults to the foreground colour.
            Surface(Modifier.fillMaxSize(), color = WalletColors.Background, content = content)
        }
    }
}
