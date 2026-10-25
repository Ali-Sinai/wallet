package app.wallet

import android.app.Application
import app.wallet.data.ApiClient
import app.wallet.data.AuthRepository
import app.wallet.data.PersistentCookieJar
import app.wallet.data.ServerStore
import app.wallet.data.WalletRepository
import app.wallet.sms.SmsSettings
import app.wallet.ui.theme.ThemeStore
import app.wallet.util.Lang

class WalletApp : Application() {
    lateinit var container: AppContainer
        private set

    override fun onCreate() {
        super.onCreate()
        Lang.load(this)
        container = AppContainer(this)
    }
}

/** The app's singletons, built once at startup. */
class AppContainer(val app: Application) {
    private val cookies = PersistentCookieJar(app)
    val server = ServerStore(app)
    val api = ApiClient(cookies)
    val auth = AuthRepository(server, api, cookies)
    val wallet = WalletRepository(auth, api)
    val smsSettings = SmsSettings(app)
    val theme = ThemeStore(app)
}
