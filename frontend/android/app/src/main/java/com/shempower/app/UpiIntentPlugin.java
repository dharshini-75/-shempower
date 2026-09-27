package com.shempower.app;

import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.util.Log;

import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

/**
 * SHEmpower UPI Intent Plugin
 *
 * Fires a native Android ACTION_VIEW Intent for upi:// URIs and captures
 * the transaction result from external UPI apps via startActivityForResult.
 */
@CapacitorPlugin(name = "UpiIntent")
public class UpiIntentPlugin extends Plugin {

    private static final String TAG = "UpiIntentPlugin";

    // Allowed UPI parameters (NPCI specification for P2P/Intent)
    private static final Set<String> ALLOWED_PARAMS = new HashSet<>(
        Arrays.asList("pa", "pn", "am", "cu", "tr", "tn")
    );

    /**
     * Launch a native Android Intent with ACTION_VIEW for a upi:// URI.
     */
    @PluginMethod
    public void launch(PluginCall call) {
        String url = call.getString("url", "");

        if (url == null || url.isEmpty()) {
            call.reject("UPI URL is required");
            return;
        }

        if (!url.startsWith("upi://")) {
            call.reject("URL must start with upi://");
            return;
        }

        Log.i(TAG, "==================================================");
        Log.i(TAG, "[UPI NATIVE] ── INTENT LAUNCH START ──");
        Log.i(TAG, "[UPI NATIVE] A. JS URI CREATED: " + url);

        try {
            Uri incomingUri = Uri.parse(url);
            Log.i(TAG, "[UPI NATIVE] B. NATIVE RECEIVED URI: " + incomingUri.toString());

            String pa = incomingUri.getQueryParameter("pa");
            String pn = incomingUri.getQueryParameter("pn");
            String am = incomingUri.getQueryParameter("am");
            String cu = incomingUri.getQueryParameter("cu");
            String tr = incomingUri.getQueryParameter("tr");
            String tn = incomingUri.getQueryParameter("tn");

            Log.i(TAG, "[UPI NATIVE] PARSED pa (VPA): " + pa);
            Log.i(TAG, "[UPI NATIVE] PARSED pn (Name): " + pn);
            Log.i(TAG, "[UPI NATIVE] PARSED am (Amount): " + am);
            Log.i(TAG, "[UPI NATIVE] PARSED cu (Currency): " + cu);
            Log.i(TAG, "[UPI NATIVE] PARSED tr (TxnRef): " + tr);
            Log.i(TAG, "[UPI NATIVE] PARSED tn (Note): " + tn);

            // Validate required parameter: pa (payee VPA)
            if (pa == null || pa.isEmpty() || !pa.contains("@")) {
                Log.e(TAG, "[UPI NATIVE] INVALID VPA: " + pa);
                call.reject("Invalid UPI VPA (payee address). Must contain '@'.");
                return;
            }

            // Validate amount
            if (am == null || am.isEmpty()) {
                Log.e(TAG, "[UPI NATIVE] MISSING AMOUNT");
                call.reject("Payment amount is required.");
                return;
            }

            // Log any parameters that are being STRIPPED
            Set<String> queryParamNames = incomingUri.getQueryParameterNames();
            for (String paramName : queryParamNames) {
                if (!ALLOWED_PARAMS.contains(paramName)) {
                    Log.w(TAG, "[UPI NATIVE] STRIPPING PARAM: " + paramName + "=" + incomingUri.getQueryParameter(paramName));
                }
            }

            // Ensure pa is clean (do not lowercase as some VPAs are case-sensitive)
            String cleanPa = pa.trim();

            // Format amount to 2 decimal places per NPCI spec (e.g. 1.00 or 300.00)
            String cleanAm = am.trim();
            try {
                double parsedAm = Double.parseDouble(cleanAm);
                cleanAm = String.format(java.util.Locale.US, "%.2f", parsedAm);
            } catch (Exception ignored) {}

            // Reconstruct URI manually to preserve literal '@' in pa
            // Many UPI apps (like GPay) fail to parse the VPA if '@' is encoded to '%40'
            StringBuilder uriBuilder = new StringBuilder("upi://pay?");
            uriBuilder.append("pa=").append(cleanPa);

            if (pn != null && !pn.trim().isEmpty()) {
                uriBuilder.append("&pn=").append(Uri.encode(pn.trim()));
            }
            uriBuilder.append("&am=").append(cleanAm);
            uriBuilder.append("&cu=INR");

            if (tn != null && !tn.trim().isEmpty()) {
                uriBuilder.append("&tn=").append(Uri.encode(tn.trim()));
            }

            String finalUriStr = uriBuilder.toString();
            Uri finalUri = Uri.parse(finalUriStr);
            Log.i(TAG, "[UPI NATIVE] FINAL CONSTRUCTED URI: " + finalUriStr);

            Intent intent = new Intent(Intent.ACTION_VIEW, finalUri);

            String targetPkg = call.getString("package", "");
            if (targetPkg != null && !targetPkg.isEmpty()) {
                intent.setPackage(targetPkg);
                Log.i(TAG, "[UPI NATIVE] Target Package set directly: " + targetPkg);
            }

            Log.i(TAG, "[UPI NATIVE] ── COMPLETE INTENT CONFIGURATION ──");
            Log.i(TAG, "[UPI NATIVE] Action: " + intent.getAction());
            Log.i(TAG, "[UPI NATIVE] Data String: " + intent.getDataString());
            Log.i(TAG, "[UPI NATIVE] Scheme: " + intent.getScheme());
            Log.i(TAG, "[UPI NATIVE] Package: " + (intent.getPackage() != null ? intent.getPackage() : "NONE (System Chooser)"));
            Log.i(TAG, "==================================================");

            // MUST save the call for Capacitor to route the result back to handleUpiResult
            saveCall(call);
            // Launch for activity result using Capacitor's startActivityForResult
            startActivityForResult(call, intent, "handleUpiResult");

        } catch (ActivityNotFoundException e) {
            Log.w(TAG, "[UPI NATIVE] No UPI app found: " + e.getMessage());
            JSObject result = new JSObject();
            result.put("success", false);
            result.put("status", "NO_APP");
            result.put("error", "No compatible UPI app is installed on this device.");
            call.resolve(result);

        } catch (Exception e) {
            Log.e(TAG, "[UPI NATIVE] Unexpected error: ", e);
            call.reject("Failed to launch UPI intent: " + e.getMessage());
        }
    }

