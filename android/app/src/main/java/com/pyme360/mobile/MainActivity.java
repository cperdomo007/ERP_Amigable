package com.pyme360.mobile;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.print.PrintManager;
import android.text.InputType;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;
import org.json.JSONObject;
import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/** Local bundled UI; all authenticated HTTP requests run outside the WebView. */
public class MainActivity extends Activity {
    private static final String APP_HOST = "app.pyme360.local";
    private final ExecutorService network = Executors.newSingleThreadExecutor();
    private WebView web;
    private volatile String token = "";
    private volatile String server = "";
    private volatile int generation = 0;
    private ValueCallback<Uri[]> fileCallback;
    private byte[] exportBytes;
    private boolean destroyed;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        server = getPreferences(MODE_PRIVATE).getString("server", "");
        if (server.isEmpty()) showServer(); else showApp();
    }

    private int dp(int value) { return (int)(value * getResources().getDisplayMetrics().density); }
    private void toast(String message) { Toast.makeText(this, message, Toast.LENGTH_LONG).show(); }
    private boolean debug() { return (getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0; }

    private String normalizeServer(String text) throws Exception {
        URI uri = new URI(text.trim());
        boolean localDebug = debug() && "http".equals(uri.getScheme()) && "10.0.2.2".equals(uri.getHost());
        if (!("https".equals(uri.getScheme()) || localDebug) || uri.getHost() == null
                || uri.getRawUserInfo() != null || uri.getRawQuery() != null || uri.getRawFragment() != null
                || !(uri.getPath() == null || uri.getPath().isEmpty() || "/".equals(uri.getPath()))) {
            throw new Exception("Ingresá el dominio HTTPS de tu ERP, sin rutas ni credenciales. En el emulador debug se permite http://10.0.2.2:3002.");
        }
        return uri.getScheme() + "://" + uri.getRawAuthority();
    }

    private void showServer() {
        LinearLayout layout = new LinearLayout(this); layout.setOrientation(LinearLayout.VERTICAL);
        layout.setPadding(dp(24), dp(36), dp(24), dp(24)); layout.setBackgroundColor(Color.rgb(244,248,252));
        TextView title = new TextView(this); title.setText(R.string.app_name); title.setTextSize(32); title.setTextColor(Color.rgb(16,46,75)); layout.addView(title);
        TextView help = new TextView(this); help.setText("Tu negocio, siempre cerca.\n\nConectá la app al servidor de tu empresa. Después ingresá con el mismo usuario del ERP web.\n\nDirección del servidor HTTPS"); help.setTextSize(17); help.setPadding(0,dp(18),0,dp(16)); layout.addView(help);
        EditText address = new EditText(this); address.setSingleLine(true); address.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_URI); address.setHint("https://erp.tuempresa.com"); address.setText(server); layout.addView(address);
        Button save = new Button(this); save.setText(R.string.connect_company); layout.addView(save);
        save.setOnClickListener(v -> {
            try {
                String next = normalizeServer(address.getText().toString());
                generation++; token = ""; server = next;
                getPreferences(MODE_PRIVATE).edit().putString("server", next).apply(); showApp();
            } catch (Exception error) { address.setError(error.getMessage()); }
        });
        setContentView(layout);
    }

    @SuppressWarnings("SetJavaScriptEnabled") private void showApp() {
        LinearLayout root = new LinearLayout(this); root.setOrientation(LinearLayout.VERTICAL);
        root.setOnApplyWindowInsetsListener((view,insets) -> {
            view.setPadding(insets.getSystemWindowInsetLeft(),insets.getSystemWindowInsetTop(),insets.getSystemWindowInsetRight(),insets.getSystemWindowInsetBottom()); return insets;
        });
        LinearLayout bar = new LinearLayout(this); bar.setPadding(dp(12),0,dp(8),0); bar.setGravity(android.view.Gravity.CENTER_VERTICAL); bar.setBackgroundColor(Color.rgb(16,46,75));
        TextView brand = new TextView(this); brand.setText(R.string.app_name); brand.setTextColor(Color.WHITE); brand.setTextSize(18); bar.addView(brand,new LinearLayout.LayoutParams(0,dp(48),1)); brand.setGravity(android.view.Gravity.CENTER_VERTICAL);
        Button refresh = new Button(this); refresh.setText(R.string.refresh); bar.addView(refresh);
        refresh.setOnClickListener(v -> new AlertDialog.Builder(this).setTitle("Actualizar datos")
            .setMessage("Se cargarán los datos actuales del ERP. Los cambios sin guardar se perderán.")
            .setNegativeButton("Cancelar",null).setPositiveButton("Actualizar",(d,w)->{if(web!=null)web.reload();}).show());
        Button settings = new Button(this); settings.setText(R.string.server); settings.setContentDescription("Cambiar servidor y cerrar sesión"); bar.addView(settings);
        settings.setOnClickListener(v -> new AlertDialog.Builder(this).setTitle("Cambiar servidor")
            .setMessage("Se cerrará la sesión de esta app. Guardá los cambios pendientes antes de continuar.")
            .setNegativeButton("Cancelar",null).setPositiveButton("Continuar",(dialog,which) -> {
                final String oldServer=server,oldToken=token;
                generation++; token="";
                if(!oldToken.isEmpty()) network.execute(() -> { try { http(oldServer,"auth/logout","{}",oldToken); } catch(Exception ignored) {} });
                disposeWeb(); showServer();
            }).show());
        root.addView(bar);
        web = new WebView(this); final WebView current=web;
        WebSettings config = web.getSettings(); config.setJavaScriptEnabled(true); config.setDomStorageEnabled(true);
        config.setAllowFileAccess(false); config.setAllowContentAccess(false); config.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        config.setJavaScriptCanOpenWindowsAutomatically(false); config.setSaveFormData(false);
        config.setCacheMode(WebSettings.LOAD_NO_CACHE);
        android.webkit.CookieManager.getInstance().setAcceptCookie(false);
        web.addJavascriptInterface(new NativeBridge(current),"Pyme360Native");
        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request) { return true; }
            @Override public WebResourceResponse shouldInterceptRequest(WebView view,WebResourceRequest request) {
                Uri uri=request.getUrl();
                if(!"https".equals(uri.getScheme()) || !APP_HOST.equals(uri.getHost()) || !"GET".equals(request.getMethod()))return empty();
                String path=uri.getPath();
                if(path==null || path.contains(".."))return empty();
                if("/".equals(path))path="/index.html";
                String mime=path.endsWith(".js")?"text/javascript":path.endsWith(".css")?"text/css":path.endsWith(".html")?"text/html":path.endsWith(".svg")?"image/svg+xml":"application/octet-stream";
                try { return new WebResourceResponse(mime,"UTF-8",getAssets().open("web"+path)); } catch(Exception error){ return empty(); }
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onShowFileChooser(WebView view,ValueCallback<Uri[]> callback,FileChooserParams params) {
                if(fileCallback!=null)fileCallback.onReceiveValue(null);fileCallback=callback;
                Intent intent=new Intent(Intent.ACTION_OPEN_DOCUMENT);intent.addCategory(Intent.CATEGORY_OPENABLE);intent.setType("*/*");
                try{startActivityForResult(intent,10);}catch(Exception error){fileCallback.onReceiveValue(null);fileCallback=null;toast("No se encontró un selector de archivos.");}return true;
            }
        });
        root.addView(web,new LinearLayout.LayoutParams(-1,0,1));setContentView(root);root.requestApplyInsets();
        web.loadUrl("https://"+APP_HOST+"/index.html");
    }

    private WebResourceResponse empty(){return new WebResourceResponse("text/plain","UTF-8",403,"Blocked",java.util.Collections.emptyMap(),new ByteArrayInputStream(new byte[0]));}

    private JSONObject http(String base,String path,String body,String accessToken) throws Exception {
        HttpURLConnection connection=(HttpURLConnection)new URI(base+"/api/erp/"+path).toURL().openConnection();
        connection.setInstanceFollowRedirects(false);connection.setConnectTimeout(15000);connection.setReadTimeout(60000);
        connection.setRequestMethod(body.isEmpty()?"GET":"POST");connection.setRequestProperty("X-ERP-Client","mobile");
        connection.setRequestProperty("Accept","application/json");if(!accessToken.isEmpty())connection.setRequestProperty("Authorization","Bearer "+accessToken);
        try{
            if(!body.isEmpty()){connection.setDoOutput(true);connection.setRequestProperty("Content-Type","application/json; charset=utf-8");try(OutputStream out=connection.getOutputStream()){out.write(body.getBytes(StandardCharsets.UTF_8));}}
            int status=connection.getResponseCode();InputStream input=status>=400?connection.getErrorStream():connection.getInputStream();
            String text="";if(input!=null)try(InputStream stream=input){java.io.ByteArrayOutputStream buffer=new java.io.ByteArrayOutputStream();byte[] chunk=new byte[8192];int size;while((size=stream.read(chunk))!=-1){if(buffer.size()+size>32*1024*1024)throw new Exception("Respuesta demasiado grande.");buffer.write(chunk,0,size);}text=buffer.toString("UTF-8");}
            JSONObject data;try{data=new JSONObject(text);}catch(Exception error){data=new JSONObject().put("error","El servidor no devolvió una respuesta válida. Revisá la dirección de la API.");if(status<400)status=502;}
            return new JSONObject().put("status",status).put("data",data);
        }finally{connection.disconnect();}
    }

    private class NativeBridge {
        private final WebView owner;
        NativeBridge(WebView owner){this.owner=owner;}
        @JavascriptInterface public void request(String id,String path,String body){
            final int version=generation;final String base=server;
            network.execute(() -> {
                JSONObject result;
                try{
                    if(!path.matches("state|alerts|assistant|commands|auth/(login|logout|credential)|backups(?:/[0-9]+)?|audit"))throw new Exception("Operación no disponible.");
                    if(version!=generation)return;
                    result=http(base,path,body,token);
                    JSONObject data=result.getJSONObject("data");int status=result.getInt("status");
                    if(version!=generation)return;
                    if(path.equals("auth/login")&&status==200){token=data.getString("accessToken");data.remove("accessToken");data.remove("tokenType");data.remove("expiresIn");}
                    if(status==401 || path.equals("auth/logout"))token="";
                }catch(Exception error){
                    result=new JSONObject();try{result.put("status",503).put("data",new JSONObject().put("error","No se pudo conectar. Revisá el servidor y tu conexión. Si estabas guardando, actualizá los datos antes de reintentar."));}catch(Exception ignored){}
                }
                try{result.put("id",id);}catch(Exception ignored){}
                final String json=result.toString();
                runOnUiThread(() -> {if(!destroyed&&web==owner&&version==generation)owner.evaluateJavascript("window.dispatchEvent(new CustomEvent('pyme360-response',{detail:"+json+"}));",null);});
            });
        }
        @JavascriptInterface public void exportFile(String name,String mime,String base64){
            if(base64.length()>28_000_000){runOnUiThread(()->toast("El archivo supera el límite de exportación móvil de 20 MB."));return;}
            runOnUiThread(()->{
                if(web!=owner||destroyed)return;
                if(exportBytes!=null){toast("Terminá de guardar el archivo anterior.");return;}
                try{
                    exportBytes=android.util.Base64.decode(base64,android.util.Base64.DEFAULT);
                    Intent intent=new Intent(Intent.ACTION_CREATE_DOCUMENT);intent.addCategory(Intent.CATEGORY_OPENABLE);
                    intent.setType(mime.isEmpty()?"application/octet-stream":mime);intent.putExtra(Intent.EXTRA_TITLE,name.replaceAll("[\\\\/]","_"));startActivityForResult(intent,11);
                }catch(Exception error){exportBytes=null;toast("No se pudo exportar el archivo.");}
            });
        }
        @JavascriptInterface public void printDocument(){runOnUiThread(()->{if(web==owner&&!destroyed)((PrintManager)getSystemService(PRINT_SERVICE)).print("Pyme 360",owner.createPrintDocumentAdapter("Pyme 360"),null);});}
    }

    @Override protected void onActivityResult(int requestCode,int resultCode,Intent data){
        super.onActivityResult(requestCode,resultCode,data);
        if(requestCode==10&&fileCallback!=null){fileCallback.onReceiveValue(resultCode==RESULT_OK&&data!=null&&data.getData()!=null?new Uri[]{data.getData()}:null);fileCallback=null;}
        if(requestCode==11){
            byte[] bytes=exportBytes;exportBytes=null;
            if(resultCode==RESULT_OK&&data!=null&&data.getData()!=null&&bytes!=null){
                Uri destination=data.getData();network.execute(()->{try(OutputStream out=getContentResolver().openOutputStream(destination)){if(out==null)throw new Exception();out.write(bytes);runOnUiThread(()->toast("Archivo guardado."));}catch(Exception error){runOnUiThread(()->toast("No se pudo guardar el archivo."));}});
            }
        }
    }
    @Override public void onBackPressed(){
        new AlertDialog.Builder(this).setTitle("Salir de Pyme 360").setMessage("Los cambios sin guardar se perderán.").setNegativeButton("Seguir",null).setPositiveButton("Salir",(d,w)->finish()).show();
    }
    private void disposeWeb(){if(fileCallback!=null){fileCallback.onReceiveValue(null);fileCallback=null;}if(web!=null){web.removeJavascriptInterface("Pyme360Native");web.destroy();web=null;}}
    @Override protected void onDestroy(){destroyed=true;generation++;token="";disposeWeb();network.shutdownNow();super.onDestroy();}
}
