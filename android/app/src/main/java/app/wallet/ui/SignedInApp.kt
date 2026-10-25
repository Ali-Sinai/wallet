package app.wallet.ui

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.consumeWindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.List
import androidx.compose.material.icons.filled.Add
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
import app.wallet.ui.theme.WalletColors

private object Routes {
    const val HOME = "home"
    const val ACTIVITY = "activity"
    const val ADD = "add"
}

private data class Tab(val route: String, val label: Int, val icon: ImageVector)

private val tabs = listOf(
    Tab(Routes.HOME, R.string.tab_home, Icons.Filled.Home),
    Tab(Routes.ACTIVITY, R.string.tab_activity, Icons.AutoMirrored.Filled.List),
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
                    onClick = { nav.navigate(Routes.ADD) },
                    containerColor = WalletColors.Primary,
                    contentColor = WalletColors.OnPrimary,
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
                        serverUrl = serverUrl,
                        onSeeAll = { nav.switchTab(Routes.ACTIVITY) },
                        onLogout = onLogout,
                    )
                }
                composable(Routes.ACTIVITY) {
                    ActivityScreen(appViewModel { ActivityViewModel(it.wallet) })
                }
                composable(Routes.ADD) {
                    AddTransactionScreen(
                        appViewModel { AddTransactionViewModel(it.wallet) },
                        onClose = { nav.popBackStack() },
                    )
                }
            }
        }
    }
}

@Composable
private fun BottomBar(nav: NavHostController, route: String?) {
    NavigationBar(containerColor = WalletColors.TabBar) {
        for (tab in tabs) {
            NavigationBarItem(
                selected = route == tab.route,
                onClick = { nav.switchTab(tab.route) },
                icon = { Icon(tab.icon, contentDescription = null) },
                label = { Text(stringResource(tab.label)) },
                colors = NavigationBarItemDefaults.colors(
                    selectedIconColor = WalletColors.Primary,
                    selectedTextColor = WalletColors.Primary,
                    indicatorColor = WalletColors.PrimaryTint,
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
