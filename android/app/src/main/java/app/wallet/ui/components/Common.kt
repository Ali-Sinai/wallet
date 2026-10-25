package app.wallet.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import app.wallet.R
import app.wallet.data.Account
import app.wallet.data.Category
import app.wallet.util.Fmt
import app.wallet.util.Lang

/** Category colours are "#rrggbb" strings from the API; anything unreadable gets the no-category grey. */
fun parseColor(hex: String?): Color = runCatching {
    Color(android.graphics.Color.parseColor(hex))
}.getOrDefault(NoCategoryColor)

val NoCategoryColor = Color(0xFF5A6663)

/** The name in the app's language, falling back to the other one. */
fun Category.displayName() = if (Lang.fa) nameFa.ifBlank { nameEn } else nameEn.ifBlank { nameFa }

fun Account.shortName(): String =
    (if (Lang.fa) nameFa.ifBlank { nameEn } else nameEn.ifBlank { nameFa }).ifBlank { bankName }

fun Account.displayName(): String {
    val name = shortName()
    return if (last4.isNotBlank()) "$name ····${Fmt.digits(last4)}" else name
}

@Composable
fun LoadingBox(modifier: Modifier = Modifier) {
    Box(modifier.fillMaxWidth().padding(40.dp), contentAlignment = Alignment.Center) {
        CircularProgressIndicator()
    }
}

@Composable
fun ErrorBox(message: String?, onRetry: () -> Unit, modifier: Modifier = Modifier) {
    Column(
        modifier.fillMaxWidth().padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Text(stringResource(R.string.load_failed), style = MaterialTheme.typography.titleMedium)
        message?.let {
            Text(
                it,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center,
            )
        }
        OutlinedButton(onClick = onRetry) { Text(stringResource(R.string.retry)) }
    }
}

@Composable
fun EmptyBox(text: String, modifier: Modifier = Modifier) {
    Text(
        text,
        modifier.fillMaxWidth().padding(32.dp),
        style = MaterialTheme.typography.bodyMedium,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
        textAlign = TextAlign.Center,
    )
}
