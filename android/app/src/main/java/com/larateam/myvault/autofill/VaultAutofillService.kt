package com.larateam.myvault.autofill

import android.app.PendingIntent
import android.app.assist.AssistStructure
import android.content.Intent
import android.os.CancellationSignal
import android.service.autofill.AutofillService
import android.service.autofill.FillCallback
import android.service.autofill.FillRequest
import android.service.autofill.FillResponse
import android.service.autofill.SaveCallback
import android.service.autofill.SaveInfo
import android.service.autofill.SaveRequest
import android.text.InputType
import android.view.View
import android.view.autofill.AutofillId
import android.widget.RemoteViews

/**
 * LT Vault autofill service.
 *
 * It cannot decrypt the vault itself (the master passphrase lives only in the
 * RN layer / behind biometrics), so every fill request is answered with an
 * authentication-required response that launches [VaultAutofillActivity]. That
 * RN activity unlocks the vault, finds the matching login, and returns the
 * Dataset. Save-new-credentials is intentionally not implemented in this pass.
 */
class VaultAutofillService : AutofillService() {

  override fun onFillRequest(
    request: FillRequest,
    cancellationSignal: CancellationSignal,
    callback: FillCallback,
  ) {
    val contexts = request.fillContexts
    if (contexts.isEmpty()) {
      callback.onSuccess(null)
      return
    }
    val parsed = parse(contexts[contexts.size - 1].structure)
    // Never offer to fill into LT Vault itself.
    if (parsed.packageName == packageName) {
      callback.onSuccess(null)
      return
    }

    val ids = listOfNotNull(parsed.usernameId, parsed.passwordId, parsed.otpId)
    if (ids.isEmpty()) {
      callback.onSuccess(null)
      return
    }

    val authIntent = Intent(this, VaultAutofillActivity::class.java).apply {
      putExtra(AutofillContract.EXTRA_MODE, "fill")
      parsed.usernameId?.let { putExtra(AutofillContract.EXTRA_USERNAME_ID, it) }
      parsed.passwordId?.let { putExtra(AutofillContract.EXTRA_PASSWORD_ID, it) }
      parsed.otpId?.let { putExtra(AutofillContract.EXTRA_OTP_ID, it) }
      parsed.webDomain?.let { putExtra(AutofillContract.EXTRA_WEB_DOMAIN, it) }
      putExtra(AutofillContract.EXTRA_PACKAGE, parsed.packageName)
    }
    val pending = PendingIntent.getActivity(
      this,
      nextRequestCode(),
      authIntent,
      PendingIntent.FLAG_CANCEL_CURRENT or PendingIntent.FLAG_MUTABLE,
    )

    val label = if (parsed.otpId != null && parsed.passwordId == null) {
      "🔑  Fill 2FA code from LT Vault"
    } else {
      "🔒  Unlock LT Vault to fill"
    }
    val presentation = RemoteViews(packageName, android.R.layout.simple_list_item_1).apply {
      setTextViewText(android.R.id.text1, label)
    }

    val builder = FillResponse.Builder()
      .setAuthentication(ids.toTypedArray(), pending.intentSender, presentation)

    // Offer to save to LT Vault when the form has a password field.
    if (parsed.passwordId != null) {
      var saveType = SaveInfo.SAVE_DATA_TYPE_PASSWORD
      if (parsed.usernameId != null) {
        saveType = saveType or SaveInfo.SAVE_DATA_TYPE_USERNAME
      }
      val saveIds = listOfNotNull(parsed.usernameId, parsed.passwordId).toTypedArray()
      builder.setSaveInfo(SaveInfo.Builder(saveType, saveIds).build())
    }

    callback.onSuccess(builder.build())
  }

  override fun onSaveRequest(request: SaveRequest, callback: SaveCallback) {
    val contexts = request.fillContexts
    if (contexts.isEmpty()) {
      callback.onSuccess()
      return
    }
    val parsed = parse(contexts[contexts.size - 1].structure)
    val password = parsed.passwordValue
    // Acknowledge (and bail) for our own app or an empty password.
    if (parsed.packageName == packageName || password.isNullOrEmpty()) {
      callback.onSuccess()
      return
    }
    // Hand the captured credentials to the RN activity, which unlocks the vault
    // and persists the login. The OS save is acknowledged immediately.
    val intent = Intent(this, VaultAutofillActivity::class.java).apply {
      putExtra(AutofillContract.EXTRA_MODE, "save")
      putExtra(AutofillContract.EXTRA_SAVE_USERNAME, parsed.usernameValue)
      putExtra(AutofillContract.EXTRA_SAVE_PASSWORD, password)
      parsed.webDomain?.let { putExtra(AutofillContract.EXTRA_WEB_DOMAIN, it) }
      putExtra(AutofillContract.EXTRA_PACKAGE, parsed.packageName)
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
    }
    startActivity(intent)
    callback.onSuccess()
  }

