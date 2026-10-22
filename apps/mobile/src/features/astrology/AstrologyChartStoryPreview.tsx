import { EBGaramond_400Regular, EBGaramond_500Medium } from "@expo-google-fonts/eb-garamond";
import {
  HankenGrotesk_400Regular,
  HankenGrotesk_500Medium,
  HankenGrotesk_600SemiBold,
} from "@expo-google-fonts/hanken-grotesk";
import { useFonts } from "expo-font";
import React, { useMemo, useState } from "react";
import { Text, View } from "react-native";
import {
  calculateChart,
  type BirthInput,
} from "../../../../../packages/astrology-core/calculator.mjs";
import { AstrologyChartStory } from "./AstrologyChartStory";
import { buildAstrologyChartSelectionModel } from "./chartSelection";
import { toAstrologyChartPresentation } from "./contracts";

const syntheticReviewInput: BirthInput = {
  revision: 1,
  date: "1998-06-17",
  time: "05:41",
  precision: "exact",
  place: {
    id: "internal-synthetic-review",
    source: "internal_preview",
    confirmed: true,
    latitude: 21.023456,
    longitude: 105.876543,
    timezone: "Asia/Ho_Chi_Minh",
  },
};

/** Dev-only visual review. The deterministic input is synthetic and never persisted or sent. */
export default function AstrologyChartStoryPreview() {
  const [saved, setSaved] = useState(false);
  const [loaded, error] = useFonts({
    EBGaramond_400Regular,
    EBGaramond_500Medium,
    HankenGrotesk_400Regular,
    HankenGrotesk_500Medium,
    HankenGrotesk_600SemiBold,
  });
  const chart = useMemo(() => calculateChart(syntheticReviewInput), []);
  const presentation = useMemo(
    () => toAstrologyChartPresentation(chart),
    [chart],
  );
  const selectionModel = useMemo(
    () => buildAstrologyChartSelectionModel(chart),
    [chart],
  );
  if (!loaded && !error) return <Text>Loading fonts…</Text>;
  return (
    <View
      style={{
        alignSelf: "center",
        backgroundColor: "#151416",
        flex: 1,
        maxWidth: 440,
        minHeight: 0,
        width: "100%",
      }}
    >
      <AstrologyChartStory
        chart={presentation}
        houses={chart.houses}
        initialTab="guide"
        language="vi"
        onBack={() => {}}
        onReflection={() => {}}
        onSaveChart={() => setSaved(true)}
        saved={saved}
        selectionModel={selectionModel}
      />
    </View>
  );
}
