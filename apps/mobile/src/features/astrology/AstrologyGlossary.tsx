import React from "react";
import { ScrollView, Text, StyleSheet } from "react-native";
import { colors, typography } from "../../theme";
type Lang = string;
const bodies: Record<string, [string, string]> = {
  sun: [
    "Mặt Trời — điều bạn muốn nuôi dưỡng và chủ động thể hiện. Hãy thử đọc vị trí này như một câu hỏi về hướng sống; đừng đồng nhất nó với toàn bộ con người bạn.",
    "Sun — what you want to cultivate and deliberately express. Read this placement as a question about direction, rather than your entire identity.",
  ],
  moon: [
    "Mặt Trăng — thói quen tìm sự dễ chịu và cảm giác được chăm sóc. Quan sát một tình huống cụ thể gần đây trước khi kết luận. Mặt Trăng đi nhanh nên giờ sinh không rõ có thể đổi cung.",
    "Moon — familiar ways of seeking comfort and care. Start with a recent situation before drawing conclusions. The Moon moves quickly; uncertain birth time can change its sign.",
  ],
  mercury: [
    "Sao Thủy — cách đặt câu hỏi, học và truyền đạt. Thử phân biệt điều bạn đã quan sát với điều bạn đang suy đoán. Đây không phải phép đo trí thông minh.",
    "Mercury — questioning, learning and communicating. Separate what you observed from what you inferred. This is not a measure of intelligence.",
  ],
  venus: [
    "Sao Kim — điều bạn trân trọng, niềm vui và cách trao nhận. Hãy nghĩ đến một lựa chọn thể hiện giá trị của bạn, thay vì suy ra ai là người hợp hay khắc.",
    "Venus — values, enjoyment and giving and receiving. Consider a choice that expresses your values, rather than deciding who is compatible or incompatible.",
  ],
  mars: [
    "Sao Hỏa — hành động, nỗ lực và cách đặt giới hạn. Một bước thử nhỏ có thể hữu ích hơn việc tự gắn nhãn mạnh mẽ hay yếu đuối. Vị trí này không dự báo xung đột.",
    "Mars — action, effort and boundaries. A small experiment can be more useful than labelling yourself strong or weak. This placement does not predict conflict.",
  ],
  jupiter: [
    "Sao Mộc — mở rộng trải nghiệm và tìm ý nghĩa. Đối chiếu một điều bạn kỳ vọng với nguồn lực thực tế; niềm tin có thể được điều chỉnh khi có thông tin mới.",
    "Jupiter — expanding experience and seeking meaning. Compare a hope with the resources available; beliefs can change with new information.",
  ],
  saturn: [
    "Sao Thổ — trách nhiệm, cấu trúc và thời gian. Phân biệt một giới hạn giúp bạn bền vững với một quy tắc không còn phù hợp. Không dùng biểu tượng này để dự báo tai họa.",
    "Saturn — responsibility, structure and time. Distinguish a useful limit from a rule that no longer serves you. This symbol does not forecast misfortune.",
  ],
  uranus: [
    "Sao Thiên Vương — đổi mới và nhu cầu tự chủ. Vì chuyển động chậm, cung của thiên thể này được nhiều người cùng thế hệ chia sẻ; không nên đọc thành đặc điểm riêng tuyệt đối.",
    "Uranus — innovation and autonomy. Its slow movement means many people in a generation share its sign; avoid treating it as a uniquely personal trait.",
  ],
  neptune: [
    "Sao Hải Vương — tưởng tượng, lý tưởng và sự mơ hồ. Ghi rõ điều đã biết và điều bạn mong muốn. Đây là vị trí mang tính thế hệ, không xác nhận khả năng tâm linh.",
    "Neptune — imagination, ideals and ambiguity. Note what is known and what is hoped for. This is a generational placement, not evidence of supernatural ability.",
  ],
  pluto: [
    "Sao Diêm Vương — thay đổi dài hạn, quyền chủ động và điều khó buông. Vị trí theo cung thường chung cho một thế hệ; nội dung chỉ là lăng kính suy ngẫm, không chẩn đoán sang chấn.",
    "Pluto — long-term change, agency and what is hard to release. A sign placement often spans a generation; it is a reflective lens, not a trauma diagnosis.",
  ],
  ascendant: [
    "Cung mọc (ASC) — giao điểm phía đông giữa hoàng đạo và chân trời tại nơi, giờ sinh. Trong cách đọc biểu tượng, nó gợi câu hỏi về cách bước vào một hoàn cảnh mới. Sai giờ sinh có thể làm vị trí này thay đổi đáng kể.",
    "Ascendant (ASC) — the eastern intersection of the ecliptic and horizon at the birth place and time. Symbolically it invites questions about entering new situations. Birth-time errors can shift it substantially.",
  ],
  midheaven: [
    "Thiên đỉnh (MC) — giao điểm hoàng đạo với kinh tuyến ở phía trên chân trời. Trong hệ Whole Sign, MC không nhất thiết là đỉnh nhà 10. Có thể dùng nó để suy ngẫm về đóng góp và điều muốn được ghi nhận.",
    "Midheaven (MC) — the upper intersection of ecliptic and meridian. In Whole Sign houses, it need not be the tenth-house cusp. It can prompt reflection on contribution and recognition.",
  ],
};
const aspects: Record<string, [string, string, string, string]> = {
  conjunction: [
    "Đồng vị",
    "Conjunction",
    "Hai thiên thể gần cùng kinh độ (0°; dung sai 6°). Hãy thử nhìn hai chủ đề cùng xuất hiện trong một hoàn cảnh. Gần nhau không tự động có nghĩa tốt hay xấu.",
    "Two bodies near the same longitude (0°; orb 6°). Consider two themes appearing in one situation. Proximity is not inherently good or bad.",
  ],
  sextile: [
    "Lục hợp",
    "Sextile",
    "Góc 60°, dung sai 4°. Trong cách đọc biểu tượng, đây là lời mời thử phối hợp hai chủ đề bằng một hành động có chủ ý. Cơ hội không phải lời hứa kết quả.",
    "A 60° angle, orb 4°. Symbolically, try connecting the themes through a deliberate action. Opportunity is not a promised outcome.",
  ],
  square: [
    "Vuông góc",
    "Square",
    "Góc 90°, dung sai 5°. Có thể dùng để xem hai nhu cầu đang cạnh tranh thời gian hoặc nguồn lực. Hãy tìm một cách thương lượng thay vì coi căng thẳng là định mệnh.",
    "A 90° angle, orb 5°. Explore two needs competing for time or resources. Look for negotiation rather than treating tension as fate.",
  ],
  trine: [
    "Tam hợp",
    "Trine",
    "Góc 120°, dung sai 5°. Có thể gợi một cách phối hợp quen thuộc. Điều dễ làm vẫn cần rèn luyện và lựa chọn; góc này không bảo đảm tài năng hoặc thành công.",
    "A 120° angle, orb 5°. Consider a familiar way of combining themes. Ease still requires practice and choice; this angle guarantees neither talent nor success.",
  ],
  opposition: [
    "Đối đỉnh",
    "Opposition",
    "Góc 180°, dung sai 6°. Đặt hai chủ đề ở hai đầu một câu hỏi: khi nào bạn cần mỗi bên? Không cần loại bỏ một bên để giữ được sự linh hoạt.",
    "A 180° angle, orb 6°. Put two themes at opposite ends of a question: when do you need each? Flexibility need not mean rejecting one side.",
  ],
};
const houses = [
  ["Bắt đầu và cách hiện diện", "Beginnings and presence"],
  ["Nguồn lực và điều quý trọng", "Resources and values"],
  ["Học hỏi và trao đổi gần gũi", "Learning and everyday exchange"],
  ["Mái nhà và cảm giác có gốc rễ", "Home and roots"],
  ["Sáng tạo, vui chơi và biểu đạt", "Creativity, play and expression"],
  ["Nhịp sinh hoạt và công việc thường ngày", "Routines and everyday work"],
  ["Hợp tác và cam kết đôi bên", "Partnership and mutual commitments"],
  ["Chia sẻ, giới hạn và thay đổi", "Sharing, boundaries and change"],
  ["Góc nhìn rộng và học hỏi sâu", "Wider perspectives and deeper learning"],
  ["Đóng góp và vai trò công khai", "Contribution and public roles"],
  ["Bạn bè và cộng đồng", "Friendships and community"],
  ["Riêng tư, nghỉ ngơi và chiêm nghiệm", "Privacy, rest and contemplation"],
];
export const bodyMeaning = (id: string, language: Lang) =>
  bodies[id]?.[language === "vi" ? 0 : 1] ?? "";
