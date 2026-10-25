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
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.wallet.R
import app.wallet.data.Account
import app.wallet.data.Budget
import app.wallet.data.Category
import app.wallet.ui.components.ErrorBox
import app.wallet.ui.components.Load
import app.wallet.ui.components.LoadingBox
import app.wallet.ui.components.displayName
import app.wallet.ui.components.parseColor
import app.wallet.ui.theme.ThemeId
import app.wallet.ui.theme.WalletColors
import app.wallet.ui.theme.paletteFor
import app.wallet.util.Fmt

/** Which editor dialog is open; a null item means "new". */
private sealed interface Editor {
    data class EditAccount(val account: Account?) : Editor
    data class EditCategory(val category: Category?) : Editor
    data class EditBudget(val budget: Budget?) : Editor
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun SettingsScreen(
    vm: SettingsViewModel,
    theme: ThemeId,
    onTheme: (ThemeId) -> Unit,
    username: String,
    serverUrl: String,
    onSmsSettings: () -> Unit,
    onLogout: () -> Unit,
    onClose: () -> Unit,
) {
    var editor by remember { mutableStateOf<Editor?>(null) }
    var confirmLogout by remember { mutableStateOf(false) }

    Column(Modifier.fillMaxSize()) {
        Row(Modifier.padding(horizontal = 8.dp, vertical = 4.dp), verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = onClose) { Icon(Icons.Filled.Close, contentDescription = stringResource(R.string.close)) }
            Text(stringResource(R.string.settings), fontSize = 18.sp, fontWeight = FontWeight.Bold)
        }

        LazyColumn(Modifier.fillMaxSize()) {
            item {
                SectionTitle(R.string.theme)
                FlowRow(
                    Modifier.padding(horizontal = 22.dp),
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    for (id in ThemeId.entries) ThemeSwatch(id, selected = id == theme, onClick = { onTheme(id) })
                }
            }

            when (val s = vm.state) {
                Load.Loading -> item { LoadingBox() }
                is Load.Failed -> item { ErrorBox(s.message, onRetry = vm::refresh) }
                is Load.Ready -> {
                    val data = s.data
                    item { SectionTitle(R.string.accounts, onAdd = { editor = Editor.EditAccount(null) }) }
                    items(data.lookups.accounts, key = { "a${it.id}" }) { account ->
                        Line(
                            title = account.displayName(),
                            sub = listOf(account.bankName, if (!account.isActive) stringResource(R.string.inactive) else "")
                                .filter { it.isNotBlank() }.joinToString(" · "),
                            onClick = { editor = Editor.EditAccount(account) },
                        )
                    }

                    item { SectionTitle(R.string.categories, onAdd = { editor = Editor.EditCategory(null) }) }
                    items(data.lookups.categories, key = { "c${it.id}" }) { category ->
                        Line(
                            title = listOf(category.icon, category.displayName()).filter { it.isNotBlank() }.joinToString(" "),
                            sub = category.nameEn,
                            dot = parseColor(category.color),
                            onClick = { editor = Editor.EditCategory(category) },
                        )
                    }

                    item { SectionTitle(R.string.budgets, onAdd = { editor = Editor.EditBudget(null) }) }
                    items(data.budgets, key = { "b${it.id}" }) { budget ->
                        val category = data.lookups.category(budget.categoryId)
                        Line(
                            title = category?.displayName() ?: "—",
                            sub = stringResource(R.string.budget_line, Fmt.group(budget.limitCents)),
                            dot = category?.let { parseColor(it.color) },
                            onClick = { editor = Editor.EditBudget(budget) },
                        )
                    }

                    item {
                        SectionTitle(R.string.more)
                        Line(title = stringResource(R.string.sms_settings), onClick = onSmsSettings)
                        Line(
                            title = stringResource(R.string.logout),
                            sub = "$username · ${serverUrl.trimEnd('/')}",
                            titleColor = WalletColors.expense,
                            onClick = { confirmLogout = true },
                        )
                    }

                    item { Box(Modifier.padding(bottom = 32.dp)) }
                }
            }
        }
    }

    val ready = (vm.state as? Load.Ready<SettingsData>)?.data
    when (val e = editor) {
        null -> Unit
        is Editor.EditAccount -> AccountDialog(vm, e.account, onDismiss = { editor = null; vm.clearError() })
        is Editor.EditCategory -> CategoryDialog(vm, e.category, onDismiss = { editor = null; vm.clearError() })
        is Editor.EditBudget -> if (ready != null) {
            BudgetDialog(vm, e.budget, ready.lookups.categories, onDismiss = { editor = null; vm.clearError() })
        }
    }

    if (confirmLogout) {
        AlertDialog(
            onDismissRequest = { confirmLogout = false },
            text = { Text(stringResource(R.string.logout_confirm, username, serverUrl.trimEnd('/'))) },
            confirmButton = {
                TextButton(onClick = {
                    confirmLogout = false
                    onLogout()
                }) { Text(stringResource(R.string.logout)) }
            },
            dismissButton = { TextButton(onClick = { confirmLogout = false }) { Text(stringResource(R.string.cancel)) } },
        )
    }
}

@Composable
private fun SectionTitle(res: Int, onAdd: (() -> Unit)? = null) {
    Row(
        Modifier
            .fillMaxWidth()
            .padding(start = 22.dp, end = 10.dp, top = 18.dp, bottom = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(stringResource(res), Modifier.weight(1f), fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
        if (onAdd != null) TextButton(onClick = onAdd) { Text(stringResource(R.string.add)) }
    }
}

@Composable
private fun Line(
    title: String,
    sub: String? = null,
    dot: androidx.compose.ui.graphics.Color? = null,
    titleColor: androidx.compose.ui.graphics.Color = androidx.compose.ui.graphics.Color.Unspecified,
    onClick: () -> Unit,
) {
    Column(Modifier.clickable(onClick = onClick)) {
        Row(
            Modifier
                .fillMaxWidth()
                .padding(horizontal = 22.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            if (dot != null) Box(Modifier.size(10.dp).clip(CircleShape).background(dot))
            Column(Modifier.weight(1f)) {
                Text(title, fontSize = 14.sp, fontWeight = FontWeight.Bold, color = titleColor)
                if (!sub.isNullOrBlank()) {
                    Text(sub, fontSize = 11.5.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        }
        HorizontalDivider(Modifier.padding(horizontal = 22.dp), color = WalletColors.border)
    }
}

@Composable
private fun ThemeSwatch(id: ThemeId, selected: Boolean, onClick: () -> Unit) {
    val p = paletteFor(id)
    Column(
        Modifier
            .clip(RoundedCornerShape(14.dp))
            .border(2.dp, if (selected) WalletColors.primary else WalletColors.border, RoundedCornerShape(14.dp))
            .clickable(onClick = onClick)
            .padding(10.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        Box(
            Modifier
                .size(width = 64.dp, height = 40.dp)
                .clip(RoundedCornerShape(10.dp))
                .background(p.background),
            contentAlignment = Alignment.Center,
        ) {
            Box(Modifier.size(16.dp).clip(CircleShape).background(p.primary))
        }
        Text(id.label, fontSize = 11.sp)
    }
}