  private fun parse(structure: AssistStructure): Parsed {
    val parsed = Parsed()
    parsed.packageName = try {
      structure.activityComponent?.packageName
    } catch (e: Throwable) {
      null
    }
    for (i in 0 until structure.windowNodeCount) {
      traverse(structure.getWindowNodeAt(i).rootViewNode, parsed)
    }
    return parsed
  }

  private fun traverse(node: AssistStructure.ViewNode, out: Parsed) {
    node.webDomain?.let { if (out.webDomain == null && it.isNotEmpty()) out.webDomain = it }
    val id = node.autofillId
    if (id != null && node.autofillType == View.AUTOFILL_TYPE_TEXT) {
      when (classify(node)) {
        Kind.PASSWORD -> if (out.passwordId == null) {
          out.passwordId = id
          out.passwordValue = textOf(node)
        }
        Kind.USERNAME -> if (out.usernameId == null) {
          out.usernameId = id
          out.usernameValue = textOf(node)
        }
        Kind.OTP -> if (out.otpId == null) out.otpId = id
        Kind.NONE -> {}
      }
    }
    for (i in 0 until node.childCount) {
      traverse(node.getChildAt(i), out)
    }
  }

  /** The text the user actually entered (for save), if any. */
  private fun textOf(node: AssistStructure.ViewNode): String? {
    val v = node.autofillValue
    if (v != null && v.isText) {
      return v.textValue?.toString()
    }
    return node.text?.toString()
  }

  private fun classify(node: AssistStructure.ViewNode): Kind {
    node.autofillHints?.forEach { h ->
      val hl = h.lowercase()
      if (hl.contains("password")) return Kind.PASSWORD
      if (hl.contains("otp") || hl.contains("one-time") || hl.contains("onetimecode") || hl.contains("2fa")) return Kind.OTP
      if (hl == "username" || hl.contains("email")) return Kind.USERNAME
    }

    val html = node.htmlInfo
    if (html != null && html.tag.equals("input", ignoreCase = true)) {
      var type = ""
      var autocomplete = ""
      var name = ""
      html.attributes?.forEach { attr ->
        when (attr.first.lowercase()) {
          "type" -> type = attr.second.lowercase()
          "autocomplete" -> autocomplete = attr.second.lowercase()
          "name", "id" -> name += " " + attr.second.lowercase()
        }
      }
      if (type == "password" || autocomplete.contains("password")) return Kind.PASSWORD
      if (autocomplete.contains("one-time-code") || name.contains("otp") || name.contains("onetime")) return Kind.OTP
      if (type == "email" || autocomplete.contains("username") || autocomplete.contains("email") ||
        name.contains("user") || name.contains("email") || name.contains("login")
      ) return Kind.USERNAME
    }

    val variation = node.inputType and InputType.TYPE_MASK_VARIATION
    if ((node.inputType and InputType.TYPE_MASK_CLASS) == InputType.TYPE_CLASS_TEXT) {
      if (variation == InputType.TYPE_TEXT_VARIATION_PASSWORD ||
        variation == InputType.TYPE_TEXT_VARIATION_WEB_PASSWORD ||
        variation == InputType.TYPE_TEXT_VARIATION_VISIBLE_PASSWORD
      ) return Kind.PASSWORD
      if (variation == InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS ||
        variation == InputType.TYPE_TEXT_VARIATION_WEB_EMAIL_ADDRESS
      ) return Kind.USERNAME
    }

    val text = ((node.hint ?: "") + " " + (node.idEntry ?: "")).lowercase()
    if (text.contains("password")) return Kind.PASSWORD
    if (text.contains("otp") || text.contains("one-time") || text.contains("2fa") || text.contains("verification code")) return Kind.OTP
    if (text.contains("email") || text.contains("user") || text.contains("login")) return Kind.USERNAME
    return Kind.NONE
  }

  private enum class Kind { USERNAME, PASSWORD, OTP, NONE }

  private class Parsed {
    var usernameId: AutofillId? = null
    var passwordId: AutofillId? = null
    var otpId: AutofillId? = null
    var webDomain: String? = null
    var packageName: String? = null
    var usernameValue: String? = null
    var passwordValue: String? = null
  }

  companion object {
    private var requestCode = 1000
    @Synchronized private fun nextRequestCode(): Int = requestCode++
  }
}