export const aspectName = (id: string, language: Lang) =>
  aspects[id]?.[language === "vi" ? 0 : 1] ?? id;
export const aspectMeaning = (id: string, language: Lang) =>
  aspects[id]?.[language === "vi" ? 2 : 3] ?? "";
export const houseMeaning = (house: number, language: Lang) =>
  houses[house - 1]?.[language === "vi" ? 0 : 1] ?? "";
export function AstrologyGlossary({
  language,
  id,
}: {
  language: Lang;
  id?: string;
}) {
  const vi = language === "vi";
  return (
    <ScrollView contentContainerStyle={{ padding: 24, gap: 18 }}>
      <Text style={s.heading}>
        {vi ? "Cách đọc bản đồ" : "Reading the chart"}
      </Text>
      <Text style={s.body}>
        {vi
          ? "Thiên thể nói về một chủ đề; cung là lăng kính; nhà là lĩnh vực trải nghiệm; góc hợp là khoảng cách giữa hai thiên thể. Bắt đầu với một câu hỏi cụ thể, rồi kiểm tra xem cách đọc có phù hợp với trải nghiệm của bạn không."
          : "A body represents a theme, a sign a lens, a house an area of experience, and an aspect the separation between bodies. Start with a concrete question, then check the reading against your experience."}
      </Text>
      <Text style={s.body}>
        {vi
          ? "Vòng Nilaza đặt Bạch Dương ở phía trên và tăng kinh độ theo chiều kim đồng hồ để dễ khám phá. Đây là sơ đồ hoàng đạo, không phải bầu trời nhìn từ điện thoại. Các nhãn có thể được dời để tránh chồng; chấm neo mới là vị trí chính xác."
          : "The Nilaza wheel puts Aries at the top and increases longitude clockwise for exploration. It is a zodiac diagram, not the sky viewed through your phone. Labels can move to avoid overlap; the anchor dot marks the actual position."}
      </Text>
      <Text style={s.body}>
        {vi
          ? "Whole Sign: cung chứa ASC là nhà 1; mỗi nhà chiếm trọn một cung 30°. Các hệ nhà khác có thể cho kết quả khác. Ký hiệu ℞ mô tả chuyển động biểu kiến nghịch chiều nhìn từ Trái Đất, không phải thiên thể thực sự quay ngược quỹ đạo."
          : "Whole Sign: the sign containing the ASC becomes house 1; each house occupies a complete 30° sign. Other house systems can differ. ℞ marks apparent retrograde motion viewed from Earth, not a body reversing its orbit."}
      </Text>
      {id && (
        <Text style={s.body}>
          {bodyMeaning(id, language) || aspectMeaning(id, language)}
        </Text>
      )}
      <Text style={s.body}>
        {vi
          ? "Phép tính vị trí có thể đối chiếu bằng thiên văn. Diễn giải chiêm tinh và thần thoại là nội dung biểu tượng, chưa được xác lập là phương pháp dự báo tính cách hay sự kiện."
          : "Positions can be checked astronomically. Astrological and mythological interpretation is symbolic content, not an established method for predicting personality or events."}
      </Text>
    </ScrollView>
  );
}
const s = StyleSheet.create({
  heading: {
    color: colors.ivory,
    fontFamily: typography.headlineRegularFontFamily,
    fontSize: 30,
  },
  body: {
    color: colors.ivory,
    fontFamily: typography.bodyFontFamily,
    fontSize: 16,
    lineHeight: 26,
  },
});
