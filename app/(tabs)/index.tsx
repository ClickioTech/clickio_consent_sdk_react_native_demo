import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import {
  Button,
  NativeModules,
  ScrollView,
  Platform,
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  DeviceEventEmitter,
} from "react-native";

SplashScreen.preventAutoHideAsync();

const { ClickioSDKModule, ExportDataModule, ClickioConsentManagerModule } =
  NativeModules;

type WebviewConfig = {
  backgroundColor?: string;
  width?: number;
  height?: number;
  gravity?: "top" | "center" | "bottom";
};

export default function RootLayout() {
  const [exportData, setExportData] = useState<{ [key: string]: any } | null>(
    null
  );
  const [consentFlags, setConsentFlags] = useState<{
    [key: string]: any;
  } | null>(null);
  const [dialogMode, setDialogMode] = useState<string>("DEFAULT");
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  const controllerIdRef = useRef<string | null>(null);

  // --- Fetch export data ---
  const fetchExportData = async () => {
    try {
      const data =
        Platform.OS === "ios"
          ? await new Promise((resolve) =>
              ClickioConsentManagerModule.getConsentData((res) => {
                if (res.status === "success") resolve(res.data);
                else resolve(null);
              })
            )
          : await ExportDataModule.getAllExportData();
      setExportData(data as any);
    } catch (error) {
      console.error("Error fetching export data:", error);
    }
  };

  // --- Fetch consent flags ---
  const fetchConsentFlags = async () => {
    try {
      if (Platform.OS === "android") {
        const data = await ClickioSDKModule.getGoogleConsentFlags();
        setConsentFlags(data);
      } else {
        const flags = await ClickioConsentManagerModule.getGoogleConsentFlags();
        setConsentFlags(flags);
      }
    } catch (error) {
      console.error(error);
    }
  };

  // --- Open consent dialog / webview ---
  const openConsentWebview = async () => {
    try {
      if (Platform.OS === "ios") {
        const { controllerId } =
          await ClickioConsentManagerModule.webviewLoadUrl({
            url: "https://account.clickio.com/public/test/solveit-demo/tcf-global.html",
            config: {
              width: 350,
              height: 700,
              backgroundColor: "transparent",
              gravity: "center",
            },
          });
        controllerIdRef.current = controllerId;
        await ClickioConsentManagerModule.showController(controllerId);
        console.log("Consent WebView opened (iOS)");
      } else {
        await ClickioSDKModule.openDialog({
          url: "https://account.clickio.com/public/test/solveit-demo/tcf-global.html",
          backgroundColor: "transparent",
          width: -1,
          height: -1,
          gravity: "center",
        });
        console.log("Consent WebView opened (Android)");
      }
    } catch (error) {
      console.error("Failed to open consent webview:", error);
    }
  };

  // --- Initialize SDK ---
  const initializeSDK = async () => {
    if (Platform.OS === "ios") {
      await ClickioConsentManagerModule.requestATTPermission();
      await ClickioConsentManagerModule.initializeConsentSDK({
        siteId: "241131",
        appLanguage: "en",
      });
    } else {
      await ClickioSDKModule.initializeSDK("241131", "en");
    }
    openConsentWebview();
  };

  // --- Reset SDK / app data ---
  const resetAppData = async () => {
    if (Platform.OS === "ios") {
      await ClickioConsentManagerModule.resetData();
      await initializeSDK();
    } else {
      await ClickioSDKModule.resetSDK();
      await initializeSDK();
    }
  };

  const handleResurface = () => {
    if (Platform.OS === "ios") {
      openConsentWebview();
    } else {
      ClickioSDKModule.openDialog({
        url: "https://account.clickio.com/public/test/solveit-demo/tcf-global.html",
        backgroundColor: "transparent",
        width: -1,
        height: -1,
        gravity: "center",
      });
    }
    setDialogMode("RESURFACE");
  };

  useEffect(() => {
    const listener = DeviceEventEmitter.addListener("ClickioLog", (message) => {
      console.log("Clickio SDK Log:", message);
    });

    initializeSDK();

    return () => listener.remove();
  }, []);

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return <ActivityIndicator size="large" style={{ flex: 1 }} />;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <StatusBar style="dark" />
      <Text style={styles.title}>📱 Clickio SDK Test</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔧 SDK Controls</Text>
        <Button title="Reset SDK / App Data" onPress={resetAppData} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📤 Data Fetch</Text>
        <Button title="Fetch Export Data" onPress={fetchExportData} />
        <Button title="Fetch Consent Flags" onPress={fetchConsentFlags} />
      </View>

      <Button
        title={`Resurface Consent: now mode is ${dialogMode}`}
        onPress={handleResurface}
      />

      {exportData && (
        <View style={styles.dataSection}>
          <Text style={styles.sectionTitle}>📄 Export Data</Text>
          {Object.entries(exportData).map(([key, value]) => (
            <View key={key} style={styles.item}>
              <Text style={styles.label}>{key}</Text>
              <Text style={styles.value}>{String(value)}</Text>
            </View>
          ))}
        </View>
      )}

      {consentFlags && (
        <View style={styles.dataSection}>
          <Text style={styles.sectionTitle}>🛡️ Consent Flags</Text>
          {Object.entries(consentFlags).map(([key, value]) => (
            <View key={key} style={styles.item}>
              <Text style={styles.label}>{key}</Text>
              <Text style={styles.value}>{String(value)}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: "white", flexGrow: 1 },
  title: {
    marginTop: 30,
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 24,
  },
  section: { marginBottom: 20, gap: 10 },
  sectionTitle: { fontSize: 18, fontWeight: "600", marginBottom: 10 },
  dataSection: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 10,
    marginTop: 10,
    elevation: 2,
  },
  item: { borderBottomWidth: 1, borderBottomColor: "#eee", paddingVertical: 8 },
  label: { fontWeight: "600", color: "#333" },
  value: { color: "#666" },
});
