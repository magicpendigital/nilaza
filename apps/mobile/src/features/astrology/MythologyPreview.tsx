import React, { useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Text, Pressable, View } from "react-native";
import { useFonts } from "expo-font";
import { EBGaramond_400Regular } from "@expo-google-fonts/eb-garamond";
import {
  HankenGrotesk_400Regular,
  HankenGrotesk_500Medium,
} from "@expo-google-fonts/hanken-grotesk";
import { AstrologyExperience } from "./AstrologyExperience";
import { AstrologyPersistence } from "./persistence";

// Dev-only isolated namespace. Never reuses a signed-in account or calls the backend.
const previewStorage: AstrologyPersistence = {
  async loadJson<T>(key: string, fallback: T) {
    const raw = await AsyncStorage.getItem(
      "nilaza.dev.astrology-review." + key,
    );
    return raw ? (JSON.parse(raw) as T) : fallback;
  },
  async saveJsonOrThrow<T>(key: string, value: T) {
    await AsyncStorage.setItem(
      "nilaza.dev.astrology-review." + key,
      JSON.stringify(value),
    );
  },
};

/** Dev-only full feature review. Use synthetic inputs; storage is isolated from accounts. */
export default function MythologyPreview() {
  const [language, setLanguage] = useState<"vi" | "en">("vi");
  const [loaded, error] = useFonts({
    EBGaramond_400Regular,
    HankenGrotesk_400Regular,
    HankenGrotesk_500Medium,
  });
  if (!loaded && !error) return <Text>Loading fonts…</Text>;
  return (
    <View
      style={{
        flex: 1,
        minHeight: 0,
        height: "100%",
        backgroundColor: "#151416",
        maxWidth: 440,
        width: "100%",
        alignSelf: "center",
      }}
    >
      <Pressable
        accessibilityRole="button"
        onPress={() => setLanguage(language === "vi" ? "en" : "vi")}
        style={{ padding: 14, minHeight: 48 }}
      >
        <Text style={{ color: "#F7F1E6" }}>
          LOCAL PREVIEW ·{" "}
          {language === "vi" ? "Switch to English" : "Chuyển sang tiếng Việt"}
        </Text>
      </Pressable>
      <AstrologyExperience
        language={language}
        storage={previewStorage}
        onBack={() => {}}
      />
    </View>
  );
}
