import { View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { colors } from "../../theme";
import { moonLitPath, type MoonPhase } from "./moonPhase";

/** Decorative Moon disc lit by today's illumination; hidden from screen readers. */
export function MoonGlyph({ phase, size = 34 }: { phase: Pick<MoonPhase, "illumination" | "waxing">; size?: number }) {
  const c = size / 2, r = size / 2 - 2;
  const lit = moonLitPath(phase, c, r);
  return <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
    <Svg width={size} height={size}>
      <Circle cx={c} cy={c} r={r} fill={colors.surfaceHigh} stroke={colors.border} strokeWidth={1} />
      {lit ? <Path d={lit} fill="#E9DFC9" /> : null}
    </Svg>
  </View>;
}
