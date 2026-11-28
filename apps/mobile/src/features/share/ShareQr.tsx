import { View } from "react-native";
import Svg, { Path, Rect } from "react-native-svg";
import { create } from "qrcode/lib/core/qrcode";
import { colors } from "../../theme";

/** Quiet zone in modules around the code; scanners need at least a light border of this width. */
const QUIET = 2;

/**
 * One SVG path for all dark modules, so a short web address (about 30 x 30 modules) stays a single node.
 * Exported for tests. Returns null when the text cannot be encoded (it never throws into the card).
 */
export function qrPath(text: string): { size: number; d: string } | null {
  try {
    const { modules } = create(text, { errorCorrectionLevel: "M" });
    const size = modules.size;
    let d = "";
    for (let row = 0; row < size; row += 1) {
      for (let col = 0; col < size; col += 1) {
        if (modules.data[row * size + col]) d += `M${col + QUIET} ${row + QUIET}h1v1h-1z`;
      }
    }
    return { size: size + QUIET * 2, d };
  } catch {
    return null;
  }
}

/**
 * QR on the share card: charcoal modules on an ivory tile on every skin, because dark-on-light scans most reliably.
 * Decorative for screen readers: the card's label already names the address.
 */
export function ShareQr({ url, size }: { url: string; size: number }) {
  const code = qrPath(url);
  if (!code) return null;
  return (
    <View
      testID="share-card-qr"
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={{ width: size, height: size, borderRadius: Math.min(6, size / 12), overflow: "hidden", backgroundColor: colors.ivory }}
    >
      <Svg width={size} height={size} viewBox={`0 0 ${code.size} ${code.size}`}>
        <Rect x={0} y={0} width={code.size} height={code.size} fill={colors.ivory} />
        <Path d={code.d} fill={colors.charcoal} />
      </Svg>
    </View>
  );
}
