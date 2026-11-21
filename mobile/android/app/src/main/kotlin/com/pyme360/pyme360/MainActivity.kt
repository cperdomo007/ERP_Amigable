package com.pyme360.mobile

import android.app.Activity
import android.content.Intent
import android.print.PrintManager
import android.util.Base64
import android.webkit.WebView
import android.webkit.WebViewClient
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterActivity() {
    private var exportBytes: ByteArray? = null
    private var exportResult: MethodChannel.Result? = null
    private var printView: WebView? = null

    override fun configureFlutterEngine(engine: FlutterEngine) {
        super.configureFlutterEngine(engine)
        MethodChannel(engine.dartExecutor.binaryMessenger, "com.pyme360/files").setMethodCallHandler { call, result ->
            when (call.method) {
                "export" -> {
                    if (exportResult != null) { result.error("BUSY", "Terminá de guardar el archivo anterior.", null); return@setMethodCallHandler }
                    try {
                        val encoded = call.argument<String>("base64") ?: error("Archivo vacío")
                        require(encoded.length <= 28000000)
                        val bytes = Base64.decode(encoded, Base64.DEFAULT)
                        require(bytes.size <= 20 * 1024 * 1024)
                        val intent = Intent(Intent.ACTION_CREATE_DOCUMENT).apply {
                            addCategory(Intent.CATEGORY_OPENABLE)
                            type = call.argument<String>("mime")?.ifBlank { "application/octet-stream" } ?: "application/octet-stream"
                            putExtra(Intent.EXTRA_TITLE, (call.argument<String>("name") ?: "Pyme360").replace(Regex("[\\\\/]"), "_"))
                        }
                        exportBytes = bytes; exportResult = result
                        startActivityForResult(intent, 360)
                    } catch (_: Exception) { exportBytes = null; exportResult = null; result.error("EXPORT", "No se pudo preparar el archivo.", null) }
                }
                "print" -> {
                    try {
                        val html = call.argument<String>("html") ?: error("Documento vacío")
                        require(html.length <= 20 * 1024 * 1024)
                        val base = call.argument<String>("baseUrl") ?: error("Origen inválido")
                        require(base.startsWith("http://127.0.0.1:"))
                        printView?.destroy()
                        val view = WebView(this); printView = view
                        view.settings.javaScriptEnabled = false
                        view.webViewClient = object : WebViewClient() {
                            override fun onPageFinished(web: WebView, url: String) {
                                (getSystemService(PRINT_SERVICE) as PrintManager).print("Pyme 360", web.createPrintDocumentAdapter("Pyme 360"), null)
                            }
                        }
                        view.loadDataWithBaseURL(base, html, "text/html", "UTF-8", null)
                        result.success(true)
                    } catch (_: Exception) { result.error("PRINT", "No se pudo preparar la impresión.", null) }
                }
                else -> result.notImplemented()
            }
        }
    }

    @Deprecated("Android activity result bridge")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode != 360) return
        val bytes = exportBytes; val result = exportResult
        exportBytes = null; exportResult = null
        if (resultCode != Activity.RESULT_OK || data?.data == null || bytes == null) { result?.success(false); return }
        Thread {
            try {
                contentResolver.openOutputStream(data.data!!).use { output -> requireNotNull(output).write(bytes) }
                runOnUiThread { result?.success(true) }
            } catch (_: Exception) { runOnUiThread { result?.error("EXPORT", "No se pudo guardar el archivo.", null) } }
        }.start()
    }

    override fun onDestroy() { exportBytes = null; exportResult = null; printView?.destroy(); printView = null; super.onDestroy() }
}
