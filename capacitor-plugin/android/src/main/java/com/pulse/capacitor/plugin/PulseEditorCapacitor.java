package com.pulse.capacitor.plugin;

import android.util.Log;
import android.content.Intent;
import android.app.Activity;
import android.net.Uri;
import android.provider.Settings;
import android.os.Environment;

public class PulseEditorCapacitor {

    public String echo(String value) {
        Log.i("Echo", value);
        return value;
    }

    public void startManageStorageIntent(Activity activity, String packageName) {
        Intent intent = new Intent(Settings.ACTION_MANAGE_ALL_FILES_ACCESS_PERMISSION);
        activity.startActivity(intent);
    }

    public boolean isManageStoragePermissionGranted() {
        return Environment.isExternalStorageManager();
    }
}
