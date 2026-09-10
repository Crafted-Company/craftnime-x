package com.craftnime.app;

import android.content.pm.ActivityInfo;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import com.getcapacitor.BridgeActivity;
import java.net.URLEncoder;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "CraftnimeNative";
    private WebView resolverWebView;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private LocalStreamProxy streamProxy;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        WebView.setWebContentsDebuggingEnabled(true);
        disableSSLCertificateChecking();

        streamProxy = new LocalStreamProxy();
        streamProxy.start();

        setupWebView();
        mainHandler.post(this::initResolverWebView);
    }

    @Override
    public void onStart() {
        super.onStart();
        setupWebView();
    }

    private void disableSSLCertificateChecking() {
        try {
            javax.net.ssl.TrustManager[] trustAllCerts = new javax.net.ssl.TrustManager[] {
                new javax.net.ssl.X509TrustManager() {
                    public java.security.cert.X509Certificate[] getAcceptedIssuers() { return null; }
                    public void checkClientTrusted(java.security.cert.X509Certificate[] certs, String authType) { }
                    public void checkServerTrusted(java.security.cert.X509Certificate[] certs, String authType) { }
                }
            };
            javax.net.ssl.SSLContext sc = javax.net.ssl.SSLContext.getInstance("SSL");
            sc.init(null, trustAllCerts, new java.security.SecureRandom());
            javax.net.ssl.HttpsURLConnection.setDefaultSSLSocketFactory(sc.getSocketFactory());
            javax.net.ssl.HttpsURLConnection.setDefaultHostnameVerifier((hostname, session) -> true);
        } catch (Exception e) {
            Log.e(TAG, "SSL disable error", e);
        }
    }

    private void setupWebView() {
        if (bridge != null && bridge.getWebView() != null) {
            WebView webView = bridge.getWebView();
            WebSettings settings = webView.getSettings();
            
            settings.setJavaScriptEnabled(true);
            settings.setDomStorageEnabled(true);
            settings.setMediaPlaybackRequiresUserGesture(false);
            settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
            settings.setAllowFileAccess(true);
            settings.setAllowContentAccess(true);
            settings.setDatabaseEnabled(true);
            settings.setBlockNetworkImage(false);
            settings.setLoadsImagesAutomatically(true);

            settings.setAllowUniversalAccessFromFileURLs(true);
            settings.setAllowFileAccessFromFileURLs(true);
            settings.setSupportMultipleWindows(true);
            settings.setJavaScriptCanOpenWindowsAutomatically(true);
            settings.setUserAgentString("Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36");

            webView.setWebChromeClient(new android.webkit.WebChromeClient() {
                @Override
                public android.graphics.Bitmap getDefaultVideoPoster() {
                    return android.graphics.Bitmap.createBitmap(1, 1, android.graphics.Bitmap.Config.ARGB_8888);
                }
            });

            webView.setWebViewClient(new com.getcapacitor.BridgeWebViewClient(bridge) {
                @Override
                public void onReceivedSslError(WebView view, android.webkit.SslErrorHandler handler, android.net.http.SslError error) {
                    handler.proceed();
                }
            });

            webView.addJavascriptInterface(new OrientationBridge(), "AndroidOrientationBridge");
            webView.addJavascriptInterface(new NativeStreamBridge(), "NativeStreamBridge");
        }
    }

    private void initResolverWebView() {
        try {
            if (resolverWebView != null) return;
            resolverWebView = new WebView(this);
            WebSettings s = resolverWebView.getSettings();
            s.setJavaScriptEnabled(true);
            s.setDomStorageEnabled(true);
            s.setMediaPlaybackRequiresUserGesture(false);
            s.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
            s.setUserAgentString("Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36");

            resolverWebView.addJavascriptInterface(new ResolverCallbackBridge(), "ResolverCallback");
            Log.e(TAG, "Offscreen Chromium Stream Resolver initialized successfully.");
        } catch (Exception e) {
            Log.e(TAG, "Failed to initialize offscreen WebView resolver", e);
        }
    }

    public class ResolverCallbackBridge {
        @JavascriptInterface
        public void onResult(final String json) {
            Log.e(TAG, "===> RESOLVER CALLBACK RECEIVED: " + json);
            mainHandler.post(() -> {
                try {
                    if (bridge != null && bridge.getWebView() != null) {
                        String jsCall = "if (typeof window.onNativeStreamResolved === 'function') { window.onNativeStreamResolved(" + json + "); }";
                        bridge.getWebView().evaluateJavascript(jsCall, null);
                        Log.e(TAG, "Dispatched stream to main frontend WebView: " + jsCall);
                    }
                } catch (Exception e) {
                    Log.e(TAG, "Failed to dispatch stream to frontend WebView", e);
                }
            });
        }
    }

    public class OrientationBridge {
        @JavascriptInterface
        public void setLandscape() {
            runOnUiThread(() -> {
                getWindow().addFlags(android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE);
            });
        }

        @JavascriptInterface
        public void setPortrait() {
            runOnUiThread(() -> {
                getWindow().clearFlags(android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT);
            });
        }

        @JavascriptInterface
        public void setUnspecified() {
            runOnUiThread(() -> {
                getWindow().clearFlags(android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED);
            });
        }
    }

    public class NativeStreamBridge {
        @JavascriptInterface
        public void fetchMalJson(final String username) {
            Log.e(TAG, "===> NATIVE JAVA FETCH MAL LIST FOR: " + username);
            new Thread(() -> {
                try {
                    String cleanUser = username.trim();
                    String malUrl = "https://myanimelist.net/animelist/" + URLEncoder.encode(cleanUser, "UTF-8") + "/load.json?offset=0&status=7";
                    java.net.URL url = new java.net.URL(malUrl);
                    java.net.HttpURLConnection conn = (java.net.HttpURLConnection) url.openConnection();
                    conn.setRequestProperty("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36");
                    conn.setRequestProperty("Accept", "application/json, text/javascript, */*; q=0.01");
                    conn.setInstanceFollowRedirects(true);
                    conn.setConnectTimeout(9000);
                    conn.setReadTimeout(9000);

                    int code = conn.getResponseCode();
                    if (code == 200) {
                        java.io.BufferedReader in = new java.io.BufferedReader(new java.io.InputStreamReader(conn.getInputStream()));
                        StringBuilder sb = new StringBuilder();
                        String line;
                        while ((line = in.readLine()) != null) {
                            sb.append(line);
                        }
                        in.close();
                        final String jsonResult = sb.toString();
                        mainHandler.post(() -> {
                            try {
                                if (bridge != null && bridge.getWebView() != null) {
                                    String safeJson = jsonResult.replace("\\", "\\\\").replace("'", "\\'").replace("\n", "\\n").replace("\r", "");
                                    bridge.getWebView().evaluateJavascript("if (typeof window.onNativeMalLoaded === 'function') { window.onNativeMalLoaded('" + safeJson + "'); }", null);
                                    Log.e(TAG, "Successfully pushed native MAL data to frontend (" + jsonResult.length() + " bytes)");
                                }
                            } catch (Exception e) {
                                Log.e(TAG, "Error pushing native MAL data", e);
                            }
                        });
                        return;
                    }
                } catch (Exception e) {
                    Log.e(TAG, "Native MAL fetch error", e);
                }
                mainHandler.post(() -> {
                    if (bridge != null && bridge.getWebView() != null) {
                        bridge.getWebView().evaluateJavascript("if (typeof window.onNativeMalLoaded === 'function') { window.onNativeMalLoaded(null); }", null);
                    }
                });
            }).start();
        }

        @JavascriptInterface
        public void requestStreamAsync(final String title, final int episodeNumber, final String langCode) {
            Log.e(TAG, "===> ASYNC RESOLUTION REQUEST FOR: " + title + " (EP " + episodeNumber + ") [LANG: " + langCode + "]");

            mainHandler.post(() -> {
                try {
                    if (resolverWebView == null) {
                        initResolverWebView();
                    }

                    String cleanTitle = title.replaceAll("[:\\-]", " ").replaceAll("\\s+", " ").trim();
                    String query = URLEncoder.encode(cleanTitle, "UTF-8");
                    String browseUrl = "https://anidb.app/browse?q=" + query;

                    Log.e(TAG, "Resolver WebView loading: " + browseUrl);

                    resolverWebView.setWebViewClient(new WebViewClient() {
                        @Override
                        public void onPageFinished(WebView view, String url) {
                            Log.e(TAG, "Resolver onPageFinished for: " + url);
                            
                            String script = 
                                "(function() {\n" +
                                "  try {\n" +
                                "    let links = Array.from(document.querySelectorAll('a[href*=\"/anime/\"]'));\n" +
                                "    let targetId = null;\n" +
                                "    for (let a of links) {\n" +
                                "      let href = a.getAttribute('href') || '';\n" +
                                "      let m = href.match(/-([0-9]+)$/);\n" +
                                "      if (m) { targetId = m[1]; break; }\n" +
                                "    }\n" +
                                "    if (!targetId) {\n" +
                                "      let fullHtml = document.body.innerHTML;\n" +
                                "      let m = fullHtml.match(/\\/anime\\/[a-zA-Z0-9_-]+-([0-9]+)/);\n" +
                                "      if (m) targetId = m[1];\n" +
                                "    }\n" +
                                "    if (!targetId) {\n" +
                                "      window.ResolverCallback.onResult(JSON.stringify({ fallbackToWeb: true }));\n" +
                                "      return;\n" +
                                "    }\n" +
                                "    fetch('/api/frontend/anime/' + targetId + '/episodes')\n" +
                                "      .then(r => r.json())\n" +
                                "      .then(data => {\n" +
                                "        let epList = Array.isArray(data) ? data : (data.episodes || []);\n" +
                                "        let targetEp = epList.find(e => e.number === " + episodeNumber + ") || epList[0];\n" +
                                "        if (!targetEp) {\n" +
                                "          window.ResolverCallback.onResult(JSON.stringify({ fallbackToWeb: true }));\n" +
                                "          return;\n" +
                                "        }\n" +
                                "        return fetch('/api/frontend/episode/' + targetEp.id + '/languages');\n" +
                                "      })\n" +
                                "      .then(r => r ? r.json() : null)\n" +
                                "      .then(langData => {\n" +
                                "        if (!langData) return;\n" +
                                "        let langs = langData.languages || [];\n" +
                                "        let targetCode = '" + ("dub".equalsIgnoreCase(langCode) ? "eng" : "jpn") + "';\n" +
                                "        let matched = langs.find(l => l.code === targetCode) || langs[0];\n" +
                                "        if (!matched || !matched.embed_url) {\n" +
                                "          window.ResolverCallback.onResult(JSON.stringify({ fallbackToWeb: true }));\n" +
                                "          return;\n" +
                                "        }\n" +
                                "        let embed = matched.embed_url;\n" +
                                "        fetch(embed)\n" +
                                "          .then(r => r.text())\n" +
                                "          .then(embedHtml => {\n" +
                                "            let m = embedHtml.match(/file:\\s*'([^']+\\.m3u8[^']*)'/);\n" +
                                "            let m3u8 = m ? m[1] : null;\n" +
                                "            let proxyM3u8 = m3u8 ? ('http://127.0.0.1:8099/stream?url=' + encodeURIComponent(m3u8)) : null;\n" +
                                "            window.ResolverCallback.onResult(JSON.stringify({\n" +
                                "              streamUrl: proxyM3u8,\n" +
                                "              rawStreamUrl: m3u8,\n" +
                                "              embedUrl: embed\n" +
                                "            }));\n" +
                                "          })\n" +
                                "          .catch(err => {\n" +
                                "            window.ResolverCallback.onResult(JSON.stringify({ embedUrl: embed }));\n" +
                                "          });\n" +
                                "      })\n" +
                                "      .catch(err => {\n" +
                                "        window.ResolverCallback.onResult(JSON.stringify({ fallbackToWeb: true }));\n" +
                                "      });\n" +
                                "  } catch (err) {\n" +
                                "    window.ResolverCallback.onResult(JSON.stringify({ fallbackToWeb: true }));\n" +
                                "  }\n" +
                                "})();";

                            resolverWebView.evaluateJavascript(script, null);
                        }
                    });

                    resolverWebView.loadUrl(browseUrl);
                } catch (Exception e) {
                    Log.e(TAG, "Error initiating offscreen async resolution", e);
                }
            });
        }
    }

    private void hideSystemUI() {
        try {
            androidx.core.view.WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
            androidx.core.view.WindowInsetsControllerCompat controller =
                new androidx.core.view.WindowInsetsControllerCompat(getWindow(), getWindow().getDecorView());
            controller.hide(androidx.core.view.WindowInsetsCompat.Type.systemBars());
            controller.setSystemBarsBehavior(androidx.core.view.WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);

            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.P) {
                getWindow().getAttributes().layoutInDisplayCutoutMode =
                    android.view.WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
            }
        } catch (Exception e) {
            Log.e(TAG, "Error hiding system UI", e);
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        setupWebView();
        hideSystemUI();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            hideSystemUI();
        }
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        if (streamProxy != null) {
            streamProxy.stop();
        }
    }
}
