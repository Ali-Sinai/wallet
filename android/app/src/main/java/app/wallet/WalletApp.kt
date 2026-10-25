package app.wallet

import android.app.Application
import app.wallet.data.ApiClient
import app.wallet.data.AuthRepository
import app.wallet.data.PersistentCookieJar
import app.wallet.data.ServerStore

class WalletApp : Application() {
    lateinit var container: AppContainer
        private set

    override fun onCreate() {
        super.onCreate()
        container = AppContainer(this)
    }
}

/** The app's singletons, built once at startup. */
class AppContainer(app: Application) {
    private val cookies = PersistentCookieJar(app)
    val server = ServerStore(app)
    val api = ApiClient(cookies)
    val auth = AuthRepository(server, api, cookies)
}
