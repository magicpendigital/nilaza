import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type {
  AstrologyChartPresentation,
  AstrologyLanguage,
  AstrologyPlacementFact,
} from "./contracts";
import { localizeAstrologyLabel, localizeAstrologySign } from "./contracts";

type Props = {
  presentation: AstrologyChartPresentation;
  language: AstrologyLanguage;
  sourceLabel?: string;
};

function copy(language: AstrologyLanguage) {
  return language === "vi"
    ? {
        eyebrow: "Dữ liệu bản đồ",
        ready: "Các vị trí trong bản đồ của bạn",
        limited: "Bản đồ cá nhân đang được hoàn thiện",
        missing: "Chưa đủ dữ liệu đã kiểm chứng để vẽ bản đồ cá nhân.",
        legacy:
          "Các vị trí dưới đây cần được kiểm chứng thêm trước khi dùng để tạo bản đồ cá nhân.",
        preview:
          "Bản xem thử này giúp bạn khám phá trải nghiệm, chưa phải bản đồ sao được tính từ thông tin sinh.",
        facts: "Các vị trí tham khảo",
        selected: "Đang xem",
        notCalculated:
          "Không hiển thị Rising, nhà hay góc chiếu như dữ kiện chắc chắn khi thiếu giờ sinh/nơi sinh/timezone đã xác nhận.",
        queued:
          "Bạn có thể khám phá thư viện thần thoại từ trang Chiêm tinh, ngay cả khi chưa có bản đồ cá nhân.",
        placement: "VỊ TRÍ",
        angle: "GÓC",
      }
    : {
        eyebrow: "Chart information",
        ready: "Your chart positions",
        limited: "Your personal chart is being refined",
        missing: "There are not enough placements to draw a personal chart.",
        legacy:
          "These positions need further verification before they can form a personal chart.",
        preview:
          "A local preview only lets you review the flow; it is not a precisely calculated chart.",
        facts: "Received placements",
        selected: "Viewing",
        notCalculated:
          "Rising, houses, and aspects are never displayed as certain facts when birth time, place, or timezone has not been confirmed.",
        queued:
          "Explore the mythology library from Astrology, even before your personal chart is available.",
        placement: "PLACEMENT",
        angle: "ANGLE",
      };
}

function factDescription(
  fact: AstrologyPlacementFact,
  language: AstrologyLanguage,
) {
  const sign = localizeAstrologySign(fact.sign, language);
  const value = `${fact.degree.toFixed(1)}° ${sign}`;
  return fact.retrograde ? `${value} · Rx` : value;
}

