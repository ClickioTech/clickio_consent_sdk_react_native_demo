import {
  Image,
  StyleSheet,
  Platform,
  NativeModules,
  Button,
  View,
  Text,
} from "react-native";

import ParallaxScrollView from "@/components/ParallaxScrollView";
import {
  initializeSDK,
  getGoogleConsentFlags,
  isFirebaseAvailable,
  isAdjustAvailable,
  getExportData,
  syncClickioConsentWithFirebase,
  isAirbridgeAvailable,
  isAppsFlyerAvailable,
  startLoggingLogsFromAndroid,
  resetAppData,
  onReady,
} from "react-native-clickio-sdk";
import { useEffect, useState } from "react";

const { ClickioConsentManagerModule, ClickioSDKModule } = NativeModules;

export default function HomeScreen() {
  const [exportData, setExportData] = useState<{ [key: string]: any } | null>(
    null
  );
  const [consentFlags, setConsentFlags] = useState<{
    [key: string]: any;
  } | null>(null);
  const [dialogMode, setDialogMode] = useState<string>("DEFAULT");

  useEffect(() => {
    if (Platform.OS === "ios") {
      initializeSDKIos();
    } else {
      handleInit("default");
    }
  }, []);

  const openConsentDialog = async (dialogMode: string) => {
    await ClickioConsentManagerModule.openDialog({ mode: dialogMode });
  };

  const initializeSDKIos = async () => {
    try {
      await ClickioConsentManagerModule.requestATTPermission();
      const response = await ClickioConsentManagerModule.initializeConsentSDK({
        siteId: "241131",
        appLanguage: "en",
      });
      console.log("SDK initialized:", response);
      openConsentDialog("default");
    } catch (error) {
      console.error("Error initializing SDK (iOS):", error);
    }
  };

  const handleInit = async (mode: string) => {
    try {
      console.log("ass");
      const res = await initializeSDK("241131", "en", mode);
      console.log("resssss", res);
    } catch (e) {
      console.error("SDK Init Error:", e);
    }
  };

  const fetchExportData = async () => {
    try {
      const data = await getExportData();
      setExportData(data);
    } catch (error) {
      console.error("Error fetching export data:", error);
    }
  };
  const fetchIosExportData = async () => {
    ClickioConsentManagerModule.getConsentData((response) => {
      if (response.status === "success") {
        setExportData(response.data);
      } else {
        console.warn("Failed to get consent data");
      }
    });
  };

  const getFlags = async () => {
    try {
      let flags;
      if (Platform.OS === "android") {
        flags = await getGoogleConsentFlags();
      } else {
        const isAvailable = await isFirebaseAvailable();
        console.log("isAvailable", isAvailable);
        flags = await ClickioConsentManagerModule.getGoogleConsentFlags();
      }
      setConsentFlags(flags);
    } catch (error) {
      console.log(error);
    }
  };
  const resetData = async () => {
    if (Platform.OS === "ios") {
      ClickioConsentManagerModule.resetData().then(() => {
        initializeSDKIos();
        // "SDK preferences cleared."
        // Optionally re-initialize the SDK after reset
      });
    } else {
      await resetAppData();
      await ClickioSDKModule.onReady("resurface");
    }
  };

  const handleResurface = async () => {
    try {
      if (Platform.OS === "ios") {
        openConsentDialog("resurface");
      } else {
        await onReady("resurface");
      }
      setDialogMode("RESURFACE");
    } catch (error) {
      console.log("ready error", error);
    }
  };
  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: "#A1CEDC", dark: "#1D3D47" }}
      headerImage={
        <Image
          source={require("@/assets/images/partial-react-logo.png")}
          style={styles.reactLogo}
        />
      }
    >
      <Button
        title="Initialize SDK"
        onPress={() =>
          Platform.OS === "android" ? handleInit("default") : initializeSDKIos()
        }
      />
      <Button
        title={`Resurface Consent:now mode is ${dialogMode}`}
        onPress={() => handleResurface()}
      />
      <Button
        title="Fetch Export Data"
        onPress={() =>
          Platform.OS === "android" ? fetchExportData() : fetchIosExportData()
        }
      />
      <Button
        title="Reset app data"
        onPress={() => {
          resetData();
        }}
      />
      <Button title="Fetch FLags" onPress={getFlags} />
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
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: "absolute",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 10,
  },
  dataSection: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 10,
    marginTop: 10,
    elevation: 2,
  },
  item: {
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingVertical: 8,
  },
  label: {
    fontWeight: "600",
    color: "#333",
  },
  value: {
    color: "#666",
  },
});
