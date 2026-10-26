package app.wallet.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.ui.Alignment
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.unit.dp
import app.wallet.ui.design.LineIcons
import app.wallet.ui.design.family
import app.wallet.ui.design.softCard
import app.wallet.ui.theme.Family
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
import androidx.compose.runtime.LaunchedEffect
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
import app.wallet.notify.Notifications
import app.wallet.ui.activity.ActivityScreen
import app.wallet.ui.activity.ActivityViewModel
import app.wallet.ui.add.AddTransactionScreen
import app.wallet.ui.add.AddTransactionViewModel
import app.wallet.ui.home.HomeActions
import app.wallet.ui.home.HomeScreen
import app.wallet.ui.home.HomeViewModel
import app.wallet.ui.inbox.InboxScreen
import app.wallet.ui.inbox.InboxViewModel
import app.wallet.ui.inbox.SmsPatternScreen
import app.wallet.ui.inbox.SmsPatternViewModel
import app.wallet.ui.inbox.SmsPatternsScreen
import app.wallet.ui.inbox.SmsPatternsViewModel
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
    const val SETTINGS = "settings?sms={sms}"
    const val SMS_PATTERNS = "sms-patterns"
    const val SMS_PATTERN = "sms-pattern/{id}"

    fun settings(sms: Boolean = false) = "settings?sms=$sms"
    fun smsPattern(id: Long?) = "sms-pattern/${id ?: -1}"
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
fun SignedInApp(
    openRequest: String?,
    onOpenHandled: () -> Unit,
    username: String,
    serverUrl: String,
    onLogout: () -> Unit,
) {
    val nav = rememberNavController()
    val entry by nav.currentBackStackEntryAsState()
    val route = entry?.destination?.route
    val onTab = route in tabs.map { it.route }

    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        bottomBar = {
            if (onTab) {
                when (family) {
                    Family.CLASSIC -> BottomBar(nav, route)
                    Family.DARK -> DarkTabBar(nav, route)
                    Family.SOFT -> SoftTabBar(nav, route, onAdd = { nav.navigate(Routes.add()) })
                }
            }
        },
        floatingActionButton = {
            // Only classic floats an add button; Dark adds from its screens, Soft from the tab bar.
            if (onTab && family == Family.CLASSIC) {
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
                        username = username,
                        actions = HomeActions(
                            seeAll = { nav.switchTab(Routes.ACTIVITY) },
                            openInbox = { nav.switchTab(Routes.INBOX) },
                            settings = { nav.navigate(Routes.settings()) },
                            split = { nav.navigate(Routes.split(it)) },
                            edit = { nav.navigate(Routes.add(txId = it)) },
                            add = { nav.navigate(Routes.add()) },
                            reports = { nav.switchTab(Routes.REPORTS) },
                        ),
                    )
                }
                composable(
                    Routes.SETTINGS,
                    arguments = listOf(navArgument("sms") { type = NavType.BoolType; defaultValue = false }),
                ) { entry ->
                    val themeStore = container().theme
                    val theme by themeStore.theme.collectAsStateWithLifecycle()
                    SettingsScreen(
                        vm = appViewModel { SettingsViewModel(it.wallet) },
                        theme = theme,
                        onTheme = themeStore::set,
                        username = username,
                        serverUrl = serverUrl,
                        onSmsPatterns = { nav.navigate(Routes.SMS_PATTERNS) },
                        openSms = entry.arguments?.getBoolean("sms") ?: false,
                        onLogout = onLogout,
                        onClose = { nav.popBackStack() },
                    )
                }
                composable(Routes.ACTIVITY) {
                    ActivityScreen(
                        appViewModel { ActivityViewModel(it.wallet) },
                        onAdd = { nav.navigate(Routes.add()) },
                        onSplit = { nav.navigate(Routes.split(it)) },
                        onEdit = { nav.navigate(Routes.add(txId = it)) },
                    )
                }
                composable(Routes.PEOPLE) {
                    PeopleScreen(
                        appViewModel { PeopleViewModel(it.wallet) },
                        onOpen = { nav.navigate(Routes.person(it)) },
                        onSplit = { nav.navigate(Routes.split(it)) },
                    )
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
                        onSettings = { nav.navigate(Routes.settings(sms = true)) },
                    )
                }
                composable(Routes.SMS_PATTERNS) {
                    SmsPatternsScreen(
                        appViewModel { SmsPatternsViewModel(it.wallet, it.smsSettings) },
                        onOpen = { id -> nav.navigate(Routes.smsPattern(id)) },
                        onClose = { nav.popBackStack() },
                    )
                }
                composable(
                    Routes.SMS_PATTERN,
                    arguments = listOf(navArgument("id") { type = NavType.LongType }),
                ) { entry ->
                    val id = entry.arguments?.getLong("id")?.takeIf { it >= 0 }
                    SmsPatternScreen(appViewModel { SmsPatternViewModel(it.wallet, id) }, onClose = { nav.popBackStack() })
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

    // After the NavHost above, so the graph exists when a notification asks for a tab.
    LaunchedEffect(openRequest) {
        if (openRequest == Notifications.OPEN_INBOX) nav.switchTab(Routes.INBOX)
        if (openRequest != null) onOpenHandled()
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

/** Wallet Dark: four line icons on black, the current one in the accent; no labels. */
@Composable
private fun DarkTabBar(nav: NavHostController, route: String?) {
    val p = WalletColors
    Row(
        Modifier
            .fillMaxWidth()
            .background(p.background)
            .navigationBarsPadding()
            .padding(start = 20.dp, end = 20.dp, top = 14.dp, bottom = 18.dp),
        horizontalArrangement = Arrangement.SpaceAround,
    ) {
        for ((r, icon, label) in listOf(
            Triple(Routes.HOME, LineIcons.Home, R.string.tab_home),
            Triple(Routes.ACTIVITY, LineIcons.List, R.string.tab_activity),
            Triple(Routes.PEOPLE, LineIcons.People, R.string.tab_people),
            Triple(Routes.REPORTS, LineIcons.Chart, R.string.tab_reports),
        )) {
            Icon(
                icon,
                contentDescription = stringResource(label),
                tint = if (route == r) p.accent else p.foreground.copy(alpha = 0.4f),
                modifier = Modifier
                    .clip(CircleShape)
                    .clickable { nav.switchTab(r) }
                    .padding(6.dp)
                    .size(24.dp),
            )
        }
    }
}

/** Wallet Soft: a floating white pill with the accent "+" in the middle. */
@Composable
private fun SoftTabBar(nav: NavHostController, route: String?, onAdd: () -> Unit) {
    val p = WalletColors
    @Composable
    fun tab(r: String, icon: ImageVector, label: Int) {
        Icon(
            icon,
            contentDescription = stringResource(label),
            tint = if (route == r) p.primary else p.foreground.copy(alpha = 0.35f),
            modifier = Modifier
                .clip(CircleShape)
                .clickable { nav.switchTab(r) }
                .padding(8.dp)
                .size(22.dp),
        )
    }
    Box(
        Modifier
            .fillMaxWidth()
            .navigationBarsPadding()
            .padding(start = 16.dp, end = 16.dp, bottom = 14.dp, top = 6.dp),
    ) {
        Row(
            Modifier
                .fillMaxWidth()
                .height(70.dp)
                .softCard(p.surface, radius = 35.dp)
                .padding(horizontal = 8.dp),
            horizontalArrangement = Arrangement.SpaceAround,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            tab(Routes.HOME, LineIcons.Home, R.string.tab_home)
            tab(Routes.ACTIVITY, LineIcons.Wallet, R.string.tab_activity)
            Box(
                Modifier
                    .size(54.dp)
                    .shadow(8.dp, CircleShape, ambientColor = p.primary.copy(alpha = 0.35f), spotColor = p.primary.copy(alpha = 0.35f))
                    .clip(CircleShape)
                    .background(p.primary)
                    .clickable(onClick = onAdd),
                contentAlignment = Alignment.Center,
            ) {
                Icon(LineIcons.PlusBold, stringResource(R.string.add_transaction), Modifier.size(22.dp), tint = p.onPrimary)
            }
            tab(Routes.REPORTS, LineIcons.Chart, R.string.tab_reports)
            tab(Routes.PEOPLE, LineIcons.Person, R.string.tab_people)
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
