package app.wallet.ui

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.consumeWindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.List
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.DateRange
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Home
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.stringResource
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.navArgument
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import app.wallet.R
import app.wallet.ui.activity.ActivityScreen
import app.wallet.ui.activity.ActivityViewModel
import app.wallet.ui.add.AddTransactionScreen
import app.wallet.ui.add.AddTransactionViewModel
import app.wallet.ui.home.HomeScreen
import app.wallet.ui.home.HomeViewModel
import app.wallet.ui.inbox.InboxScreen
import app.wallet.ui.inbox.InboxViewModel
import app.wallet.ui.inbox.SmsSettingsScreen
import app.wallet.ui.inbox.SmsSettingsViewModel
import app.wallet.ui.people.PeopleScreen
import app.wallet.ui.people.PeopleViewModel
import app.wallet.ui.people.PersonScreen
import app.wallet.ui.people.PersonViewModel
import app.wallet.ui.reports.ReportsScreen
import app.wallet.ui.reports.ReportsViewModel
import app.wallet.ui.settings.SettingsScreen
import app.wallet.ui.split.SplitScreen
import app.wallet.ui.split.SplitViewModel
import app.wallet.ui.settings.SettingsViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import app.wallet.ui.theme.WalletColors

private object Routes {
    const val HOME = "home"
    const val ACTIVITY = "activity"
    const val INBOX = "inbox"
    const val SMS_SETTINGS = "sms-settings"
    const val SETTINGS = "settings"
    const val PEOPLE = "people"
    const val PERSON = "person/{id}"
    const val REPORTS = "reports"
    const val SPLIT = "split/{tx}"

    fun person(id: Long) = "person/$id"
    fun split(txId: Long) = "split/$txId"
    const val ADD = "add?attempt={attempt}&tx={tx}"

    fun add(attemptId: Long? = null, txId: Long? = null) = "add?attempt=${attemptId ?: -1}&tx=${txId ?: -1}"
}

private data class Tab(val route: String, val label: Int, val icon: ImageVector)

private val tabs = listOf(
    Tab(Routes.HOME, R.string.tab_home, Icons.Filled.Home),
    Tab(Routes.ACTIVITY, R.string.tab_activity, Icons.AutoMirrored.Filled.List),
    Tab(Routes.INBOX, R.string.tab_inbox, Icons.Filled.Email),
    Tab(Routes.PEOPLE, R.string.tab_people, Icons.Filled.Person),
    Tab(Routes.REPORTS, R.string.tab_reports, Icons.Filled.DateRange),
)

