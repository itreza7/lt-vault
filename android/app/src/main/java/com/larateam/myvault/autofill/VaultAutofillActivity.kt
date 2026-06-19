package com.larateam.myvault.autofill

import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

/**
 * Second React Native surface, launched by the autofill framework's
 * authentication PendingIntent. Renders the JS component "vaultAutofill"
 * (the unlock + pick-a-login screen) which returns the filled Dataset via
 * [VaultAutofillModule].
 */
class VaultAutofillActivity : ReactActivity() {

  override fun getMainComponentName(): String = "vaultAutofill"

  override fun createReactActivityDelegate(): ReactActivityDelegate =
    DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)
}
