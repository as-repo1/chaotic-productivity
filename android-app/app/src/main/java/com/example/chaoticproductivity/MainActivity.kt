package com.example.chaoticproductivity

import android.annotation.SuppressLint
import android.net.Uri
import android.os.Bundle
import android.webkit.JavascriptInterface
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.viewinterop.AndroidView
import com.example.chaoticproductivity.theme.ChaoticProductivityTheme
import java.io.InputStream
import java.io.OutputStream
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class MainActivity : ComponentActivity() {
    private lateinit var webView: WebView

    // Callback for file chooser (supports native input file dialogs inside WebView)
    private var filePathCallback: ValueCallback<Array<Uri>>? = null
    private val fileChooserLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == RESULT_OK) {
            val data = result.data
            val uris = WebChromeClient.FileChooserParams.parseResult(result.resultCode, data)
            filePathCallback?.onReceiveValue(uris)
        } else {
            filePathCallback?.onReceiveValue(null)
        }
        filePathCallback = null
    }

    // Launchers for system file picker export/import
    private var backupDataToSave: String? = null
    private val saveBackupLauncher = registerForActivityResult(
        ActivityResultContracts.CreateDocument("application/json")
    ) { uri ->
        if (uri != null && backupDataToSave != null) {
            try {
                contentResolver.openOutputStream(uri)?.use { outputStream: OutputStream ->
                    outputStream.write(backupDataToSave!!.toByteArray())
                    outputStream.flush()
                }
                webView.post {
                    webView.evaluateJavascript("if (typeof window.showToast === 'function') { window.showToast('Backup exported successfully!', 'success'); } else { alert('Backup exported successfully!'); }", null)
                }
            } catch (e: Exception) {
                e.printStackTrace()
                webView.post {
                    val errMsg = e.message?.replace("'", "\\'") ?: "Unknown error"
                    webView.evaluateJavascript("if (typeof window.showToast === 'function') { window.showToast('Failed to export backup: $errMsg', 'error'); } else { alert('Failed to export backup: $errMsg'); }", null)
                }
            }
        }
        backupDataToSave = null
    }

    private val loadBackupLauncher = registerForActivityResult(
        ActivityResultContracts.OpenDocument()
    ) { uri ->
        if (uri != null) {
            try {
                contentResolver.openInputStream(uri)?.use { inputStream: InputStream ->
                    val json = inputStream.bufferedReader().use { it.readText() }
                    // Escape single quotes and newlines for safe JS execution
                    val escapedJson = json.replace("\\", "\\\\")
                                          .replace("'", "\\'")
                                          .replace("\n", "\\n")
                                          .replace("\r", "")
                    webView.post {
                        webView.evaluateJavascript("window.restoreBackup('$escapedJson')", null)
                    }
                }
            } catch (e: Exception) {
                e.printStackTrace()
                webView.post {
                    val errMsg = e.message?.replace("'", "\\'") ?: "Unknown error"
                    webView.evaluateJavascript("if (typeof window.showToast === 'function') { window.showToast('Failed to import backup: $errMsg', 'error'); } else { alert('Failed to import backup: $errMsg'); }", null)
                }
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            ChaoticProductivityTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    WebViewScreen(
                        url = "file:///android_asset/index.html",
                        modifier = Modifier.fillMaxSize().safeDrawingPadding()
                    )
                }
            }
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    @Composable
    fun WebViewScreen(url: String, modifier: Modifier = Modifier) {
        AndroidView(
            modifier = modifier,
            factory = { context ->
                WebView(context).apply {
                    webView = this
                    settings.apply {
                        javaScriptEnabled = true
                        domStorageEnabled = true
                        allowFileAccess = true
                        allowContentAccess = true
                        databaseEnabled = true
                        mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
                    }
                    webViewClient = object : WebViewClient() {
                        override fun shouldOverrideUrlLoading(view: WebView?, url: String?): Boolean {
                            if (url != null && url.startsWith("file:///android_asset/")) {
                                return false
                            }
                            return false
                        }
                    }
                    webChromeClient = object : WebChromeClient() {
                        override fun onShowFileChooser(
                            webView: WebView?,
                            filePathCallback: ValueCallback<Array<Uri>>?,
                            fileChooserParams: FileChooserParams?
                        ): Boolean {
                            this@MainActivity.filePathCallback = filePathCallback
                            val intent = fileChooserParams?.createIntent()
                            if (intent != null) {
                                fileChooserLauncher.launch(intent)
                                return true
                            }
                            return false
                        }
                    }
                    addJavascriptInterface(WebAppInterface(), "AndroidBridge")
                    loadUrl(url)
                }
            }
        )
    }

    inner class WebAppInterface {
        @JavascriptInterface
        fun exportBackup(json: String) {
            backupDataToSave = json
            val dateStr = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())
            saveBackupLauncher.launch("chaotic-productivity-backup-$dateStr.json")
        }

        @JavascriptInterface
        fun importBackup() {
            loadBackupLauncher.launch(arrayOf("application/json"))
        }
    }
}
