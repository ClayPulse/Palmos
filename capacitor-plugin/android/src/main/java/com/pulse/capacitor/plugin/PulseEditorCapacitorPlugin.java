package com.pulse.capacitor.plugin;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import android.app.Activity;

@CapacitorPlugin(
        name = "PulseEditorCapacitor",
        permissions = {
            @Permission(
                    alias = "storage",
                    strings = {
                        "Manifest.permission.MANAGE_EXTERNAL_STORAGE"
                    }
            )
        }
)
public class PulseEditorCapacitorPlugin extends Plugin {

    private PulseEditorCapacitor implementation = new PulseEditorCapacitor();

    @PluginMethod
    public void echo(PluginCall call) {
        String value = call.getString("value");

        JSObject ret = new JSObject();
        ret.put("value", implementation.echo(value));
        call.resolve(ret);
    }

    @PluginMethod
    public void startManageStorageIntent(PluginCall call) {
        Activity activity = getActivity();
        String packageName = activity.getPackageName();
        implementation.startManageStorageIntent(activity, packageName);
        call.resolve();
    }

    @PluginMethod
    public void isManageStoragePermissionGranted(PluginCall call) {
        boolean isGranted = implementation.isManageStoragePermissionGranted();
        JSObject ret = new JSObject();
        ret.put("isGranted", isGranted);
        call.resolve(ret);
    }
}
