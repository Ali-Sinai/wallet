package app.wallet.ui.design

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.graphics.vector.addPathNodes
import androidx.compose.ui.unit.dp

/**
 * The Dark and Soft designs' line icons (P in frontend/src/designs/shared.tsx):
 * round-capped strokes on a 24-unit grid, tinted by the Icon that draws them.
 * Arc flags are spelled out ("0 1 0", not "010") for the path parser.
 */
object LineIcons {
    private fun circle(cx: Float, cy: Float, r: Float) =
        "M${cx - r} ${cy}a$r $r 0 1 0 ${2 * r} 0a$r $r 0 1 0 ${-2 * r} 0"

    private fun icon(name: String, vararg paths: String, width: Float = 1.6f): ImageVector {
        val b = ImageVector.Builder(name, 24.dp, 24.dp, 24f, 24f)
        for (d in paths) {
            b.addPath(
                pathData = addPathNodes(d),
                fill = null,
                stroke = SolidColor(Color.Black),
                strokeLineWidth = width,
                strokeLineCap = StrokeCap.Round,
                strokeLineJoin = StrokeJoin.Round,
            )
        }
        return b.build()
    }

    val Plus = icon("plus", "M12 5v14M5 12h14")
    val PlusBold = icon("plusBold", "M12 5v14M5 12h14", width = 2f)
    val Split = icon("split", "M12 21v-8M12 13L5 5M12 13l7-8M5 5h4M5 5v4M19 5h-4M19 5v4")
    val Sms = icon("sms", "M4 6h16v10H8l-4 4z")
    val Chart = icon("chart", "M4 20V10M10 20V4M16 20v-7M22 20H2")
    val Home = icon("home", "M3 11l9-7 9 7v9H3z")
    val List = icon("list", "M4 6h16M4 12h16M4 18h16")
    val Back = icon("back", "M15 5l-7 7 7 7", width = 2f)
    val Chevron = icon("chev", "M9 5l7 7-7 7")
    val Arrow = icon("arrow", "M5 12h14M13 6l6 6-6 6")
    val Bell = icon("bell", "M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15zM10 21h4", width = 1.8f)
    val Up = icon("up", "M7 17L17 7M9 7h8v8", width = 2f)
    val Down = icon("down", "M17 7L7 17M15 17H7V9", width = 2f)
    val Wallet = icon("wallet", "M3 7h18v12H3zM3 7l2-3h12l2 3M16 13h2", width = 1.7f)
    val Search = icon("search", circle(11f, 11f, 7f) + "M20 20l-4-4", width = 1.8f)
    val Gear = icon(
        "gear",
        circle(12f, 12f, 3f),
        "M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1",
        width = 1.8f,
    )
    val People = icon(
        "people",
        circle(9f, 8f, 3.5f),
        "M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6M16 4.5a3.5 3.5 0 0 1 0 7M18 14c2.2.6 3.5 2.8 3.5 6",
    )
    val Person = icon("person", circle(12f, 8f, 4f), "M4 21c0-4 3.6-7 8-7s8 3 8 7", width = 1.7f)
}
