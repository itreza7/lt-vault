package com.larateam.myvault.autofill

/** Intent-extra keys shared between the AutofillService and the auth Activity/module. */
object AutofillContract {
  const val EXTRA_USERNAME_ID = "lt_username_id"
  const val EXTRA_PASSWORD_ID = "lt_password_id"
  const val EXTRA_OTP_ID = "lt_otp_id"
  const val EXTRA_WEB_DOMAIN = "lt_web_domain"
  const val EXTRA_PACKAGE = "lt_package"

  // Save-new-login flow.
  const val EXTRA_MODE = "lt_mode" // "fill" (default) | "save"
  const val EXTRA_SAVE_USERNAME = "lt_save_username"
  const val EXTRA_SAVE_PASSWORD = "lt_save_password"
}
