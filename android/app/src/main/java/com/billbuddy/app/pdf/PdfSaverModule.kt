package com.billbuddy.app.pdf

import android.app.Activity
import android.content.ActivityNotFoundException
import android.content.ClipData
import android.content.ContentValues
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import android.util.Base64
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.facebook.react.modules.core.PermissionAwareActivity
import com.facebook.react.modules.core.PermissionListener
import java.io.IOException

class PdfSaverModule(private val reactCtx: ReactApplicationContext) : ReactContextBaseJavaModule(reactCtx), ActivityEventListener {
  private var pendingPromise: Promise? = null
  private var pendingBytes: ByteArray? = null

  init {
    reactCtx.addActivityEventListener(this)
  }

  @ReactMethod
  fun openPdfUri(uriString: String, promise: Promise) {
    try {
      val uri = Uri.parse(uriString)
      val intent = Intent(Intent.ACTION_VIEW).apply {
        setDataAndType(uri, "application/pdf")
        addCategory(Intent.CATEGORY_DEFAULT)
        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION)
        addFlags(Intent.FLAG_GRANT_PREFIX_URI_PERMISSION)
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }

      // Attach ClipData to ensure grant on some OEMs
      val clipData = ClipData.newUri(reactCtx.contentResolver, "PDF", uri)
      intent.clipData = clipData

      // Proactively grant read permission to all resolved activities
      val pm = reactCtx.packageManager
      val handlers = pm.queryIntentActivities(intent, 0)
      for (ri in handlers) {
        val pkg = ri.activityInfo?.packageName
        if (pkg != null) {
          try {
            reactCtx.grantUriPermission(
              pkg,
              uri,
              Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION or Intent.FLAG_GRANT_PREFIX_URI_PERMISSION
            )
          } catch (_: Exception) {}
        }
      }

      val chooser = Intent.createChooser(intent, "Open PDF").apply {
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION)
        addFlags(Intent.FLAG_GRANT_PREFIX_URI_PERMISSION)
      }
      chooser.clipData = clipData

      try {
        reactCtx.startActivity(chooser)
        promise.resolve(true)
      } catch (e: ActivityNotFoundException) {
        promise.reject("NO_HANDLER", "No application available to open PDF", e)
      }
    } catch (e: Exception) {
      promise.reject("OPEN_PDF_ERROR", e.message, e)
    }
  }

  override fun getName(): String = "PdfSaver"

  @ReactMethod
  fun createDocumentAndWrite(base64Pdf: String, filename: String, promise: Promise) {
    try {
      val bytes = Base64.decode(base64Pdf, Base64.DEFAULT)
      val activity = currentActivity
      if (activity == null) {
        promise.reject("NO_ACTIVITY", "Activity is not available")
        return
      }
      if (pendingPromise != null) {
        promise.reject("IN_PROGRESS", "Another save operation is in progress")
        return
      }
      pendingPromise = promise
      pendingBytes = bytes

      val intent = Intent(Intent.ACTION_CREATE_DOCUMENT).apply {
        addCategory(Intent.CATEGORY_OPENABLE)
        type = "application/pdf"
        putExtra(Intent.EXTRA_TITLE, filename)
      }
      activity.startActivityForResult(intent, REQUEST_CREATE_DOCUMENT)
    } catch (e: Exception) {
      promise.reject("CREATE_DOC_ERROR", e.message, e)
    }
  }

  @ReactMethod
  fun saveToDownloads(base64Pdf: String, filename: String, promise: Promise) {
    try {
      val bytes = Base64.decode(base64Pdf, Base64.DEFAULT)
      val resolver = reactCtx.contentResolver
      val cv = ContentValues().apply {
        put(MediaStore.MediaColumns.DISPLAY_NAME, filename)
        put(MediaStore.MediaColumns.MIME_TYPE, "application/pdf")
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
          put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS)
        }
      }
      val collection: Uri = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        MediaStore.Downloads.EXTERNAL_CONTENT_URI
      } else {
        // Pre-Android 10: still use Downloads; may require permissions on very old devices
        MediaStore.Files.getContentUri("external")
      }
      val uri = resolver.insert(collection, cv)
      if (uri == null) {
        promise.reject("MEDIASTORE_INSERT_FAILED", "Could not create item in MediaStore")
        return
      }
      resolver.openOutputStream(uri)?.use { out ->
        out.write(bytes)
        out.flush()
      } ?: run {
        promise.reject("OPEN_STREAM_FAILED", "Failed to open output stream")
        return
      }
      promise.resolve(uri.toString())
    } catch (e: Exception) {
      promise.reject("DOWNLOADS_SAVE_ERROR", e.message, e)
    }
  }

  override fun onActivityResult(activity: Activity, requestCode: Int, resultCode: Int, data: Intent?) {
    if (requestCode == REQUEST_CREATE_DOCUMENT) {
      val promise = pendingPromise
      val bytes = pendingBytes
      pendingPromise = null
      pendingBytes = null

      if (promise == null) return

      if (resultCode != Activity.RESULT_OK) {
        promise.reject("USER_CANCELED", "User canceled the document picker")
        return
      }
      val uri = data?.data
      if (uri == null) {
        promise.reject("NO_URI", "No Uri returned by picker")
        return
      }
      try {
        reactCtx.contentResolver.openOutputStream(uri)?.use { out ->
          if (bytes != null) {
            out.write(bytes)
            out.flush()
          }
        } ?: run {
          promise.reject("OPEN_STREAM_FAILED", "Failed to open output stream")
          return
        }
        promise.resolve(uri.toString())
      } catch (e: IOException) {
        promise.reject("WRITE_ERROR", e.message, e)
      }
    }
  }

  override fun onNewIntent(intent: Intent) { /* no-op */ }

  companion object {
    private const val REQUEST_CREATE_DOCUMENT = 9912
  }
}
