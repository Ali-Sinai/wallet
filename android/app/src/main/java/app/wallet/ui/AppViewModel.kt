package app.wallet.ui

import androidx.compose.runtime.Composable
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import app.wallet.AppContainer
import app.wallet.WalletApp

/** A ViewModel built from the app's singletons — the app's only "dependency injection". */
@Composable
inline fun <reified VM : ViewModel> appViewModel(crossinline create: (AppContainer) -> VM): VM {
    val container = (LocalContext.current.applicationContext as WalletApp).container
    return viewModel(factory = viewModelFactory { initializer { create(container) } })
}
