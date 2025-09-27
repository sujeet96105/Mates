package com.mates

import android.content.ContentValues
import android.content.Context
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import android.util.Base64
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import com.facebook.react.bridge.Arguments
import java.io.File
import java.io.FileOutputStream
import java.io.OutputStream

class FileSaverModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "FileSaver"
    }

    @ReactMethod
    fun savePdfToDownloads(fileName: String, base64Data: String, promise: Promise) {
        try {
            val pdfBytes = Base64.decode(base64Data, Base64.DEFAULT)
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                // Android 10+ (API 29+) - Use MediaStore API
                savePdfWithMediaStore(fileName, pdfBytes, promise)
            } else {
                // Android 9 and below - Use legacy external storage
                savePdfLegacy(fileName, pdfBytes, promise)
            }
        } catch (e: Exception) {
            promise.reject("ERROR_SAVING_PDF", "Failed to save PDF: ${e.message}", e)
        }
    }

    private fun savePdfWithMediaStore(fileName: String, pdfBytes: ByteArray, promise: Promise) {
        try {
            val contentValues = ContentValues().apply {
                put(MediaStore.MediaColumns.DISPLAY_NAME, fileName)
                put(MediaStore.MediaColumns.MIME_TYPE, "application/pdf")
                put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS)
            }

            val uri = reactApplicationContext.contentResolver.insert(
                MediaStore.Downloads.EXTERNAL_CONTENT_URI, 
                contentValues
            )

            uri?.let { fileUri ->
                reactApplicationContext.contentResolver.openOutputStream(fileUri)?.use { outputStream ->
                    outputStream.write(pdfBytes)
                    outputStream.flush()
                }
                
                // Return success with public path indication
                val result = Arguments.createMap().apply {
                    putString("filePath", "/storage/emulated/0/Download/$fileName")
                    putString("uri", fileUri.toString())
                    putBoolean("success", true)
                    putString("message", "PDF saved to Downloads folder")
                }
                promise.resolve(result)
            } ?: run {
                promise.reject("ERROR_MEDIA_STORE", "Failed to create file entry in MediaStore")
            }
        } catch (e: Exception) {
            promise.reject("ERROR_MEDIA_STORE", "MediaStore save failed: ${e.message}", e)
        }
    }

    private fun savePdfLegacy(fileName: String, pdfBytes: ByteArray, promise: Promise) {
        try {
            val downloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
            if (!downloadsDir.exists()) {
                downloadsDir.mkdirs()
            }
            
            val file = File(downloadsDir, fileName)
            FileOutputStream(file).use { outputStream ->
                outputStream.write(pdfBytes)
                outputStream.flush()
            }
            
            val result = Arguments.createMap().apply {
                putString("filePath", file.absolutePath)
                putString("uri", "file://${file.absolutePath}")
                putBoolean("success", true)
                putString("message", "PDF saved to Downloads folder")
            }
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("ERROR_LEGACY_SAVE", "Legacy save failed: ${e.message}", e)
        }
    }

    @ReactMethod
    fun checkStoragePermission(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                // Android 10+ doesn't need special permission for MediaStore Downloads
                promise.resolve(true)
            } else {
                // For older versions, we'd need to check WRITE_EXTERNAL_STORAGE
                // But this is handled by the JavaScript permission system
                promise.resolve(true)
            }
        } catch (e: Exception) {
            promise.reject("ERROR_PERMISSION_CHECK", "Permission check failed: ${e.message}", e)
        }
    }
}
