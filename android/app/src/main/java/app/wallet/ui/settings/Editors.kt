package app.wallet.ui.settings

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextDirection
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.wallet.R
import app.wallet.data.Account
import app.wallet.data.AccountIn
import app.wallet.data.Budget
import app.wallet.data.BudgetIn
import app.wallet.data.Category
import app.wallet.data.CategoryIn
import app.wallet.ui.components.displayName
import app.wallet.ui.components.parseColor
import app.wallet.ui.theme.WalletColors
import app.wallet.util.Fmt

/** The colours the seeded categories use (backend/app/seed_data.py), plus a few more. */
private val CATEGORY_COLORS = listOf(
    "#0f9b6e", "#3fd39a", "#3fa9e0", "#5b8def", "#c96bd8", "#e0648c", "#e09628", "#e0a628", "#8a9490", "#5a6663",
)

/**
 * The shell every editor shares: a dialog with save, an optional delete
 * (confirmed by a second tap), and the server's error if the write failed.
 */
@Composable
private fun EditorDialog(
    title: String,
    vm: SettingsViewModel,
    canSave: Boolean,
    onSave: () -> Unit,
    onDelete: (() -> Unit)?,
    onDismiss: () -> Unit,
    content: @Composable () -> Unit,
) {
    var armed by remember { mutableStateOf(false) }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(title) },
        text = {
            Column(
                Modifier.verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                content()
                vm.error?.let { Text(stringResource(R.string.error_server, it), color = WalletColors.expense, fontSize = 12.sp) }
                if (onDelete != null) {
                    TextButton(onClick = { if (armed) onDelete() else armed = true }, enabled = !vm.saving) {
                        Text(
                            stringResource(if (armed) R.string.delete_tap_again else R.string.delete),
                            color = WalletColors.expense,
                        )
                    }
                }
            }
        },
        confirmButton = {
            TextButton(onClick = onSave, enabled = canSave && !vm.saving) { Text(stringResource(R.string.save)) }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text(stringResource(R.string.cancel)) } },
    )
}

@Composable
private fun Field(value: String, onChange: (String) -> Unit, label: Int, ltr: Boolean = false, digits: Boolean = false) {
    OutlinedTextField(
        value = value,
        onValueChange = onChange,
        label = { Text(stringResource(label)) },
        singleLine = true,
        textStyle = if (ltr) MaterialTheme.typography.bodyLarge.copy(textDirection = TextDirection.Ltr) else MaterialTheme.typography.bodyLarge,
        keyboardOptions = if (digits) KeyboardOptions(keyboardType = KeyboardType.Number) else KeyboardOptions.Default,
        modifier = Modifier.fillMaxWidth(),
    )
}