    /**
     * Open installed Google Pay India application directly.
     */
    @PluginMethod
    public void openGooglePay(PluginCall call) {
        try {
            Intent launchIntent = getContext().getPackageManager().getLaunchIntentForPackage("com.google.android.apps.nbu.paisa.user");
            if (launchIntent != null) {
                launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(launchIntent);
                JSObject ret = new JSObject();
                ret.put("success", true);
                call.resolve(ret);
            } else {
                JSObject ret = new JSObject();
                ret.put("success", false);
                ret.put("error", "Google Pay is not installed. Please install a UPI payment app to continue.");
                call.resolve(ret);
            }
        } catch (Exception e) {
            Log.e(TAG, "[UPI NATIVE] Error launching Google Pay: ", e);
            JSObject ret = new JSObject();
            ret.put("success", false);
            ret.put("error", "Google Pay is not installed. Please install a UPI payment app to continue.");
            call.resolve(ret);
        }
    }

    @ActivityCallback
    private void handleUpiResult(PluginCall call, ActivityResult result) {
        if (call == null) {
            Log.e(TAG, "[UPI NATIVE] PluginCall is null in handleUpiResult");
            return;
        }

        Log.i(TAG, "==================================================");
        Log.i(TAG, "[UPI NATIVE] ── UPI RESULT RECEIVED ──");
        Log.i(TAG, "[UPI NATIVE] Result Code: " + result.getResultCode());

        Intent data = result.getData();
        JSObject ret = new JSObject();

        String rawResponse = "";
        if (data != null) {
            rawResponse = data.getStringExtra("response");
            if (rawResponse == null || rawResponse.isEmpty()) {
                Bundle extras = data.getExtras();
                if (extras != null) {
                    StringBuilder sb = new StringBuilder();
                    for (String key : extras.keySet()) {
                        sb.append(key).append("=").append(extras.get(key)).append("&");
                    }
                    rawResponse = sb.toString();
                }
            }
        }

        Log.i(TAG, "[UPI NATIVE] RAW RESPONSE STRING: " + (rawResponse != null && !rawResponse.isEmpty() ? rawResponse : "NONE"));

        // Extract key response parameters safely
        java.util.Map<String, String> parsedMap = parseResponseString(rawResponse);
        String responseCode = getMapValue(parsedMap, "responseCode", "ResponseCode", "rescode");
        String txnId = getMapValue(parsedMap, "txnId", "txnid", "transactionId");
        String txnRef = getMapValue(parsedMap, "txnRef", "txnref", "referenceId");
        String approvalRefNo = getMapValue(parsedMap, "ApprovalRefNo", "approvalRefNo", "approvalRef");
        String status = parseUpiStatus(rawResponse, parsedMap);

        Log.i(TAG, "[UPI NATIVE] PARSED TRANSACTION STATUS: " + status);
        Log.i(TAG, "[UPI NATIVE] RESPONSE CODE: " + responseCode);
        Log.i(TAG, "[UPI NATIVE] TXN ID: " + txnId);
        Log.i(TAG, "[UPI NATIVE] TXN REF: " + txnRef);
        Log.i(TAG, "[UPI NATIVE] APPROVAL REF NO: " + approvalRefNo);

        if ("ZM".equalsIgnoreCase(responseCode)) {
            Log.w(TAG, "[UPI NATIVE] Google Pay returned responseCode=ZM: Invalid UPI PIN.");
        }
        Log.i(TAG, "==================================================");

        ret.put("status", status);
        ret.put("responseCode", responseCode);
        ret.put("txnId", txnId);
        ret.put("txnRef", txnRef);
        ret.put("approvalRefNo", approvalRefNo);
        ret.put("rawResponse", rawResponse != null ? rawResponse : "");

        if ("SUCCESS".equalsIgnoreCase(status)) {
            ret.put("success", true);
        } else {
            ret.put("success", false);
            if ("ZM".equalsIgnoreCase(responseCode)) {
                ret.put("error", "Invalid UPI PIN entered.");
            } else if ("UNKNOWN".equals(status) || rawResponse == null || rawResponse.isEmpty()) {
                ret.put("error", "Transaction response missing or unverified.");
            } else {
                ret.put("error", "Transaction returned status: " + status);
            }
        }

        call.resolve(ret);
    }

