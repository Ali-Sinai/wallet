package app.wallet.util

import android.icu.util.Calendar
import android.icu.util.TimeZone
import android.icu.util.ULocale

/** A Jalali calendar date; [month] is 1–12. */
data class JalaliDate(val year: Int, val month: Int, val day: Int)

/** Jalali ⇄ instant conversion in Tehran time, through ICU's Persian calendar. */
object Jalali {
    private fun calendar(): Calendar =
        Calendar.getInstance(TimeZone.getTimeZone("Asia/Tehran"), ULocale("fa_IR@calendar=persian"))

    fun dateOf(millis: Long): JalaliDate {
        val c = calendar().apply { timeInMillis = millis }
        return JalaliDate(c.get(Calendar.YEAR), c.get(Calendar.MONTH) + 1, c.get(Calendar.DAY_OF_MONTH))
    }

    fun hourMinuteOf(millis: Long): Pair<Int, Int> {
        val c = calendar().apply { timeInMillis = millis }
        return c.get(Calendar.HOUR_OF_DAY) to c.get(Calendar.MINUTE)
    }

    fun toMillis(date: JalaliDate, hour: Int, minute: Int): Long = calendar().apply {
        clear()
        set(date.year, date.month - 1, date.day, hour, minute, 0)
    }.timeInMillis

    fun daysInMonth(year: Int, month: Int): Int = calendar().apply {
        clear()
        set(year, month - 1, 1)
    }.getActualMaximum(Calendar.DAY_OF_MONTH)

    /** Column of the month's first day in a week that starts on Saturday (0) and ends on Friday (6). */
    fun firstWeekdayColumn(year: Int, month: Int): Int {
        val c = calendar().apply {
            clear()
            set(year, month - 1, 1)
        }
        // Calendar.SATURDAY is 7, SUNDAY 1 … FRIDAY 6.
        return c.get(Calendar.DAY_OF_WEEK) % 7
    }

    fun plusMonths(year: Int, month: Int, delta: Int): Pair<Int, Int> {
        val index = year * 12 + (month - 1) + delta
        return Math.floorDiv(index, 12) to Math.floorMod(index, 12) + 1
    }
}
