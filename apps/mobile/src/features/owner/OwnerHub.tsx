import { useEffect, useRef, useState } from "react";
import { AppState, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { getAdminAccess, getOwnerOverview, type BackendOptions } from "../../backendClient";
import { colors, radius, spacing, typography } from "../../theme";
import { adminWorkspaceUrl, type AdminAccess } from "./access";

export function OwnerHub({ options, consoleUrl, onBack }: { options: BackendOptions; consoleUrl?: string; onBack: () => void }) {
  const [access, setAccess] = useState<AdminAccess | null>(null);
  const [overview, setOverview] = useState<Record<string, number> | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const requestRef = useRef(0);
  useEffect(() => {
    let active = true;
    const request = ++requestRef.current;
    setAccess(null); setOverview(null); setError(""); setLoading(true);
    void getAdminAccess(options).then(async next => {
      if (!next.capabilities.includes("hub.read")) throw Error("denied");
      const counts = next.capabilities.includes("overview.read") ? await getOwnerOverview(options) : null;
      if (active && request === requestRef.current) { setAccess(next); setOverview(counts); }
    }).catch(() => { if (active && request === requestRef.current) setError("Không thể xác minh quyền. Quyền có thể đã thay đổi hoặc kết nối đang gián đoạn."); })
      .finally(() => { if (active && request === requestRef.current) setLoading(false); });
    return () => { active = false; requestRef.current += 1; };
  }, [options, revision]);
  useEffect(() => {
    const subscription = AppState.addEventListener("change", state => {
      requestRef.current += 1; setAccess(null); setOverview(null);
      if (state === "active") setRevision(value => value + 1);
    });
    return () => subscription.remove();
  }, []);
  async function open(workspace: "content" | "ai-studio") {
    setError("");
    try {
      const fresh = await getAdminAccess(options);
      const cap = workspace === "content" ? "content.read" : "ai.read";
      if (!fresh.capabilities.includes(cap)) throw Error("denied");
      const url = adminWorkspaceUrl(consoleUrl, workspace, __DEV__);
      if (!url) throw Error("missing URL");
      await Linking.openURL(url);
    } catch { setAccess(null); setOverview(null); setError("Chưa mở được trang quản trị. Hãy kiểm tra kết nối và xác minh lại quyền."); }
  }
  const counts: Record<string, string> = { activePersonas: "Người dẫn đường đang hoạt động", activeDecks: "Bộ bài đang hoạt động", openSafetyReports: "Báo cáo cần kiểm duyệt", failedJobs: "Tác vụ gặp lỗi", activeAssignments: "Phân quyền đang hiệu lực" };
  return <View style={styles.hub}>
    <Pressable accessibilityRole="button" onPress={onBack} style={styles.button}><Text style={styles.buttonText}>Quay lại hồ sơ</Text></Pressable>
    <Text accessibilityRole="header" style={styles.title}>Trung tâm quản trị</Text>
    <Text style={styles.body}>Quản lý nội dung và cấu hình Nilaza. Không hiển thị hội thoại, Nhật ký hoặc hồ sơ riêng của người dùng.</Text>
    {loading ? <Text accessibilityLiveRegion="polite" style={styles.body}>Đang xác minh quyền…</Text> : null}
    {error ? <Text accessibilityRole="alert" style={styles.body}>{error}</Text> : null}
    {access ? <>
      <Text style={styles.body}>Vai trò: {access.roles.join(", ")}</Text>
      {overview ? Object.entries(counts).map(([key, label]) => <View key={key} style={styles.count}><Text style={styles.body}>{label}</Text><Text style={styles.buttonText}>{overview[key]}</Text></View>) : null}
      <Text style={styles.body}>{access.capabilities.includes("roles.manage") ? "Bạn có quyền quản lý phân quyền. Thao tác quản lý quyền hiện thực hiện qua quy trình quản trị được kiểm soát." : "Chỉ các chức năng được cấp quyền mới khả dụng."}</Text>
      {(["content", "ai-studio"] as const).map(workspace => {
        const configured = Boolean(adminWorkspaceUrl(consoleUrl, workspace, __DEV__));
        const allowed = access.capabilities.includes(workspace === "content" ? "content.read" : "ai.read") && configured;
        return <Pressable key={workspace} accessibilityRole="button" accessibilityState={{ disabled: !allowed }} disabled={!allowed} onPress={() => void open(workspace)} style={[styles.button, !allowed && { opacity: 0.5 }]}><Text style={styles.buttonText}>{workspace === "content" ? "Quản lý nội dung" : "AI Studio"}</Text></Pressable>;
      })}
      <Text style={styles.body}>{consoleUrl ? "Trang quản trị sẽ yêu cầu đăng nhập riêng; không chuyển token qua liên kết." : "Chưa cấu hình địa chỉ trang quản trị cho môi trường này."}</Text>
    </> : null}
    <Pressable accessibilityRole="button" disabled={loading} accessibilityState={{ disabled: loading }} onPress={() => setRevision(value => value + 1)} style={styles.button}><Text style={styles.buttonText}>Xác minh lại quyền</Text></Pressable>
  </View>;
}
const styles = StyleSheet.create({
  hub: { gap: spacing.md, paddingVertical: spacing.lg },
  title: { color: colors.ivory, fontFamily: typography.headlineFontFamily, fontSize: 28 },
  body: { color: colors.moon, fontFamily: typography.bodyFontFamily, fontSize: 15, lineHeight: 23, flexShrink: 1 },
  button: { minHeight: 44, justifyContent: "center", borderColor: colors.gold, borderWidth: 1, borderRadius: radius.control, padding: spacing.sm },
  buttonText: { color: colors.gold, fontFamily: typography.bodySemiBoldFontFamily, fontSize: 15 },
  count: { flexDirection: "row", justifyContent: "space-between", gap: spacing.md, paddingVertical: spacing.sm }
});
