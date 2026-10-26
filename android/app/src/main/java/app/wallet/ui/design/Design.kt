package app.wallet.ui.design

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.ReadOnlyComposable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.lerp
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.em
import androidx.compose.ui.unit.sp
import app.wallet.ui.theme.Family
import app.wallet.ui.theme.WalletColors
import app.wallet.util.Fmt
import app.wallet.util.Lang

/*
 * The building blocks each design draws its screens from, after
 * frontend/src/designs (DarkShell, SoftShell, Page, buttons, shared).
 * Screens ask for a block; the block draws it in the active theme's family.
 */

/** The active theme's design language. */
val family: Family
    @Composable @ReadOnlyComposable
    get() = WalletColors.family

/** Wallet Dark's amounts and labels are set in a mono face. */
val Mono: FontFamily = FontFamily.Monospace

/** Letter spacing, which Persian can't take (it breaks joined script) — --track in styles.css. */
fun track(em: Float): TextUnit = if (Lang.fa) 0.sp else em.em

/** The design's side margin: Dark 28, Soft 20, classic 22. */
val gutter: Dp
    @Composable @ReadOnlyComposable
    get() = when (family) {
        Family.DARK -> 28.dp
        Family.SOFT -> 20.dp
        Family.CLASSIC -> 22.dp
    }

/** Secondary text: Dark's 40% and Soft's 55% foreground; classic's 45%. */
val faint: Color
    @Composable @ReadOnlyComposable
    get() = WalletColors.foreground.copy(
        alpha = when (family) {
            Family.DARK -> 0.4f
            Family.SOFT -> 0.55f
            Family.CLASSIC -> 0.45f
        },
    )

/** Soft's tinted circle behind an icon or letter: the colour at 14% over the card. */
@Composable
fun tint(color: Color): Color = lerp(WalletColors.surface, color, 0.14f)

/** Wallet Dark's small-caps label ("BALANCE · TOMAN"). */
@Composable
fun darkLabelStyle(color: Color = WalletColors.foreground.copy(alpha = 0.47f)) = TextStyle(
    fontFamily = Mono,
    fontSize = 11.sp,
    letterSpacing = track(0.16f),
    color = color,
)

@Composable
fun DarkLabel(text: String, modifier: Modifier = Modifier, color: Color = WalletColors.foreground.copy(alpha = 0.47f)) {
    Text(text.uppercase(), modifier, style = darkLabelStyle(color), maxLines = 1)
}

/** An icon that points somewhere (back, chevron, arrow): mirrored when reading right to left. */
@Composable
fun DirIcon(icon: ImageVector, size: Dp, tint: Color, contentDescription: String? = null) {
    val rtl = LocalLayoutDirection.current == LayoutDirection.Rtl
    Icon(
        icon,
        contentDescription,
        Modifier
            .size(size)
            .graphicsLayer { scaleX = if (rtl) -1f else 1f },
        tint = tint,
    )
}

/**
 * The screen's title row, in each design's form: classic bold and
 * start-aligned; Dark centred and letter-spaced; Soft centred between round
 * buttons. [left] and [right] are the optional slots either side.
 */
