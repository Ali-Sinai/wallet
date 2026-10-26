package app.wallet.ui.theme

import androidx.annotation.StringRes
import androidx.compose.runtime.Immutable
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import app.wallet.R

/**
 * The three design languages the web app's themes come in (ThemeFamily in
 * frontend/src/lib/theme.tsx): not just colours but layout, type and shapes.
 *  CLASSIC  Wallet Web/App — tinted cards, bold numbers, the original look
 *  DARK     Wallet Dark — pure black, no cards, thin oversized numbers, mono amounts, text tabs
 *  SOFT     Wallet Soft — grey canvas, white shadowed cards, round buttons, a bank-card stack
 */
enum class Family { CLASSIC, DARK, SOFT }

/**
 * One theme's colours — the `:root[data-theme=…]` blocks in
 * frontend/src/styles.css. "Ink" is the overlay tint for hairlines and
 * wells: white on dark themes, black on light ones.
 */
@Immutable
data class Palette(
    val family: Family,
    val dark: Boolean,
    val background: Color,
    val surface: Color,
    val surface2: Color,
    val surface3: Color,
    val foreground: Color,
    val ink: Color,
    val primary: Color,
    val accent: Color,
    val onPrimary: Color,
    val primaryTint: Color,
    val primaryTint2: Color,
    val income: Color,
    val expense: Color,
    val barIdle: Color,
    val tabBar: Color,
    val hero: Brush,
    val heroBorder: Color,
    /** Soft draws the balance on a dark bank card, so its hero text flips to light. */
    val heroForeground: Color,
    val heroIncome: Color,
    val heroExpense: Color,
    /** Soft's bank-card fills (--soft-card-1..3) and their spend bar (--soft-bar). */
    val cardFills: List<Color> = emptyList(),
    val cardBar: Brush = Brush.linearGradient(listOf(Color.White, Color.White)),
) {
    val muted: Color get() = foreground.copy(alpha = 0.45f)
    val border: Color get() = ink.copy(alpha = 0.07f)
}

enum class ThemeId(@StringRes val label: Int) {
    CLASSIC(R.string.theme_classic),
    DARK_RED(R.string.theme_dark_red),
    DARK_PURPLE(R.string.theme_dark_purple),
    DARK_GREEN(R.string.theme_dark_green),
    SOFT_MONO(R.string.theme_soft_mono),
    SOFT_PURPLE(R.string.theme_soft_purple),
    SOFT_GREEN(R.string.theme_soft_green),
}

private val classic = Palette(
    family = Family.CLASSIC,
    dark = true,
    background = Color(0xFF08090A),
    surface = Color(0xFF0E1110),
    surface2 = Color(0xFF101318),
    surface3 = Color(0xFF141820),
    foreground = Color(0xFFE8EAEC),
    ink = Color.White,
    primary = Color(0xFF0F9B6E),
    accent = Color(0xFF0F9B6E),
    onPrimary = Color(0xFF04120C),
    primaryTint = Color(0xFF101A16),
    primaryTint2 = Color(0xFF12241D),
    income = Color(0xFF3FD39A),
    expense = Color(0xFFFF7A6B),
    barIdle = Color(0xFF1F2B27),
    tabBar = Color(0xFF0A0C0B),
    hero = Brush.linearGradient(listOf(Color(0xFF12241D), Color(0xFF0B120F))),
    heroBorder = Color(0xFF0F9B6E).copy(alpha = 0.28f),
    heroForeground = Color(0xFFE8EAEC),
    heroIncome = Color(0xFF3FD39A),
    heroExpense = Color(0xFFFF7A6B),
)

