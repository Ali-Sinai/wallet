package app.wallet.ui.design

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.text.TextMeasurer
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.drawText
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.rememberTextMeasurer
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.wallet.data.Point
import app.wallet.ui.theme.Family
import app.wallet.ui.theme.WalletColors
import app.wallet.util.Fmt

/**
 * Spending over time as a smooth line — SpendLineChart.tsx, in each
 * family's look:
 *  SOFT     3px accent line, ringed marker, dashed drop line, white bubble
 *  CLASSIC  emerald line over a gradient area, hairline grid, popover bubble
 *  DARK     1.4px accent hairline, no fill, small dot, mono readout
 * The peak is highlighted until a point is touched. Time runs left to right
 * in both languages, like the web chart.
 */
@Composable
fun SpendLineChart(points: List<Point>, modifier: Modifier = Modifier) {
    if (points.isEmpty()) return
    val f = family
    val p = WalletColors
    val measurer = rememberTextMeasurer()
    val max = (points.maxOf { it.amountCents }).coerceAtLeast(1L)
    val peak = points.indexOfFirst { it.amountCents == max }.coerceAtLeast(0)
    var touched by remember(points) { mutableStateOf<Int?>(null) }
    val active = touched ?: peak

    val height: Dp = if (f == Family.DARK) 150.dp else 170.dp
    val stroke = if (f == Family.DARK) p.accent else p.primary
    val strokeWidth = when (f) {
        Family.SOFT -> 3.dp
        Family.CLASSIC -> 2.5.dp
        Family.DARK -> 1.4.dp
    }

    CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Ltr) {
        Column(modifier.padding(top = 18.dp)) {
            Canvas(
                Modifier
                    .fillMaxWidth()
                    .height(height)
                    .pointerInput(points) {
                        fun pick(x: Float) {
                            val step = if (points.size > 1) (size.width - 28.dp.toPx()) / (points.size - 1) else 0f
                            touched = if (step > 0) ((x - 14.dp.toPx()) / step).let { Math.round(it) }.coerceIn(0, points.size - 1) else 0
                        }
                        detectTapGestures { pick(it.x) }
                    }
                    .pointerInput(points) {
                        detectDragGestures { change, _ ->
                            val step = if (points.size > 1) (size.width - 28.dp.toPx()) / (points.size - 1) else 0f
                            touched = if (step > 0) Math.round((change.position.x - 14.dp.toPx()) / step).coerceIn(0, points.size - 1) else 0
                        }
                    },
            ) {
                val pad = 14.dp.toPx()
                val top = (if (f == Family.DARK) 30.dp else 18.dp).toPx()
                val bottom = size.height - 14.dp.toPx()
                val step = if (points.size > 1) (size.width - pad * 2) / (points.size - 1) else 0f
                val pts = points.mapIndexed { i, pt ->
                    Offset(
                        if (points.size > 1) pad + i * step else size.width / 2,
                        top + (1 - pt.amountCents.toFloat() / max) * (bottom - top - 10.dp.toPx()),
                    )
                }
                val line = smoothPath(pts)
                val ink = p.ink

                // Grid: classic three hairlines, Dark a baseline, Soft none.
                val grid = when (f) {
                    Family.CLASSIC -> 3
                    Family.DARK -> 1
                    Family.SOFT -> 0
                }
                for (g in 0 until grid) {
                    val y = if (grid == 1) bottom else top + (bottom - top) * (g + 1) / grid
                    drawLine(ink.copy(alpha = 0.07f), Offset(0f, y), Offset(size.width, y), 1.dp.toPx())
                }

                if (f == Family.CLASSIC) {
                    val area = Path().apply {
                        addPath(line)
                        lineTo(pts.last().x, bottom)
                        lineTo(pts.first().x, bottom)
                        close()
                    }
                    drawPath(area, Brush.verticalGradient(listOf(p.primary.copy(alpha = 0.28f), Color.Transparent), top, bottom))
                }
                drawPath(line, stroke, style = Stroke(strokeWidth.toPx(), cap = StrokeCap.Round))

                val a = pts[active]
                val dash = when (f) {
                    Family.SOFT -> PathEffect.dashPathEffect(floatArrayOf(4.dp.toPx(), 4.dp.toPx()))
                    Family.DARK -> PathEffect.dashPathEffect(floatArrayOf(2.dp.toPx(), 4.dp.toPx()))
                    Family.CLASSIC -> null
                }
                drawLine(
                    ink.copy(alpha = if (f == Family.CLASSIC) 0.14f else 0.25f),
                    a,
                    Offset(a.x, bottom),
                    (if (f == Family.SOFT) 1.5.dp else 1.dp).toPx(),
                    pathEffect = dash,
                )

                val value = Fmt.short(points[active].amountCents)
                when (f) {
                    Family.SOFT -> {
                        drawCircle(p.background, 8.dp.toPx(), a)
                        drawCircle(p.primary, 8.dp.toPx(), a, style = Stroke(3.dp.toPx()))
                        bubble(measurer, value, a, p.surface, null, p.foreground, 12f, FontWeight.Bold, 44.dp.toPx())
                    }
                    Family.CLASSIC -> {
                        drawCircle(p.surface, 8.5.dp.toPx(), a)
                        drawCircle(p.income, 5.5.dp.toPx(), a)
                        bubble(measurer, value, a, p.surface2, ink.copy(alpha = 0.09f), p.foreground, 11f, FontWeight.Bold, 40.dp.toPx())
                    }
                    Family.DARK -> {
                        drawCircle(p.accent.copy(alpha = 0.3f), 9.dp.toPx(), a, style = Stroke(1.dp.toPx()))
                        drawCircle(p.accent, 3.dp.toPx(), a)
                        val layout = measurer.measure(value, TextStyle(fontSize = 11.sp, fontFamily = Mono, color = p.foreground))
                        val x = (a.x - layout.size.width / 2).coerceIn(0f, size.width - layout.size.width)
                        drawText(layout, topLeft = Offset(x, (a.y - 16.dp.toPx() - layout.size.height).coerceAtLeast(0f)))
                    }
                }
            }

            // Ticks: about five labels (always the active one), in the family's type.
            val every = maxOf(1, (points.size + 4) / 5)
            Row(Modifier.fillMaxWidth().padding(top = 6.dp)) {
                points.forEachIndexed { i, pt ->
                    val show = i % every == 0 || i == active
                    Text(
                        if (show) Fmt.localize(pt.label).split(" ").first() else "",
                        Modifier.weight(1f),
                        fontSize = if (f == Family.SOFT) 12.sp else 9.5.sp,
                        fontFamily = if (f == Family.DARK) Mono else null,
                        fontWeight = if (i == active) FontWeight.Bold else FontWeight.Normal,
                        color = when {
                            i != active -> p.foreground.copy(alpha = if (f == Family.SOFT) 0.55f else 0.3f)
                            f == Family.SOFT -> p.primary
                            f == Family.CLASSIC -> p.income
                            else -> p.foreground
                        },
                        textAlign = TextAlign.Center,
                        maxLines = 1,
                    )
                }
            }
        }
    }
}

