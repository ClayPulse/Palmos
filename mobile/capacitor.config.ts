import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.pulse_editor.app",
  appName: "Pulse Editor",
  webDir: "../build/next",
  android: {
    buildOptions: {
      signingType: "apksigner",
    },
    path: "./android",
  },
  plugins: {
    Keyboard: {
      resizeOnFullScreen: true,
    },
    SafeArea: {
      enabled: true,
    },
    CapacitorHttp: {
      enabled: false,
    },
  },
};

export default config;