// Wallet Dark: pure black, one accent.
private fun dark(primary: Long, accent: Long, onPrimary: Long, tint: Long, tint2: Long, expense: Long, income: Long = 0xFFFFFFFF) =
    Palette(
        family = Family.DARK,
        dark = true,
        background = Color.Black,
        surface = Color(0xFF0A0A0A),
        surface2 = Color(0xFF111111),
        surface3 = Color(0xFF161616),
        foreground = Color.White,
        ink = Color.White,
        primary = Color(primary),
        accent = Color(accent),
        onPrimary = Color(onPrimary),
        primaryTint = Color(tint),
        primaryTint2 = Color(tint2),
        income = Color(income),
        expense = Color(expense),
        barIdle = Color(0xFF222222),
        tabBar = Color.Black,
        hero = Brush.linearGradient(listOf(Color(0xFF0A0A0A), Color(0xFF0A0A0A))),
        heroBorder = Color.White.copy(alpha = 0.08f),
        heroForeground = Color.White,
        heroIncome = Color(income),
        heroExpense = Color(expense),
    )

// Wallet Soft: light grey canvas, white cards, a dark hero card.
private fun soft(
    primary: Long,
    tint: Long,
    tint2: Long,
    heroFrom: Long,
    heroTo: Long,
    cards: List<Long>,
    bar: Pair<Long, Long>,
) = Palette(
    family = Family.SOFT,
    dark = false,
    background = Color(0xFFF3F3F3),
    surface = Color.White,
    surface2 = Color.White,
    surface3 = Color(0xFFF3F3F3),
    foreground = Color(0xFF111111),
    ink = Color.Black,
    primary = Color(primary),
    accent = Color(primary),
    onPrimary = Color.White,
    primaryTint = Color(tint),
    primaryTint2 = Color(tint2),
    income = Color(0xFF22A447),
    expense = Color(0xFFE0263A),
    barIdle = Color(0xFFE2E2E2),
    tabBar = Color.White,
    hero = Brush.linearGradient(listOf(Color(heroFrom), Color(heroTo))),
    heroBorder = Color.Transparent,
    heroForeground = Color.White,
    heroIncome = Color(0xFF7EE2A0),
    heroExpense = Color(0xFFFFB0A8),
    cardFills = cards.map(::Color),
    cardBar = Brush.horizontalGradient(listOf(Color(bar.first), Color(bar.second))),
)

fun paletteFor(id: ThemeId): Palette = when (id) {
    ThemeId.CLASSIC -> classic
    ThemeId.DARK_RED -> dark(0xFFFF2A1A, 0xFFFF2A1A, 0xFF000000, 0xFF1A0705, 0xFF1F0806, expense = 0xFFFF2A1A)
    ThemeId.DARK_PURPLE -> dark(0xFF8A3FFC, 0xFF9D5CFF, 0xFFFFFFFF, 0xFF120A1F, 0xFF170D27, expense = 0xFF9D5CFF)
    // Green marks money in here, so money out stays the design's red.
    ThemeId.DARK_GREEN -> dark(0xFF1F8A4C, 0xFF34B06A, 0xFFFFFFFF, 0xFF07140C, 0xFF0A1C11, expense = 0xFFFF2A1A, income = 0xFF34B06A)
    ThemeId.SOFT_MONO -> soft(
        0xFF111111, 0xFFECECEC, 0xFFE6E6E6, 0xFF1B1B1D, 0xFF1B1B1D,
        cards = listOf(0xFF1B1B1D, 0xFF2A3F9E, 0xFFB8402C),
        bar = 0xFFE8352A to 0xFFF5A623,
    )
    ThemeId.SOFT_PURPLE -> soft(
        0xFF8A3FFC, 0xFFF1E9FF, 0xFFEBDFFF, 0xFF4C1D95, 0xFF8A3FFC,
        cards = listOf(0xFF1B1B1D, 0xFF4C1D95, 0xFF8A3FFC),
        bar = 0xFF8A3FFC to 0xFFD6B8FF,
    )
    ThemeId.SOFT_GREEN -> soft(
        0xFF14532D, 0xFFE5F2EA, 0xFFDCEDE2, 0xFF0F3D22, 0xFF1F7A4D,
        cards = listOf(0xFF1B1B1D, 0xFF14532D, 0xFF1F7A4D),
        bar = 0xFF1F7A4D to 0xFF9BE3B4,
    )
}