export function AstrologyChartFoundation({
  presentation,
  language,
  sourceLabel,
}: Props) {
  const [selectedFactId, setSelectedFactId] = useState<string | null>(null);
  const strings = copy(language);
  const selectedFact = useMemo(
    () =>
      presentation.facts.find((fact) => fact.id === selectedFactId) ??
      presentation.facts[0] ??
      null,
    [presentation.facts, selectedFactId],
  );
  const isPreview = presentation.source === "local_preview";
  const title =
    presentation.status === "ready" ? strings.ready : strings.limited;
  const explanatoryCopy = isPreview
    ? strings.preview
    : presentation.facts.length
      ? strings.legacy
      : strings.missing;

  return (
    <View
      accessibilityLabel={title}
      accessibilityLiveRegion="polite"
      style={[
        styles.shell,
        presentation.status === "ready"
          ? styles.readyShell
          : styles.limitedShell,
      ]}
      testID="astrology-chart-foundation"
    >
      <Text style={styles.eyebrow}>{strings.eyebrow.toUpperCase()}</Text>
      <Text style={styles.title}>{title}</Text>

      <Text style={styles.body}>{explanatoryCopy}</Text>

      {presentation.facts.length ? (
        <View style={styles.factList}>
          <Text style={styles.listTitle}>{strings.facts}</Text>
          {presentation.facts.map((fact) => {
            const selected = selectedFact?.id === fact.id;
            const label = localizeAstrologyLabel(fact.label, language);
            return (
              <Pressable
                key={fact.id}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={`${label}. ${factDescription(fact, language)}`}
                onPress={() => setSelectedFactId(fact.id)}
                style={[styles.factRow, selected && styles.factRowSelected]}
              >
                <View style={styles.factLabelColumn}>
                  <Text
                    style={[
                      styles.factLabel,
                      selected && styles.factLabelSelected,
                    ]}
                  >
                    {label}
                  </Text>
                  <Text style={styles.factMeta}>
                    {fact.kind === "angle" ? strings.angle : strings.placement}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.factValue,
                    selected && styles.factValueSelected,
                  ]}
                >
                  {factDescription(fact, language)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {selectedFact ? (
        <View style={styles.selectionPanel} accessibilityLiveRegion="polite">
          <Text style={styles.selectionEyebrow}>
            {strings.selected.toUpperCase()}
          </Text>
          <Text style={styles.selectionTitle}>
            {localizeAstrologyLabel(selectedFact.label, language)}
          </Text>
          <Text style={styles.selectionBody}>
            {factDescription(selectedFact, language)}
          </Text>
        </View>
      ) : null}

      <Text style={styles.guardrail}>{strings.notCalculated}</Text>
      <Text style={styles.queued}>{strings.queued}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 16,
    padding: 16,
  },
  limitedShell: {
    backgroundColor: "rgba(247, 241, 230, 0.035)",
    borderColor: "rgba(201, 164, 92, 0.38)",
  },
  readyShell: {
    backgroundColor: "rgba(14, 90, 90, 0.16)",
    borderColor: "rgba(201, 164, 92, 0.66)",
  },
  eyebrow: {
    color: "#C9A45C",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.1,
  },
  title: {
    color: "#F7F1E6",
    fontSize: 20,
    fontWeight: "700",
    lineHeight: 26,
    marginTop: 4,
  },
  source: {
    color: "#A8A3A0",
    fontSize: 11,
    marginTop: 4,
  },
  body: {
    color: "#D2CDC4",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 10,
  },
  factList: {
    borderTopColor: "rgba(247, 241, 230, 0.13)",
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 14,
    paddingTop: 12,
  },
  listTitle: {
    color: "#C9A45C",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.9,
    textTransform: "uppercase",
  },
  factRow: {
    alignItems: "center",
    borderBottomColor: "rgba(247, 241, 230, 0.1)",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 52,
    paddingVertical: 8,
  },
  factRowSelected: {
    backgroundColor: "rgba(201, 164, 92, 0.11)",
    marginHorizontal: -6,
    paddingHorizontal: 6,
  },
  factLabelColumn: {
    flex: 1,
    minWidth: 0,
  },
  factLabel: {
    color: "#F7F1E6",
    fontSize: 14,
    fontWeight: "700",
  },
  factLabelSelected: {
    color: "#E3C27A",
  },
  factMeta: {
    color: "#A8A3A0",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginTop: 2,
  },
  factValue: {
    color: "#D2CDC4",
    flexShrink: 1,
    fontSize: 13,
    marginLeft: 12,
    textAlign: "right",
  },
  factValueSelected: {
    color: "#F7F1E6",
  },
  selectionPanel: {
    backgroundColor: "rgba(21, 20, 22, 0.42)",
    borderColor: "rgba(201, 164, 92, 0.24)",
    borderRadius: 6,
    borderWidth: 1,
    marginTop: 14,
    padding: 12,
  },
  selectionEyebrow: {
    color: "#C9A45C",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.9,
  },
  selectionTitle: {
    color: "#F7F1E6",
    fontSize: 17,
    fontWeight: "700",
    marginTop: 3,
  },
  selectionBody: {
    color: "#D2CDC4",
    fontSize: 13,
    marginTop: 3,
  },
  guardrail: {
    color: "#A8A3A0",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 14,
  },
  queued: {
    color: "#C9A45C",
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 18,
    marginTop: 8,
  },
});