@Composable
fun ScreenTitle(
    title: String,
    left: (@Composable () -> Unit)? = null,
    right: (@Composable () -> Unit)? = null,
) {
    when (family) {
        Family.CLASSIC -> Row(
            Modifier
                .fillMaxWidth()
                .padding(start = 8.dp, end = 8.dp, top = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            left?.invoke() ?: Box(Modifier.size(14.dp))
            Text(title, Modifier.weight(1f), fontSize = 22.sp, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
            right?.invoke()
        }
        Family.DARK, Family.SOFT -> Box(
            Modifier
                .fillMaxWidth()
                .padding(horizontal = gutter)
                .padding(top = if (family == Family.DARK) 16.dp else 12.dp)
                .height(48.dp),
        ) {
            Box(Modifier.align(Alignment.CenterStart)) { left?.invoke() }
            Text(
                if (family == Family.DARK) title.uppercase() else title,
                Modifier
                    .align(Alignment.Center)
                    .widthIn(max = 220.dp),
                fontSize = if (family == Family.DARK) 15.sp else 16.sp,
                fontWeight = if (family == Family.DARK) FontWeight.Medium else FontWeight.Bold,
                letterSpacing = if (family == Family.DARK) track(0.2f) else 0.sp,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            Box(Modifier.align(Alignment.CenterEnd)) { right?.invoke() }
        }
    }
}

/** A section heading with an optional trailing action ("see all"). */
@Composable
fun SectionHeader(title: String, modifier: Modifier = Modifier, right: (@Composable () -> Unit)? = null) {
    Row(modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        Box(Modifier.weight(1f)) {
            when (family) {
                Family.DARK -> DarkLabel(title)
                Family.SOFT -> Text(title, fontSize = 17.sp, fontWeight = FontWeight.Bold)
                Family.CLASSIC -> Text(title, fontSize = 11.5.sp, color = faint)
            }
        }
        right?.invoke()
    }
}

/** "See all", in the design's quiet link style. */
@Composable
fun SeeAll(text: String, onClick: () -> Unit) {
    Text(
        text,
        Modifier
            .clip(RoundedCornerShape(8.dp))
            .clickable(onClick = onClick)
            .padding(horizontal = 6.dp, vertical = 4.dp),
        fontSize = if (family == Family.SOFT) 12.5.sp else 12.sp,
        color = if (family == Family.CLASSIC) WalletColors.primary else faint,
    )
}

/** Soft's white card: rounded 22, a soft shadow. */
fun Modifier.softCard(surface: Color, radius: Dp = 22.dp): Modifier = this
    .shadow(10.dp, RoundedCornerShape(radius), ambientColor = Color.Black.copy(alpha = 0.06f), spotColor = Color.Black.copy(alpha = 0.10f))
    .clip(RoundedCornerShape(radius))
    .background(surface)

/**
 * A grouped block: a tinted card in classic, a white shadowed card in Soft,
 * and in Dark — which draws no cards — the content alone under a hairline.
 */
@Composable
fun DesignCard(modifier: Modifier = Modifier, padding: Dp = 16.dp, content: @Composable ColumnScope.() -> Unit) {
    val p = WalletColors
    val m = when (family) {
        Family.CLASSIC -> modifier
            .clip(RoundedCornerShape(18.dp))
            .background(p.surface)
            .padding(padding)
        Family.SOFT -> modifier
            .softCard(p.surface)
            .padding(padding)
        Family.DARK -> modifier
            .drawBehind { drawLine(p.ink.copy(alpha = 0.12f), Offset.Zero, Offset(size.width, 0f), 1.dp.toPx()) }
            .padding(top = 18.dp, bottom = 6.dp)
    }
    Column(m, verticalArrangement = Arrangement.spacedBy(10.dp), content = content)
}

/** Wallet Dark's big thin number; long amounts shrink to fit. */
@Composable
fun BigNumber(text: String, modifier: Modifier = Modifier, size: TextUnit = 56.sp, color: Color = Color.Unspecified) {
    val scaled = if (text.length > 9) size * (9f / text.length).coerceAtLeast(0.6f) else size
    Text(
        text,
        modifier,
        fontSize = scaled,
        // Rooyin has no light weight; in English the system face draws the design's thin numerals.
        fontFamily = if (Lang.fa) null else FontFamily.Default,
        fontWeight = FontWeight.Light,
        letterSpacing = track(-0.03f),
        color = color,
        maxLines = 1,
    )
}

/** Soft's round icon button, with an optional count badge. */
@Composable
fun RoundButton(
    icon: ImageVector,
    contentDescription: String?,
    onClick: () -> Unit,
    size: Dp = 46.dp,
    badge: Int = 0,
    mirrored: Boolean = false,
) {
    Box {
        Box(
            Modifier
                .size(size)
                .softCard(WalletColors.surface, radius = size / 2)
                .clickable(onClick = onClick),
            contentAlignment = Alignment.Center,
        ) {
            if (mirrored) DirIcon(icon, size * 0.43f, WalletColors.foreground, contentDescription)
            else Icon(icon, contentDescription, Modifier.size(size * 0.43f), tint = WalletColors.foreground)
        }
        if (badge > 0) {
            Box(
                Modifier
                    .align(Alignment.TopEnd)
                    .offset(x = 2.dp, y = (-2).dp)
                    .height(18.dp)
                    .widthIn(min = 18.dp)
                    .clip(RoundedCornerShape(9.dp))
                    .background(WalletColors.primary)
                    .padding(horizontal = 5.dp),
                contentAlignment = Alignment.Center,
            ) {
                Text(Fmt.digits(badge), fontSize = 10.sp, fontWeight = FontWeight.Bold, color = WalletColors.onPrimary)
            }
        }
    }
}

/** A plain icon button for Dark's title slots. */
@Composable
fun BareIconButton(icon: ImageVector, contentDescription: String?, onClick: () -> Unit, mirrored: Boolean = false, size: Dp = 22.dp) {
    Box(
        Modifier
            .clip(CircleShape)
            .clickable(onClick = onClick)
            .padding(6.dp),
    ) {
        if (mirrored) DirIcon(icon, size, WalletColors.foreground, contentDescription)
        else Icon(icon, contentDescription, Modifier.size(size), tint = WalletColors.foreground)
    }
}

/** The title-slot button in the active design: Soft's round one, otherwise bare. */
@Composable
fun TitleButton(icon: ImageVector, contentDescription: String?, onClick: () -> Unit, mirrored: Boolean = false, badge: Int = 0) {
    if (family == Family.SOFT) RoundButton(icon, contentDescription, onClick, badge = badge, mirrored = mirrored)
    else BareIconButton(icon, contentDescription, onClick, mirrored)
}

@Composable
private fun Busy(color: Color) = CircularProgressIndicator(Modifier.size(18.dp), strokeWidth = 2.dp, color = color)

/** Wallet Dark's call to action: an accent pill, label at one end and an arrow at the other. */
@Composable
fun PillButton(text: String, onClick: () -> Unit, modifier: Modifier = Modifier, enabled: Boolean = true, busy: Boolean = false) {
    val p = WalletColors
    Row(
        modifier
            .fillMaxWidth()
            .height(56.dp)
            .clip(RoundedCornerShape(28.dp))
            .background(p.primary.copy(alpha = if (enabled) 1f else 0.5f))
            .clickable(enabled = enabled && !busy, onClick = onClick)
            .padding(horizontal = 22.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(Modifier.weight(1f)) {
            if (busy) Busy(p.onPrimary) else Text(text, fontSize = 15.sp, fontWeight = FontWeight.Medium, color = p.onPrimary)
        }
        DirIcon(LineIcons.Arrow, 20.dp, p.onPrimary)
    }
}

/** Wallet Soft's bottom bar: a total on one side, the accent action on the other. */
@Composable
fun TotalBar(
    label: String,
    value: String,
    action: String,
    onAction: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    busy: Boolean = false,
) {
    val p = WalletColors
    Row(
        modifier
            .fillMaxWidth()
            .softCard(p.surface, radius = 30.dp)
            .padding(start = 24.dp, end = 16.dp, top = 16.dp, bottom = 16.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Column(Modifier.weight(1f)) {
            Text(label, fontSize = 12.sp, color = faint, maxLines = 1)
            Text(value, fontSize = 18.sp, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
        }
        Box(
            Modifier
                .height(52.dp)
                .clip(RoundedCornerShape(26.dp))
                .background(p.primary.copy(alpha = if (enabled) 1f else 0.5f))
                .clickable(enabled = enabled && !busy, onClick = onAction)
                .padding(horizontal = 26.dp),
            contentAlignment = Alignment.Center,
        ) {
            if (busy) Busy(p.onPrimary) else Text(action, fontSize = 14.sp, fontWeight = FontWeight.Medium, color = p.onPrimary)
        }
    }
}

/**
 * The main call to action of a screen, in the design's shape: classic's
 * filled button, Dark's pill with an arrow, Soft's total bar (with [label]
 * and [value] when given).
 */
@Composable
fun PrimaryAction(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    busy: Boolean = false,
    label: String? = null,
    value: String? = null,
) {
    when (family) {
        Family.DARK -> PillButton(text, onClick, modifier, enabled, busy)
        Family.SOFT -> if (label != null && value != null) {
            TotalBar(label, value, text, onClick, modifier, enabled, busy)
        } else {
            SoftPrimary(text, onClick, modifier, enabled, busy)
        }
        Family.CLASSIC -> androidx.compose.material3.Button(
            onClick = onClick,
            enabled = enabled && !busy,
            shape = RoundedCornerShape(14.dp),
            modifier = modifier
                .fillMaxWidth()
                .height(52.dp),
        ) {
            if (busy) Busy(WalletColors.onPrimary) else Text(text, fontWeight = FontWeight.Bold)
        }
    }
}

@Composable
private fun SoftPrimary(text: String, onClick: () -> Unit, modifier: Modifier, enabled: Boolean, busy: Boolean) {
    val p = WalletColors
    Box(
        modifier
            .fillMaxWidth()
            .height(54.dp)
            .shadow(8.dp, RoundedCornerShape(27.dp), ambientColor = p.primary.copy(alpha = 0.3f), spotColor = p.primary.copy(alpha = 0.35f))
            .clip(RoundedCornerShape(27.dp))
            .background(p.primary.copy(alpha = if (enabled) 1f else 0.5f))
            .clickable(enabled = enabled && !busy, onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        if (busy) Busy(p.onPrimary) else Text(text, fontSize = 15.sp, fontWeight = FontWeight.Medium, color = p.onPrimary)
    }
}

/** One choice in a [Choices] row. */
data class Choice<K>(val key: K, val label: String)

/**
 * A single-choice row in the design's form: classic's filter chips, Dark's
 * mono text tabs with an accent underline, Soft's segmented pill (or, with
 * [scroll], a row of pill chips).
 */
@Composable
fun <K> Choices(
    items: List<Choice<K>>,
    selected: K,
    onSelect: (K) -> Unit,
    modifier: Modifier = Modifier,
    scroll: Boolean = false,
) {
    when (family) {
        Family.CLASSIC -> Row(
            modifier.horizontalScroll(rememberScrollState()),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            for (it in items) {
                androidx.compose.material3.FilterChip(
                    selected = it.key == selected,
                    onClick = { onSelect(it.key) },
                    label = { Text(it.label) },
                )
            }
        }
        Family.DARK -> TextTabs(items, selected, onSelect, modifier)
        Family.SOFT -> if (scroll) PillChips(items, selected, onSelect, modifier) else Segmented(items, selected, onSelect, modifier)
    }
}

/** Wallet Dark: mono text tabs, the chosen one underlined in the accent. */
@Composable
fun <K> TextTabs(items: List<Choice<K>>, selected: K, onSelect: (K) -> Unit, modifier: Modifier = Modifier) {
    val p = WalletColors
    Row(modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(22.dp)) {
        for (it in items) {
            val active = it.key == selected
            Text(
                it.label.uppercase(),
                Modifier
                    .clickable { onSelect(it.key) }
                    .drawBehind {
                        if (active) {
                            val y = size.height - 0.75.dp.toPx()
                            drawLine(p.accent, Offset(0f, y), Offset(size.width, y), 1.5.dp.toPx())
                        }
                    }
                    .padding(vertical = 6.dp),
                style = darkLabelStyle(if (active) p.foreground else p.foreground.copy(alpha = 0.4f)),
                maxLines = 1,
            )
        }
    }
}

/** Wallet Soft: a white pill split into segments; the chosen one takes the accent. */
@Composable
fun <K> Segmented(items: List<Choice<K>>, selected: K, onSelect: (K) -> Unit, modifier: Modifier = Modifier) {
    val p = WalletColors
    Row(
        modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(26.dp))
            .background(p.surface)
            .padding(5.dp),
    ) {
        for (it in items) {
            val active = it.key == selected
            Box(
                Modifier
                    .weight(1f)
                    .clip(RoundedCornerShape(21.dp))
                    .background(if (active) p.primary else Color.Transparent)
                    .clickable { onSelect(it.key) }
                    .padding(vertical = 10.dp),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    it.label,
                    fontSize = 13.sp,
                    fontWeight = if (active) FontWeight.Medium else FontWeight.Normal,
                    color = if (active) p.onPrimary else faint,
                    maxLines = 1,
                )
            }
        }
    }
}

/** Wallet Soft: a scrolling row of pill chips. */
@Composable
fun <K> PillChips(items: List<Choice<K>>, selected: K, onSelect: (K) -> Unit, modifier: Modifier = Modifier) {
    val p = WalletColors
    Row(
        modifier
            .horizontalScroll(rememberScrollState())
            .padding(vertical = 6.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        for (it in items) {
            val active = it.key == selected
            Text(
                it.label,
                Modifier
                    .then(if (active) Modifier.clip(RoundedCornerShape(99.dp)).background(p.primary) else Modifier.softCard(p.surface, 99.dp))
                    .clickable { onSelect(it.key) }
                    .padding(horizontal = 14.dp, vertical = 8.dp),
                fontSize = 12.5.sp,
                color = if (active) p.onPrimary else faint,
                maxLines = 1,
            )
        }
    }
}

/** Soft's avatar: a letter or initials on a tinted circle. */
@Composable
fun SoftAvatar(text: String, color: Color, size: Dp = 46.dp) {
    Box(
        Modifier
            .size(size)
            .clip(CircleShape)
            .background(tint(color)),
        contentAlignment = Alignment.Center,
    ) {
        Text(text, color = color, fontSize = if (size > 44.dp) 15.sp else 14.sp, fontWeight = FontWeight.Bold, maxLines = 1)
    }
}

/** Soft's income/expense chip: tinted icon circle, value, label. */
@Composable
fun StatChip(label: String, value: String, color: Color, icon: ImageVector, modifier: Modifier = Modifier) {
    Row(
        modifier
            .softCard(WalletColors.surface)
            .padding(12.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Box(
            Modifier
                .size(40.dp)
                .clip(CircleShape)
                .background(tint(color)),
            contentAlignment = Alignment.Center,
        ) { Icon(icon, null, Modifier.size(18.dp), tint = color) }
        Column {
            Text(value, fontSize = 14.sp, fontWeight = FontWeight.Bold, color = color, maxLines = 1)
            Text(label, fontSize = 12.sp, color = faint, maxLines = 1)
        }
    }
}

/** Soft's expense orange: the design draws money out in it, not in red. */
val SoftExpenseChip = Color(0xFFE8892A)

/** Dark's 2px meter. */
@Composable
fun ThinMeter(fraction: Float, color: Color) {
    Box(
        Modifier
            .fillMaxWidth()
            .padding(top = 2.dp)
            .height(2.dp)
            .background(WalletColors.barIdle),
    ) {
        Box(
            Modifier
                .fillMaxWidth(fraction.coerceIn(0f, 1f))
                .fillMaxHeight()
                .background(color),
        )
    }
}

/** A small dot: Dark marks rows with one, in the row's colour. */
@Composable
fun Dot(color: Color, size: Dp = 6.dp) {
    Box(
        Modifier
            .size(size)
            .clip(CircleShape)
            .background(color),
    )
}

/** Something to put a finger on, without the ripple's grey wash in Dark. */
@Composable
fun BoxScope.Pressable(onClick: () -> Unit) {
    Box(Modifier.matchParentSize().clickable(onClick = onClick))
}
