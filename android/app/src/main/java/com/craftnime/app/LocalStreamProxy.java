package com.craftnime.app;

import android.util.Log;
import java.io.BufferedReader;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.ServerSocket;
import java.net.Socket;
import java.net.URL;
import java.net.URLDecoder;
import java.net.URLEncoder;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class LocalStreamProxy {
    private static final String TAG = "CraftnimeProxy";
    public static final int PORT = 8099;
    private ServerSocket serverSocket;
    private boolean isRunning = false;
    private final ExecutorService executor = Executors.newCachedThreadPool();

    public void start() {
        if (isRunning) return;
        try {
            serverSocket = new ServerSocket(PORT);
            isRunning = true;
            Log.e(TAG, "LocalStreamProxy started on port " + PORT);

            executor.submit(() -> {
                while (isRunning && !serverSocket.isClosed()) {
                    try {
                        Socket client = serverSocket.accept();
                        executor.submit(() -> handleClient(client));
                    } catch (Exception e) {
                        if (!isRunning) break;
                    }
                }
            });
        } catch (Exception e) {
            Log.e(TAG, "Failed to start LocalStreamProxy", e);
        }
    }

    private void handleClient(Socket client) {
        try {
            BufferedReader in = new BufferedReader(new InputStreamReader(client.getInputStream()));
            String line = in.readLine();
            if (line == null) {
                client.close();
                return;
            }

            // e.g. GET /stream?url=https%3A%2F%2F... HTTP/1.1
            String[] parts = line.split(" ");
            if (parts.length < 2) {
                client.close();
                return;
            }

            String path = parts[1];

            if (path.startsWith("/mal?user=")) {
                String rawUser = path.substring(10);
                int amp = rawUser.indexOf('&');
                if (amp != -1) rawUser = rawUser.substring(0, amp);
                String username = URLDecoder.decode(rawUser, "UTF-8");
                String malUrl = "https://myanimelist.net/animelist/" + URLEncoder.encode(username, "UTF-8") + "/load.json?offset=0&status=7";

                URL url = new URL(malUrl);
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestProperty("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36");
                conn.setRequestProperty("Accept", "application/json, text/javascript, */*; q=0.01");
                conn.setInstanceFollowRedirects(true);
                conn.setConnectTimeout(10000);
                conn.setReadTimeout(10000);

                int code = conn.getResponseCode();
                OutputStream out = client.getOutputStream();

                if (code == 200) {
                    InputStream is = conn.getInputStream();
                    ByteArrayOutputStream buffer = new ByteArrayOutputStream();
                    byte[] data = new byte[8192];
                    int nRead;
                    while ((nRead = is.read(data, 0, data.length)) != -1) {
                        buffer.write(data, 0, nRead);
                    }
                    is.close();
                    byte[] responseBytes = buffer.toByteArray();

                    String header = "HTTP/1.1 200 OK\r\n" +
                                    "Content-Type: application/json; charset=utf-8\r\n" +
                                    "Access-Control-Allow-Origin: *\r\n" +
                                    "Access-Control-Allow-Methods: GET, HEAD, OPTIONS\r\n" +
                                    "Content-Length: " + responseBytes.length + "\r\n\r\n";
                    out.write(header.getBytes("UTF-8"));
                    out.write(responseBytes);
                    out.flush();
                } else {
                    String errorBody = "{\"error\": \"MAL returned HTTP " + code + "\"}";
                    byte[] errBytes = errorBody.getBytes("UTF-8");
                    String header = "HTTP/1.1 " + code + " Error\r\n" +
                                    "Content-Type: application/json\r\n" +
                                    "Access-Control-Allow-Origin: *\r\n" +
                                    "Content-Length: " + errBytes.length + "\r\n\r\n";
                    out.write(header.getBytes("UTF-8"));
                    out.write(errBytes);
                    out.flush();
                }
                client.close();
                return;
            }

            if (path.startsWith("/image?url=")) {
                String rawUrl = path.substring(11);
                int amp = rawUrl.indexOf('&');
                if (amp != -1) rawUrl = rawUrl.substring(0, amp);
                String targetUrl = URLDecoder.decode(rawUrl, "UTF-8");

                URL url = new URL(targetUrl);
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestProperty("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36");
                conn.setConnectTimeout(8000);
                conn.setReadTimeout(8000);

                int code = conn.getResponseCode();
                String contentType = conn.getContentType();
                if (contentType == null) contentType = "image/jpeg";
                OutputStream out = client.getOutputStream();
                if (code == 200) {
                    InputStream is = conn.getInputStream();
                    ByteArrayOutputStream buffer = new ByteArrayOutputStream();
                    byte[] data = new byte[8192];
                    int nRead;
                    while ((nRead = is.read(data, 0, data.length)) != -1) {
                        buffer.write(data, 0, nRead);
                    }
                    is.close();
                    byte[] imgBytes = buffer.toByteArray();
                    String header = "HTTP/1.1 200 OK\r\n" +
                                    "Content-Type: " + contentType + "\r\n" +
                                    "Access-Control-Allow-Origin: *\r\n" +
                                    "Cache-Control: public, max-age=86400\r\n" +
                                    "Content-Length: " + imgBytes.length + "\r\n\r\n";
                    out.write(header.getBytes("UTF-8"));
                    out.write(imgBytes);
                    out.flush();
                } else {
                    out.write(("HTTP/1.1 " + code + " Error\r\n\r\n").getBytes("UTF-8"));
                    out.flush();
                }
                client.close();
                return;
            }

            if (!path.startsWith("/stream?url=")) {
                OutputStream out = client.getOutputStream();
                out.write("HTTP/1.1 404 Not Found\r\n\r\n".getBytes("UTF-8"));
                out.flush();
                client.close();
                return;
            }

            String rawUrl = path.substring(12);
            int amp = rawUrl.indexOf('&');
            if (amp != -1) rawUrl = rawUrl.substring(0, amp);
            String targetUrl = URLDecoder.decode(rawUrl, "UTF-8");

            URL url = new URL(targetUrl);
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestProperty("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36");
            conn.setRequestProperty("Referer", "https://anidb.app/");
            conn.setRequestProperty("Origin", "https://anidb.app");
            conn.setConnectTimeout(8000);
            conn.setReadTimeout(8000);

            int code = conn.getResponseCode();
            String contentType = conn.getContentType();
            if (contentType == null) {
                contentType = targetUrl.contains(".m3u8") ? "application/vnd.apple.mpegurl" : "video/mp2t";
            }

            OutputStream out = client.getOutputStream();

            if (targetUrl.contains(".m3u8")) {
                BufferedReader reader = new BufferedReader(new InputStreamReader(conn.getInputStream()));
                StringBuilder sb = new StringBuilder();
                String mLine;
                String baseUrl = targetUrl.substring(0, targetUrl.lastIndexOf('/') + 1);

                while ((mLine = reader.readLine()) != null) {
                    if (!mLine.startsWith("#") && !mLine.trim().isEmpty()) {
                        String fullItemUrl = mLine.startsWith("http") ? mLine : baseUrl + mLine;
                        mLine = "http://127.0.0.1:" + PORT + "/stream?url=" + URLEncoder.encode(fullItemUrl, "UTF-8");
                    }
                    sb.append(mLine).append("\n");
                }
                reader.close();

                byte[] body = sb.toString().getBytes("UTF-8");
                String header = "HTTP/1.1 200 OK\r\n" +
                                "Content-Type: " + contentType + "\r\n" +
                                "Access-Control-Allow-Origin: *\r\n" +
                                "Access-Control-Allow-Methods: GET, HEAD, OPTIONS\r\n" +
                                "Content-Length: " + body.length + "\r\n\r\n";
                out.write(header.getBytes("UTF-8"));
                out.write(body);
                out.flush();
            } else {
                long len = conn.getContentLengthLong();
                String header = "HTTP/1.1 " + code + " OK\r\n" +
                                "Content-Type: " + contentType + "\r\n" +
                                "Access-Control-Allow-Origin: *\r\n" +
                                "Access-Control-Allow-Methods: GET, HEAD, OPTIONS\r\n" +
                                (len > 0 ? ("Content-Length: " + len + "\r\n\r\n") : "\r\n");
                out.write(header.getBytes("UTF-8"));

                InputStream is = conn.getInputStream();
                byte[] buffer = new byte[16384];
                int read;
                while ((read = is.read(buffer)) != -1) {
                    out.write(buffer, 0, read);
                }
                is.close();
                out.flush();
            }

            client.close();
        } catch (Exception e) {
            try { client.close(); } catch (Exception ignored) {}
        }
    }

    public void stop() {
        isRunning = false;
        try {
            if (serverSocket != null) serverSocket.close();
        } catch (Exception ignored) {}
    }
}
