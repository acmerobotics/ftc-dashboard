package com.acmerobotics.dashboard.limelight;

import com.qualcomm.robotcore.util.RobotLog;

import fi.iki.elonen.NanoHTTPD;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Map;

/**
 * NanoHTTPD server that forwards HTTP requests to an internal host.
 * <p>
 * When {@code stream} is false the full response body is buffered before replying
 * (suitable for REST/HTML endpoints).  When {@code stream} is true the response is
 * sent as a chunked transfer so the client receives bytes as they arrive (needed for
 * the Limelight MJPEG feed on port 5800).
 */
class HttpForwarder extends NanoHTTPD {
    private static final String TAG = "FtcDashboard";

    private final String targetHost;
    private final int targetPort;
    private final boolean stream;

    /**
     * @param listenPort port this server binds to on the Control Hub
     * @param targetHost host to forward to (e.g. {@code "172.29.0.1"})
     * @param targetPort port on the target host
     * @param stream     if true, use chunked transfer (for MJPEG); if false, buffer the full body
     */
    HttpForwarder(int listenPort, String targetHost, int targetPort, boolean stream) {
        super(listenPort);
        this.targetHost = targetHost;
        this.targetPort = targetPort;
        this.stream = stream;
    }

    /* ----- NanoHTTPD entry point ----- */

    @Override
    public Response serve(IHTTPSession session) {
        // CORS preflight
        if (session.getMethod() == Method.OPTIONS) {
            return corsResponse(newFixedLengthResponse(Response.Status.OK, MIME_PLAINTEXT, ""));
        }

        try {
            return forwardRequest(session);
        } catch (Exception e) {
            RobotLog.ww(TAG, "forward %d→%s:%d failed: %s",
                    getListeningPort(), targetHost, targetPort, e.getMessage());
            return newFixedLengthResponse(Response.Status.INTERNAL_ERROR,
                    MIME_PLAINTEXT, "proxy error");
        }
    }

    /* ----- core forwarding logic ----- */

    private Response forwardRequest(IHTTPSession session) throws IOException {
        // Open a connection to the Limelight
        URL url = new URL("http", targetHost, targetPort, session.getUri());
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setRequestMethod(session.getMethod().name());
        conn.setInstanceFollowRedirects(true);
        conn.setConnectTimeout(3000);

        // Copy request headers (skip Host, Content-Length, and Accept-Encoding so that
        // HttpURLConnection handles gzip decompression transparently instead of passing
        // compressed bytes through without the matching Content-Encoding header)
        for (Map.Entry<String, String> h : session.getHeaders().entrySet()) {
            String key = h.getKey();
            if ("host".equalsIgnoreCase(key)
                    || "content-length".equalsIgnoreCase(key)
                    || "accept-encoding".equalsIgnoreCase(key)) continue;
            conn.setRequestProperty(key, h.getValue());
        }

        // Copy request body for write methods
        if (hasBody(session.getMethod())) {
            conn.setDoOutput(true);
            int len = bodyLength(session);
            if (len > 0) {
                byte[] buf = new byte[len];
                readFully(session.getInputStream(), buf, len);
                conn.getOutputStream().write(buf);
            }
        }

        // Read response
        int code = conn.getResponseCode();
        String contentType = conn.getContentType();
        if (contentType == null) contentType = "application/octet-stream";

        Response.IStatus status = Response.Status.lookup(code);
        if (status == null) status = Response.Status.INTERNAL_ERROR;

        Response resp;
        if (stream) {
            // Streaming mode: pipe the InputStream without buffering (MJPEG)
            InputStream bodyStream = conn.getInputStream();
            resp = newChunkedResponse(status, contentType, bodyStream);
        } else {
            // Buffered mode: read everything, close connection, then respond
            byte[] body = readAllBytes(conn);
            conn.disconnect();
            resp = newFixedLengthResponse(status, contentType,
                    new ByteArrayInputStream(body), body.length);
        }

        return corsResponse(resp);
    }

    /* ----- helpers ----- */

    private static boolean hasBody(Method m) {
        return m == Method.POST || m == Method.PUT || m == Method.PATCH;
    }

    private static int bodyLength(IHTTPSession session) {
        String cl = session.getHeaders().get("content-length");
        if (cl == null) return 0;
        try { return Integer.parseInt(cl); }
        catch (NumberFormatException e) { return 0; }
    }

    private static void readFully(InputStream in, byte[] buf, int len) throws IOException {
        int off = 0;
        while (off < len) {
            int n = in.read(buf, off, len - off);
            if (n < 0) break;
            off += n;
        }
    }

    private static byte[] readAllBytes(HttpURLConnection conn) throws IOException {
        InputStream in;
        try {
            in = conn.getInputStream();
        } catch (IOException e) {
            in = conn.getErrorStream();
            if (in == null) return new byte[0];
        }

        byte[] buf = new byte[4096];
        java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream();
        int n;
        while ((n = in.read(buf)) != -1) {
            out.write(buf, 0, n);
        }
        in.close();
        return out.toByteArray();
    }

    private static Response corsResponse(Response resp) {
        resp.addHeader("Access-Control-Allow-Origin", "*");
        resp.addHeader("Access-Control-Allow-Methods", "*");
        resp.addHeader("Access-Control-Allow-Headers", "*");
        return resp;
    }
}
