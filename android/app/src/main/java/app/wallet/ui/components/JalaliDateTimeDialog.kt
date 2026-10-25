package app.wallet.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowLeft
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TimeInput
import androidx.compose.material3.rememberTimePickerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.res.stringArrayResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.wallet.R
import app.wallet.ui.theme.WalletColors
import app.wallet.util.Fmt
import app.wallet.util.Jalali
import app.wallet.util.JalaliDate

/**
 * Picks a Jalali date and a time — the app's stand-in for the web's
 * DateTimeField. Weeks start on Saturday; today is ringed.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun JalaliDateTimeDialog(initialMillis: Long, onConfirm: (Long) -> Unit, onDismiss: () -> Unit) {
    val today = remember { Jalali.dateOf(System.currentTimeMillis()) }
    var picked by remember { mutableStateOf(Jalali.dateOf(initialMillis)) }
    var shown by remember { mutableStateOf(picked.year to picked.month) }
    val (hour, minute) = remember { Jalali.hourMinuteOf(initialMillis) }
    val time = rememberTimePickerState(initialHour = hour, initialMinute = minute, is24Hour = true)
    val weekdays = stringArrayResource(R.array.weekdays_short)

    AlertDialog(
        onDismissRequest = onDismiss,
        confirmButton = {
            TextButton(onClick = { onConfirm(Jalali.toMillis(picked, time.hour, time.minute)) }) {
                Text(stringResource(R.string.confirm))
            }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text(stringResource(R.string.cancel)) } },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                val (year, month) = shown
                Row(verticalAlignment = Alignment.CenterVertically) {
                    // Start side goes back a month, end side forward; the auto-mirrored
                    // arrows point outward in either reading direction.
                    IconButton(onClick = { shown = Jalali.plusMonths(year, month, -1) }) {
                        Icon(Icons.AutoMirrored.Filled.KeyboardArrowLeft, contentDescription = stringResource(R.string.previous))
                    }
                    Text(
                        "${Fmt.monthName(month - 1)} ${Fmt.digits(year)}",
                        Modifier.weight(1f),
                        fontWeight = FontWeight.Bold,
                        textAlign = TextAlign.Center,
                    )
                    IconButton(onClick = { shown = Jalali.plusMonths(year, month, 1) }) {
                        Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, contentDescription = stringResource(R.string.next))
                    }
                }

                Row(Modifier.fillMaxWidth()) {
                    for (w in weekdays) {
                        Text(
                            w,
                            Modifier.weight(1f),
                            fontSize = 11.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            textAlign = TextAlign.Center,
                        )
                    }
                }

                val offset = Jalali.firstWeekdayColumn(year, month)
                val days = Jalali.daysInMonth(year, month)
                val cells = offset + days
                for (row in 0 until (cells + 6) / 7) {
                    Row(Modifier.fillMaxWidth()) {
                        for (col in 0 until 7) {
                            val day = row * 7 + col - offset + 1
                            Box(Modifier.weight(1f).aspectRatio(1f), contentAlignment = Alignment.Center) {
                                if (day in 1..days) {
                                    val date = JalaliDate(year, month, day)
                                    val selected = date == picked
                                    Box(
                                        Modifier
                                            .padding(2.dp)
                                            .fillMaxWidth()
                                            .aspectRatio(1f)
                                            .clip(CircleShape)
                                            .background(if (selected) WalletColors.primary else Color.Transparent)
                                            .clickable { picked = date },
                                        contentAlignment = Alignment.Center,
                                    ) {
                                        Text(
                                            Fmt.digits(day),
                                            fontSize = 13.sp,
                                            fontWeight = if (date == today) FontWeight.Bold else FontWeight.Normal,
                                            color = when {
                                                selected -> WalletColors.onPrimary
                                                date == today -> WalletColors.primary
                                                else -> MaterialTheme.colorScheme.onSurface
                                            },
                                        )
                                    }
                                }
                            }
                        }
                    }
                }

                // Hours and minutes read left to right in both languages.
                CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Ltr) {
                    Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) { TimeInput(time) }
                }
            }
        },
    )
}
