import { useMemo } from "react";
import { useWindowDimensions } from "react-native";

import { layout } from "./theme";

export type LayoutMode = "compact" | "medium" | "expanded";
export type DeviceClass = "phone" | "tablet";
export type NavMode = "bottom" | "rail";
export type LayoutOrientation = "portrait" | "landscape";

export type AdaptiveLayout = {
  width: number;
  height: number;
  shortSide: number;
  orientation: LayoutOrientation;
  deviceClass: DeviceClass;
  layoutMode: LayoutMode;
  navMode: NavMode;
  isCompactHeight: boolean;
  gutter: number;
  columns: 1 | 2 | 3;
  contentMaxWidth: number;
  focusedContentMaxWidth: number;
  navigationSize: number;
};

export function resolveAdaptiveLayout(width: number, height: number): AdaptiveLayout {
  const safeWidth = Math.max(0, width);
  const safeHeight = Math.max(0, height);
  const shortSide = Math.min(safeWidth, safeHeight);
  const orientation: LayoutOrientation = safeWidth > safeHeight ? "landscape" : "portrait";
  const deviceClass: DeviceClass = shortSide >= layout.tabletShortSide ? "tablet" : "phone";
  const useRail = deviceClass === "tablet" && orientation === "landscape" && safeWidth >= layout.expandedWidth;
  const navMode: NavMode = useRail ? "rail" : "bottom";
  const layoutMode: LayoutMode = useRail ? "expanded" : deviceClass === "tablet" || safeWidth >= layout.tabletShortSide ? "medium" : "compact";
  const gutter = layoutMode === "expanded"
    ? layout.gutterExpanded
    : layoutMode === "medium"
      ? layout.gutterMedium
      : safeWidth < layout.phoneNarrowWidth
        ? layout.gutterNarrow
        : layout.gutterCompact;
  const columns: 1 | 2 | 3 = layoutMode === "expanded" ? 3 : layoutMode === "medium" ? 2 : 1;
  const contentMaxWidth = layoutMode === "expanded"
    ? layout.contentExpandedMax
    : deviceClass === "tablet"
      ? layout.contentMediumMax
      : orientation === "landscape"
        ? layout.contentLandscapePhoneMax
        : layout.contentCompactMax;

  return {
    width: safeWidth,
    height: safeHeight,
    shortSide,
    orientation,
    deviceClass,
    layoutMode,
    navMode,
    isCompactHeight: safeHeight < layout.compactHeight,
    gutter,
    columns,
    contentMaxWidth,
    focusedContentMaxWidth: Math.min(contentMaxWidth, layout.focusedContentMax),
    navigationSize: navMode === "rail" ? layout.navigationRailWidth : layout.bottomNavigationMinHeight
  };
}

export function useAdaptiveLayout(): AdaptiveLayout {
  const { width, height } = useWindowDimensions();
  return useMemo(() => resolveAdaptiveLayout(width, height), [height, width]);
}