/** Everything behind the login: the bottom tabs and the screens they open. */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun SignedInApp(username: String, serverUrl: String, onLogout: () -> Unit) {
    val nav = rememberNavController()
    val entry by nav.currentBackStackEntryAsState()
    val route = entry?.destination?.route
    val onTab = route in tabs.map { it.route }

    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        bottomBar = { if (onTab) BottomBar(nav, route) },
        floatingActionButton = {
            if (onTab) {
                FloatingActionButton(
                    onClick = { nav.navigate(Routes.add()) },
                    containerColor = WalletColors.primary,
                    contentColor = WalletColors.onPrimary,
                ) { Icon(Icons.Filled.Add, contentDescription = stringResource(R.string.add_transaction)) }
            }
        },
    ) { padding ->
        // consumeWindowInsets: screens that add imePadding then don't count the system bars twice.
        Box(
            Modifier
                .fillMaxSize()
                .padding(padding)
                .consumeWindowInsets(padding),
        ) {
            NavHost(nav, startDestination = Routes.HOME) {
                composable(Routes.HOME) {
                    HomeScreen(
                        vm = appViewModel { HomeViewModel(it.wallet) },
                        onSeeAll = { nav.switchTab(Routes.ACTIVITY) },
                        onOpenInbox = { nav.switchTab(Routes.INBOX) },
                        onSettings = { nav.navigate(Routes.SETTINGS) },
                        onSplit = { nav.navigate(Routes.split(it)) },
                        onEdit = { nav.navigate(Routes.add(txId = it)) },
                    )
                }
                composable(Routes.SETTINGS) {
                    val themeStore = container().theme
                    val theme by themeStore.theme.collectAsStateWithLifecycle()
                    SettingsScreen(
                        vm = appViewModel { SettingsViewModel(it.wallet) },
                        theme = theme,
                        onTheme = themeStore::set,
                        username = username,
                        serverUrl = serverUrl,
                        onSmsSettings = { nav.navigate(Routes.SMS_SETTINGS) },
                        onLogout = onLogout,
                        onClose = { nav.popBackStack() },
                    )
                }
                composable(Routes.ACTIVITY) {
                    ActivityScreen(
                        appViewModel { ActivityViewModel(it.wallet) },
                        onSplit = { nav.navigate(Routes.split(it)) },
                        onEdit = { nav.navigate(Routes.add(txId = it)) },
                    )
                }
                composable(Routes.PEOPLE) {
                    PeopleScreen(appViewModel { PeopleViewModel(it.wallet) }, onOpen = { nav.navigate(Routes.person(it)) })
                }
                composable(
                    Routes.PERSON,
                    arguments = listOf(navArgument("id") { type = NavType.LongType }),
                ) { entry ->
                    val id = entry.arguments?.getLong("id") ?: 0L
                    PersonScreen(
                        appViewModel { PersonViewModel(it.wallet, id) },
                        onClose = { nav.popBackStack() },
                        onSplit = { nav.navigate(Routes.split(it)) },
                        onEdit = { nav.navigate(Routes.add(txId = it)) },
                    )
                }
                composable(Routes.REPORTS) {
                    ReportsScreen(appViewModel { ReportsViewModel(it.wallet) })
                }
                composable(
                    Routes.SPLIT,
                    arguments = listOf(navArgument("tx") { type = NavType.LongType }),
                ) { entry ->
                    val txId = entry.arguments?.getLong("tx") ?: 0L
                    SplitScreen(appViewModel { SplitViewModel(it.wallet, txId) }, onClose = { nav.popBackStack() })
                }
                composable(Routes.INBOX) {
                    InboxScreen(
                        appViewModel { InboxViewModel(it.wallet, it.smsSettings) },
                        onResolve = { id -> nav.navigate(Routes.add(attemptId = id)) },
                        onSettings = { nav.navigate(Routes.SMS_SETTINGS) },
                    )
                }
                composable(Routes.SMS_SETTINGS) {
                    SmsSettingsScreen(
                        appViewModel { SmsSettingsViewModel(it.wallet, it.smsSettings) },
                        onClose = { nav.popBackStack() },
                    )
                }
                composable(
                    Routes.ADD,
                    arguments = listOf(
                        navArgument("attempt") { type = NavType.LongType; defaultValue = -1L },
                        navArgument("tx") { type = NavType.LongType; defaultValue = -1L },
                    ),
                ) { entry ->
                    val attemptId = entry.arguments?.getLong("attempt")?.takeIf { it >= 0 }
                    val txId = entry.arguments?.getLong("tx")?.takeIf { it >= 0 }
                    AddTransactionScreen(
                        appViewModel { AddTransactionViewModel(it.app, it.wallet, attemptId, txId) },
                        onClose = { nav.popBackStack() },
                    )
                }
            }
        }
    }
}

@Composable
private fun BottomBar(nav: NavHostController, route: String?) {
    NavigationBar(containerColor = WalletColors.tabBar) {
        for (tab in tabs) {
            NavigationBarItem(
                selected = route == tab.route,
                onClick = { nav.switchTab(tab.route) },
                icon = { Icon(tab.icon, contentDescription = null) },
                label = { Text(stringResource(tab.label)) },
                colors = NavigationBarItemDefaults.colors(
                    selectedIconColor = WalletColors.primary,
                    selectedTextColor = WalletColors.primary,
                    indicatorColor = WalletColors.primaryTint,
                ),
            )
        }
    }
}

/** Standard bottom-tab navigation: one copy of each tab, state kept when switching back. */
private fun NavHostController.switchTab(route: String) {
    navigate(route) {
        popUpTo(graph.findStartDestination().id) { saveState = true }
        launchSingleTop = true
        restoreState = true
    }
}
