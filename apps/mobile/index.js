import { registerRootComponent } from "expo";
import { SafeAreaProvider, initialWindowMetrics } from "react-native-safe-area-context";

import App from "./App";

if (typeof document !== "undefined") {
  document.documentElement.style.height = "100%";
  document.documentElement.style.overflow = "hidden";
  document.documentElement.style.backgroundColor = "#151416";
  document.body.style.height = "100%";
  document.body.style.margin = "0";
  document.body.style.overflow = "hidden";
  document.body.style.backgroundColor = "#151416";
  const root = document.getElementById("root");
  if (root) {
    root.style.height = "100%";
    root.style.overflow = "hidden";
    root.style.backgroundColor = "#151416";
  }
}

function NilazaRoot() {
  const previewPath = typeof window !== "undefined" ? window.location?.pathname : undefined;
  if (__DEV__ && previewPath === "/__preview/tarot-depth") {
    const TarotDepthPreview = require("./src/features/tarot/TarotDepthPreview").default;
    return <SafeAreaProvider initialMetrics={initialWindowMetrics}><TarotDepthPreview /></SafeAreaProvider>;
  }
  if (__DEV__ && previewPath === "/__preview/mythology") {
    const MythologyPreview = require("./src/features/astrology/MythologyPreview").default;
    return <SafeAreaProvider initialMetrics={initialWindowMetrics}><MythologyPreview /></SafeAreaProvider>;
  }
  if (__DEV__ && previewPath === "/__preview/astrology-chart-story") {
    const AstrologyChartStoryPreview = require("./src/features/astrology/AstrologyChartStoryPreview").default;
    return <SafeAreaProvider initialMetrics={initialWindowMetrics}><AstrologyChartStoryPreview /></SafeAreaProvider>;
  }
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <App />
    </SafeAreaProvider>
  );
}

registerRootComponent(NilazaRoot);
