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
 * Number and date formatting, mirroring frontend/src/lib/i18n.tsx: Persian
 * digits and separators in Persian, Latin ones in English. Amounts arrive as
 * Toman-cents (Toman ×100) and are shown as whole Toman. Dates are always
 * Jalali, in either language.
 */
object Fmt {
    private const val FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹"

    /** Dates are Tehran time everywhere, as on the server. */
    val TEHRAN: ZoneId = ZoneId.of("Asia/Tehran")

    private val calendarLocale: ULocale
        get() = ULocale(if (Lang.fa) "fa_IR@calendar=persian" else "en@calendar=persian")

    /** Latin digits → Persian when the UI is Persian; unchanged otherwise. */
    fun digits(s: String): String = if (!Lang.fa) s else buildString(s.length) {
        for (c in s) append(if (c in '0'..'9') FA_DIGITS[c - '0'] else c)
    }

    fun digits(n: Number) = digits(n.toString())

    /** "۱٬۲۳۴٬۵۶۷" / "1,234,567" — whole Toman, unsigned. */
    fun group(cents: Long): String {
        val toman = (abs(cents) / 100.0).roundToLong().toString()
        return digits(toman.reversed().chunked(3).joinToString(if (Lang.fa) "٬" else ",").reversed())
    }

    fun percent(value: Double): String =
        digits(String.format(Locale.US, "%.0f", value)) + if (Lang.fa) "٪" else "%"

    fun money(cents: Long, signed: Boolean = false): String =
        (if (cents < 0) "−" else if (signed) "+" else "") + group(cents)

    /** "۱٫۲ م" / "1.2M" — compact, for tight spots. */
    fun short(cents: Long): String {
        val toman = abs(cents) / 100.0
        return when {
            toman >= 1e6 -> digits(String.format(Locale.US, "%.1f", toman / 1e6)) + if (Lang.fa) " م" else "M"
            toman >= 1e3 -> digits((toman / 1e3).roundToLong()) + if (Lang.fa) " ه" else "K"
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

    /** "۳ آبان" (or with [withYear], "۳ آبان ۱۴۰۵") for an API datetime, in the Jalali calendar. */
    fun jalaliDate(iso: String, withYear: Boolean = false): String =
        runCatching { jalaliDate(parseApiDate(iso).toEpochMilli(), withYear) }.getOrDefault("")

    fun jalaliDate(millis: Long, withYear: Boolean = true): String {
        val format = SimpleDateFormat(if (withYear) "d MMMM y" else "d MMMM", calendarLocale)
        format.timeZone = TimeZone.getTimeZone("Asia/Tehran")
        return format.format(Date(millis))
    }

    fun time(millis: Long): String = digits(Instant.ofEpochMilli(millis).atZone(TEHRAN).format(timeFormat))

    /** Jalali month names, as the server writes them (backend/app/jalali.py MONTH_LABELS_FA). */
    val MONTHS = listOf("فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند")

    /** The same months as ICU spells them in English. */
    private val MONTHS_EN = listOf(
        "Farvardin", "Ordibehesht", "Khordad", "Tir", "Mordad", "Shahrivar",
        "Mehr", "Aban", "Azar", "Dey", "Bahman", "Esfand",
    )

    fun monthName(index: Int): String = (if (Lang.fa) MONTHS else MONTHS_EN).getOrElse(index) { "" }

    /**
     * A date label the server wrote in Persian ("۳ آبان ۱۴۰۵"), in the UI's
     * language — localize() in the web app's i18n.tsx.
     */
    fun localize(label: String): String {
        if (Lang.fa) return label
        var out = latinDigits(label)
        MONTHS.forEachIndexed { i, name -> out = out.replace(name, MONTHS_EN[i]) }
        return out
    }

    /** "1405-06" (the server's month key) → "شهریور ۱۴۰۵". */
    fun monthKeyLabel(key: String): String {
        val (y, m) = key.split("-").takeIf { it.size == 2 } ?: return digits(key)
        val name = m.toIntOrNull()?.let { monthName(it - 1) }?.takeIf { it.isNotEmpty() } ?: return digits(key)
        return "$name ${digits(y)}"
    }

    /**
     * Sort key for a server day label ("۳ آبان"): month, then day. Labels
     * sort wrongly as strings, and within one month or week they never
     * cross a year.
     */
    fun dayLabelOrder(label: String): Int {
        val parts = label.trim().split(" ", limit = 2)
        val day = latinDigits(parts[0]).toIntOrNull() ?: 0
        val month = MONTHS.indexOf(parts.getOrNull(1)?.trim())
        return month * 100 + day
    }

    /** Two-character avatar initials, for Persian and Latin names alike. */
    fun initials(name: String): String {
        val parts = name.trim().split(Regex("\\s+")).filter { it.isNotEmpty() }
        return when (parts.size) {
            0 -> "—"
            1 -> parts[0].take(2)
            else -> "${parts[0].first()}${parts[1].first()}"
        }
    }

    /** "آبان ۱۴۰۵" for the current month. */
    fun jalaliMonthLabel(): String {
        val format = SimpleDateFormat("MMMM y", calendarLocale)
        format.timeZone = TimeZone.getTimeZone("Asia/Tehran")
        return format.format(Date())
    }
}