@Composable
fun AccountDialog(vm: SettingsViewModel, account: Account?, onDismiss: () -> Unit) {
    var nameFa by remember { mutableStateOf(account?.nameFa.orEmpty()) }
    var nameEn by remember { mutableStateOf(account?.nameEn.orEmpty()) }
    var bank by remember { mutableStateOf(account?.bankName.orEmpty()) }
    var last4 by remember { mutableStateOf(account?.last4.orEmpty()) }
    var active by remember { mutableStateOf(account?.isActive ?: true) }

    EditorDialog(
        title = stringResource(if (account == null) R.string.new_account else R.string.edit_account),
        vm = vm,
        canSave = nameFa.isNotBlank() || nameEn.isNotBlank(),
        onSave = {
            vm.saveAccount(
                account?.id,
                AccountIn(nameFa.trim(), nameEn.trim(), bank.trim(), Fmt.latinDigits(last4).trim(), active),
                onDone = onDismiss,
            )
        },
        onDelete = account?.let { a -> { vm.deleteAccount(a.id, onDone = onDismiss) } },
        onDismiss = onDismiss,
    ) {
        Field(nameFa, { nameFa = it }, R.string.name_fa)
        Field(nameEn, { nameEn = it }, R.string.name_en, ltr = true)
        Field(bank, { bank = it }, R.string.bank_name)
        // The SMS parser matches messages to accounts by these card digits.
        Field(last4, { if (it.length <= 4) last4 = it }, R.string.last4, ltr = true, digits = true)
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(stringResource(R.string.active), Modifier.weight(1f))
            Switch(checked = active, onCheckedChange = { active = it })
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun CategoryDialog(vm: SettingsViewModel, category: Category?, onDismiss: () -> Unit) {
    var nameFa by remember { mutableStateOf(category?.nameFa.orEmpty()) }
    var nameEn by remember { mutableStateOf(category?.nameEn.orEmpty()) }
    var icon by remember { mutableStateOf(category?.icon ?: "💰") }
    var color by remember { mutableStateOf(category?.color ?: CATEGORY_COLORS.first()) }

    EditorDialog(
        title = stringResource(if (category == null) R.string.new_category else R.string.edit_category),
        vm = vm,
        canSave = nameFa.isNotBlank() || nameEn.isNotBlank(),
        onSave = {
            vm.saveCategory(
                category?.id,
                CategoryIn(
                    nameFa = nameFa.trim(),
                    nameEn = nameEn.trim(),
                    icon = icon.trim(),
                    color = color,
                    parentId = category?.parentId,
                    sortOrder = category?.sortOrder ?: 0,
                ),
                onDone = onDismiss,
            )
        },
        onDelete = category?.let { c -> { vm.deleteCategory(c.id, onDone = onDismiss) } },
        onDismiss = onDismiss,
    ) {
        Field(nameFa, { nameFa = it }, R.string.name_fa)
        Field(nameEn, { nameEn = it }, R.string.name_en, ltr = true)
        Field(icon, { if (it.length <= 8) icon = it }, R.string.icon)
        Text(stringResource(R.string.color), fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
        val choices = if (color in CATEGORY_COLORS) CATEGORY_COLORS else listOf(color) + CATEGORY_COLORS
        FlowRow(horizontalArrangement = Arrangement.spacedBy(10.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            for (c in choices) {
                Box(
                    Modifier
                        .size(30.dp)
                        .clip(CircleShape)
                        .background(parseColor(c))
                        .border(3.dp, if (c == color) WalletColors.foreground else androidx.compose.ui.graphics.Color.Transparent, CircleShape)
                        .clickable { color = c },
                )
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun BudgetDialog(vm: SettingsViewModel, budget: Budget?, categories: List<Category>, onDismiss: () -> Unit) {
    var categoryId by remember { mutableStateOf(budget?.categoryId) }
    var limit by remember { mutableStateOf(budget?.let { (it.limitCents / 100).toString() }.orEmpty()) }
    val toman = Fmt.latinDigits(limit).filter { it.isDigit() }.toLongOrNull()

    EditorDialog(
        title = stringResource(if (budget == null) R.string.new_budget else R.string.edit_budget),
        vm = vm,
        canSave = categoryId != null && toman != null && toman > 0,
        onSave = {
            // A budget the web app scoped to one month keeps that month; new ones apply every month.
            categoryId?.let { id ->
                vm.saveBudget(budget?.id, BudgetIn(id, (toman ?: 0) * 100, budget?.monthJalali), onDone = onDismiss)
            }
        },
        onDelete = budget?.let { b -> { vm.deleteBudget(b.id, onDone = onDismiss) } },
        onDismiss = onDismiss,
    ) {
        Field(limit, { limit = it }, R.string.budget_limit, ltr = true, digits = true)
        if (toman != null) {
            Text(Fmt.group(toman * 100) + " " + stringResource(R.string.toman), fontSize = 12.sp)
        }
        Text(stringResource(R.string.category), fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            for (category in categories) {
                FilterChip(
                    selected = categoryId == category.id,
                    onClick = { categoryId = category.id },
                    label = { Text(category.displayName()) },
                )
            }
        }
    }
}
