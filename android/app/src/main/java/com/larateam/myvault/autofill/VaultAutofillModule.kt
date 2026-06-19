package com.larateam.myvault.autofill

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import android.service.autofill.Dataset
import android.view.autofill.AutofillId
import android.view.autofill.AutofillManager
import android.view.autofill.AutofillValue
import android.widget.RemoteViews
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * Bridge between the RN autofill screen and the Android autofill framework.
 *
 *  - App side: query/launch the system autofill-service picker (for the setup screen).
 *  - Autofill-activity side: read the parsed request from the launching intent, and
 *    return a filled Dataset (EXTRA_AUTHENTICATION_RESULT) for login or TOTP.
 *
 * Legacy module; runs under the new architecture via the TurboModule interop layer.
 */
class VaultAutofillModule(private val ctx: ReactApplicationContext) :
  ReactContextBaseJavaModule(ctx) {

  override fun getName(): String = NAME

  /* ---- App side (Settings setup screen) -------------------------------- */

  @ReactMethod
  fun isSupported(promise: Promise) {
    val mgr = ctx.getSystemService(AutofillManager::class.java)
    promise.resolve(mgr != null && mgr.isAutofillSupported)
  }

  @ReactMethod
  fun hasEnabledService(promise: Promise) {
    val mgr = ctx.getSystemService(AutofillManager::class.java)
    promise.resolve(mgr != null && mgr.hasEnabledAutofillServices())
  }

  @ReactMethod
  fun openAutofillSettings(promise: Promise) {
    try {
      val intent = Intent(Settings.ACTION_REQUEST_SET_AUTOFILL_SERVICE)
        .setData(Uri.parse("package:" + ctx.packageName))
        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      ctx.startActivity(intent)
      promise.resolve(true)
    } catch (e: Exception) {
      try {
        ctx.startActivity(
          Intent(Settings.ACTION_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
        )
        promise.resolve(true)
      } catch (e2: Exception) {
        promise.reject("autofill_settings", e2)
      }
    }
  }

  /* ---- Autofill activity side ------------------------------------------ */

  @ReactMethod
  fun getRequest(promise: Promise) {
    val intent = getCurrentActivity()?.intent
    if (intent == null) {
      promise.resolve(null)
      return
    }
    val map = Arguments.createMap()
    map.putString("mode", intent.getStringExtra(AutofillContract.EXTRA_MODE) ?: "fill")
    map.putString("webDomain", intent.getStringExtra(AutofillContract.EXTRA_WEB_DOMAIN))
    map.putString("packageName", intent.getStringExtra(AutofillContract.EXTRA_PACKAGE))
    map.putBoolean("hasUsername", intent.hasExtra(AutofillContract.EXTRA_USERNAME_ID))
    map.putBoolean("hasPassword", intent.hasExtra(AutofillContract.EXTRA_PASSWORD_ID))
    map.putBoolean("hasOtp", intent.hasExtra(AutofillContract.EXTRA_OTP_ID))
    map.putString("savedUsername", intent.getStringExtra(AutofillContract.EXTRA_SAVE_USERNAME))
    map.putString("savedPassword", intent.getStringExtra(AutofillContract.EXTRA_SAVE_PASSWORD))
    promise.resolve(map)
  }

  /** Close the save UI (the OS save was already acknowledged by the service). */
  @ReactMethod
  fun close(promise: Promise) {
    getCurrentActivity()?.finish()
    promise.resolve(true)
  }

  @ReactMethod
  fun fillLogin(username: String?, password: String?, promise: Promise) {
    val activity = getCurrentActivity()
    if (activity == null) {
      promise.resolve(false)
      return
    }
    val builder = Dataset.Builder()
    var any = false
    val userId = idExtra(activity.intent, AutofillContract.EXTRA_USERNAME_ID)
    val passId = idExtra(activity.intent, AutofillContract.EXTRA_PASSWORD_ID)
    if (userId != null && username != null) {
      builder.setValue(userId, AutofillValue.forText(username), presentation(activity, "LT Vault"))
      any = true
    }
    if (passId != null && password != null) {
      builder.setValue(passId, AutofillValue.forText(password), presentation(activity, "LT Vault"))
      any = true
    }
    if (!any) {
      promise.resolve(false)
      return
    }
    finishWith(activity, builder.build())
    promise.resolve(true)
  }

  @ReactMethod
  fun fillOtp(code: String, promise: Promise) {
    val activity = getCurrentActivity()
    if (activity == null) {
      promise.resolve(false)
      return
    }
    val otpId = idExtra(activity.intent, AutofillContract.EXTRA_OTP_ID)
    if (otpId == null) {
      promise.resolve(false)
      return
    }
    val builder = Dataset.Builder()
      .setValue(otpId, AutofillValue.forText(code), presentation(activity, "LT Vault code"))
    finishWith(activity, builder.build())
    promise.resolve(true)
  }

  @ReactMethod
  fun cancel(promise: Promise) {
    getCurrentActivity()?.let {
      it.setResult(Activity.RESULT_CANCELED)
      it.finish()
    }
    promise.resolve(true)
  }

  /* ---- helpers --------------------------------------------------------- */

  private fun presentation(activity: Activity, text: String): RemoteViews =
    RemoteViews(activity.packageName, android.R.layout.simple_list_item_1).apply {
      setTextViewText(android.R.id.text1, text)
    }

  @Suppress("DEPRECATION")
  private fun idExtra(intent: Intent, key: String): AutofillId? =
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      intent.getParcelableExtra(key, AutofillId::class.java)
    } else {
      intent.getParcelableExtra(key)
    }

  private fun finishWith(activity: Activity, dataset: Dataset) {
    val reply = Intent().putExtra(AutofillManager.EXTRA_AUTHENTICATION_RESULT, dataset)
    activity.setResult(Activity.RESULT_OK, reply)
    activity.finish()
  }

  companion object {
    const val NAME = "VaultAutofill"
  }
}
