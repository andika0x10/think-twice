package com.andika.thinktwice;

import android.app.Activity;
import android.content.Intent;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

@CapacitorPlugin(name = "ThinkTwiceFiles")
public class ThinkTwiceFilesPlugin extends Plugin {
    @PluginMethod
    public void save(PluginCall call) {
        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType(call.getString("mime", "application/json"));
        intent.putExtra(Intent.EXTRA_TITLE, call.getString("name", "backup.thinktwice"));
        startActivityForResult(call, intent, "saved");
    }
    @ActivityCallback
    private void saved(PluginCall call, ActivityResult result) {
        if (call == null) return;
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null || result.getData().getData() == null) { call.reject("Penyimpanan dibatalkan."); return; }
        try (OutputStream out = getContext().getContentResolver().openOutputStream(result.getData().getData(), "wt")) {
            if (out == null) throw new Exception("File tidak dapat dibuka.");
            out.write(call.getString("content", "").getBytes(StandardCharsets.UTF_8));
            call.resolve();
        } catch (Exception e) { call.reject("File gagal disimpan.", e); }
    }
    @PluginMethod
    public void open(PluginCall call) {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("*/*");
        startActivityForResult(call, intent, "opened");
    }
    @ActivityCallback
    private void opened(PluginCall call, ActivityResult result) {
        if (call == null) return;
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null || result.getData().getData() == null) { call.reject("Pemilihan file dibatalkan."); return; }
        try (InputStream in = getContext().getContentResolver().openInputStream(result.getData().getData())) {
            if (in == null) throw new Exception("File tidak dapat dibuka.");
            byte[] bytes = in.readNBytes(10_000_001);
            if (bytes.length > 10_000_000) throw new Exception("Ukuran backup maksimal 10 MB.");
            JSObject data = new JSObject();
            data.put("content", new String(bytes, StandardCharsets.UTF_8));
            call.resolve(data);
        } catch (Exception e) { call.reject("File gagal dibuka: " + e.getMessage(), e); }
    }
}
