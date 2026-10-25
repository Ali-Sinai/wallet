plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.kotlin.serialization)
}

/** A build-time setting from -P, gradle.properties or the environment (CI secrets); "" when unset. */
fun setting(name: String): String = (project.findProperty(name) as String?) ?: System.getenv(name) ?: ""

android {
    namespace = "app.wallet"
    compileSdk = 35

    defaultConfig {
        applicationId = "app.wallet"
        minSdk = 26
        targetSdk = 35
        versionCode = 6
        versionName = "0.6.0"

        // Push (Firebase Cloud Messaging) is optional: blank values build an app with push off.
        buildConfigField("String", "FIREBASE_APP_ID", "\"${setting("WALLET_FIREBASE_APP_ID")}\"")
        buildConfigField("String", "FIREBASE_API_KEY", "\"${setting("WALLET_FIREBASE_API_KEY")}\"")
        buildConfigField("String", "FIREBASE_PROJECT_ID", "\"${setting("WALLET_FIREBASE_PROJECT_ID")}\"")
        buildConfigField("String", "FIREBASE_SENDER_ID", "\"${setting("WALLET_FIREBASE_SENDER_ID")}\"")
    }

    // Release signing comes from the environment (CI secrets, see README); without
    // it a release build is left unsigned and only the debug APK is installable.
    val keystore = setting("WALLET_KEYSTORE_PATH")
    signingConfigs {
        if (keystore.isNotBlank()) {
            create("release") {
                storeFile = file(keystore)
                storePassword = setting("WALLET_KEYSTORE_PASSWORD")
                keyAlias = setting("WALLET_KEY_ALIAS")
                keyPassword = setting("WALLET_KEY_PASSWORD")
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            if (keystore.isNotBlank()) signingConfig = signingConfigs.getByName("release")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }
}

dependencies {
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.activity.compose)
    implementation(libs.androidx.lifecycle.runtime.compose)
    implementation(libs.androidx.lifecycle.viewmodel.compose)

    implementation(platform(libs.compose.bom))
    implementation(libs.compose.ui)
    implementation(libs.compose.ui.tooling.preview)
    implementation(libs.compose.material3)
    implementation(libs.compose.material.icons.core)
    implementation(libs.androidx.navigation.compose)
    implementation(libs.androidx.work.runtime)
    implementation(libs.firebase.messaging)
    debugImplementation(libs.compose.ui.tooling)

    implementation(libs.kotlinx.serialization.json)
    implementation(libs.okhttp)
    implementation(libs.retrofit)
    implementation(libs.retrofit.kotlinx.serialization)
}