    private java.util.Map<String, String> parseResponseString(String str) {
        java.util.Map<String, String> map = new java.util.HashMap<>();
        if (str == null || str.isEmpty()) return map;
        String[] pairs = str.split("&");
        for (String pair : pairs) {
            String[] kv = pair.split("=");
            if (kv.length >= 2) {
                map.put(kv[0].trim(), kv[1].trim());
            } else if (kv.length == 1) {
                map.put(kv[0].trim(), "");
            }
        }
        return map;
    }

    private String getMapValue(java.util.Map<String, String> map, String... keys) {
        for (String key : keys) {
            for (java.util.Map.Entry<String, String> entry : map.entrySet()) {
                if (entry.getKey().equalsIgnoreCase(key)) {
                    return entry.getValue();
                }
            }
        }
        return "";
    }

    private String parseUpiStatus(String responseStr, java.util.Map<String, String> parsedMap) {
        if (parsedMap != null && !parsedMap.isEmpty()) {
            String statusVal = getMapValue(parsedMap, "status", "txnstatus", "Status");
            if (!statusVal.isEmpty()) {
                String upper = statusVal.toUpperCase();
                if (upper.contains("SUCCESS")) return "SUCCESS";
                if (upper.contains("SUBMITTED") || upper.contains("PENDING")) return "SUBMITTED";
                if (upper.contains("FAIL")) return "FAILURE";
            }
        }

        if (responseStr == null || responseStr.isEmpty()) {
            return "UNKNOWN";
        }
        String upper = responseStr.toUpperCase();
        if (upper.contains("STATUS=SUCCESS") || upper.contains("STATUS=SUCCESSFUL") || upper.contains("TNXSTATUS=SUCCESS")) {
            return "SUCCESS";
        }
        if (upper.contains("STATUS=SUBMITTED") || upper.contains("STATUS=PENDING")) {
            return "SUBMITTED";
        }
        if (upper.contains("STATUS=FAILURE") || upper.contains("STATUS=FAILED")) {
            return "FAILURE";
        }
        if (upper.contains("SUCCESS")) return "SUCCESS";
        if (upper.contains("FAILURE") || upper.contains("FAILED")) return "FAILURE";
        if (upper.contains("SUBMITTED") || upper.contains("PENDING")) return "SUBMITTED";

        return "UNKNOWN";
    }
}