/** The value bubble above the marker, kept inside the chart. */
private fun DrawScope.bubble(
    measurer: TextMeasurer,
    text: String,
    at: Offset,
    fill: Color,
    border: Color?,
    textColor: Color,
    fontSize: Float,
    weight: FontWeight,
    lift: Float,
) {
    val layout = measurer.measure(text, TextStyle(fontSize = fontSize.sp, fontWeight = weight, color = textColor))
    val w = layout.size.width + 20.dp.toPx()
    val h = layout.size.height + 8.dp.toPx()
    val x = (at.x - w / 2).coerceIn(0f, size.width - w)
    val y = (at.y - lift).coerceAtLeast(-8.dp.toPx())
    drawRoundRect(fill, Offset(x, y), Size(w, h), CornerRadius(10.dp.toPx()))
    if (border != null) drawRoundRect(border, Offset(x, y), Size(w, h), CornerRadius(10.dp.toPx()), style = Stroke(1.dp.toPx()))
    drawText(layout, topLeft = Offset(x + 10.dp.toPx(), y + 4.dp.toPx()))
}

/** A smooth path through the points (Catmull-Rom as cubic Béziers) — smoothPath() in designs/shared.tsx. */
private fun smoothPath(pts: List<Offset>): Path = Path().apply {
    if (pts.isEmpty()) return@apply
    moveTo(pts[0].x, pts[0].y)
    for (i in 0 until pts.size - 1) {
        val p0 = pts.getOrElse(i - 1) { pts[i] }
        val p1 = pts[i]
        val p2 = pts[i + 1]
        val p3 = pts.getOrElse(i + 2) { p2 }
        cubicTo(
            p1.x + (p2.x - p0.x) / 6, p1.y + (p2.y - p0.y) / 6,
            p2.x - (p3.x - p1.x) / 6, p2.y - (p3.y - p1.y) / 6,
            p2.x, p2.y,
        )
    }
}
