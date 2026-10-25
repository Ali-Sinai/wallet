package app.wallet.util

import android.icu.text.SimpleDateFormat
import android.icu.util.TimeZone
import android.icu.util.ULocale
import java.time.Instant
import java.time.LocalDateTime
import java.time.OffsetDateTime
import java.time.ZoneId
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter
import java.util.Date
import java.util.Locale
import kotlin.math.abs
import kotlin.math.roundToLong

/**
 * Number and date formatting, mirroring frontend/src/lib/i18n.tsx. Amounts
 * arrive as Toman-cents (Toman ×100) and are shown as whole Toman.
 */
object Fmt {
    private const val FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹"

    /** Dates are Tehran time everywhere, as on the server. */
    val TEHRAN: ZoneId = ZoneId.of("Asia/Tehran")

    fun digits(s: String): String = buildString(s.length) {
        for (c in s) append(if (c in '0'..'9') FA_DIGITS[c - '0'] else c)
    }

    fun digits(n: Number) = digits(n.toString())

    /** "۱٬۲۳۴٬۵۶۷" — whole Toman, unsigned. */
    fun group(cents: Long): String {
        val toman = (abs(cents) / 100.0).roundToLong().toString()
        return digits(toman.reversed().chunked(3).joinToString("٬").reversed())
    }

    fun money(cents: Long, signed: Boolean = false): String =
        (if (cents < 0) "−" else if (signed) "+" else "") + group(cents)

    /** "۱٫۲ م" / "۳۴۰ ه" — compact, for tight spots. */
    fun short(cents: Long): String {
        val toman = abs(cents) / 100.0
        return when {
            toman >= 1e6 -> digits(String.format(Locale.US, "%.1f", toman / 1e6)) + " م"
            toman >= 1e3 -> digits((toman / 1e3).roundToLong()) + " ه"
            else -> group(cents)
        }
    }

    /** Persian digits back to Latin, for parsing what someone typed. */
    fun latinDigits(s: String): String = buildString(s.length) {
        for (c in s) {
            val fa = FA_DIGITS.indexOf(c)
            val ar = "٠١٢٣٤٥٦٧٨٩".indexOf(c)
            append(if (fa >= 0) '0' + fa else if (ar >= 0) '0' + ar else c)
        }
    }

    /** The API sends UTC datetimes, usually without an offset ("2026-09-11T17:14:57"). */
    fun parseApiDate(iso: String): Instant = try {
        OffsetDateTime.parse(iso).toInstant()
    } catch (_: Exception) {
        LocalDateTime.parse(iso).toInstant(ZoneOffset.UTC)
    }

    private val timeFormat = DateTimeFormatter.ofPattern("HH:mm")

    fun time(iso: String): String =
        runCatching { digits(parseApiDate(iso).atZone(TEHRAN).format(timeFormat)) }.getOrDefault("")

    /** "آبان ۱۴۰۵" for the current month. */
    fun jalaliMonthLabel(): String {
        val format = SimpleDateFormat("MMMM y", ULocale("fa_IR@calendar=persian"))
        format.timeZone = TimeZone.getTimeZone("Asia/Tehran")
        return format.format(Date())
    }
}
