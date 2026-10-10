import * as Linking from "expo-linking";
import { Link } from "expo-router";
import { useState } from "react";
import { Platform, Pressable, ScrollView, Share, Text, TextInput, View } from "react-native";
import { AppFrame } from "@/components/app-frame";
import { BrandHeader } from "@/components/brand-header";
import { useCloudAccount } from "@/components/cloud-account-provider";
import { useMealPlanner } from "@/components/meal-planner-provider";
import { brand } from "@/constants/brand";
import { getSupabase } from "@/lib/supabase";

function Button({ title, onPress, disabled = false }: {
  title: string; onPress: () => void; disabled?: boolean;
}) {
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress}
    style={{ padding: 13, borderRadius: 12, backgroundColor: brand.orange, opacity: disabled ? 0.5 : 1 }}>
    <Text style={{ color: brand.white, textAlign: "center", fontWeight: "600" }}>{title}</Text>
  </Pressable>;
}

function friendlyAuthError(message: string) {
  if (/invalid login credentials/i.test(message)) return "邮箱或密码不正确。";
  if (/email not confirmed/i.test(message)) return "请先打开邮件验证邮箱，再登录。";
  if (/already registered/i.test(message)) return "这个邮箱已有账号，请选择登录。";
  if (/rate limit|too many|security purposes/i.test(message)) return "请求较频繁，请稍后再试。";
  if (/password.*least|weak password/i.test(message)) return "密码至少需要 8 位，请使用更强的密码。";
  return "操作未成功，请检查网络和邮箱后重试。";
}

export default function AccountScreen() {
  const account = useCloudAccount();
  const planner = useMealPlanner();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signUp, setSignUp] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [confirmCloud, setConfirmCloud] = useState(false);
  const [confirmLocal, setConfirmLocal] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setMessage("");
    try { await action(); }
    catch (error) { setMessage(friendlyAuthError(error instanceof Error ? error.message : "")); }
    finally { setBusy(false); }
  };
  const redirectUrl = () => Platform.OS === "web" ? window.location.origin + "/account" : Linking.createURL("account");
  const submit = () => {
    void run(async () => {
      const client = getSupabase();
      if (!client) return;
      if (account.recovery) {
        if (password.length < 8) { setMessage("新密码至少需要 8 位。"); return; }
        const { error } = await client.auth.updateUser({ password });
        if (error) throw error;
        account.finishRecovery();
        setPassword("");
        setMessage("密码已更新。");
      } else {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || password.length < 8) {
          setMessage("请输入有效邮箱和至少 8 位密码。"); return;
        }
        if (signUp) {
          const { data, error } = await client.auth.signUp({
            email: email.trim(), password, options: { emailRedirectTo: redirectUrl() },
          });
          if (error) throw error;
          setMessage(data.session ? "账号已创建。" : "验证邮件已发送。请打开邮件确认邮箱，再回来登录。");
        } else {
          const { error } = await client.auth.signInWithPassword({ email: email.trim(), password });
          if (error) throw error;
        }
        setPassword("");
      }
    });
  };
  const logout = () => {
    void run(async () => {
      await planner.flush();
      const { error } = await getSupabase()!.auth.signOut({ scope: "local" });
      if (error) throw error;
      setConfirmLogout(false);
      setMessage("已退出。本机账号缓存会保留，重新登录后可继续同步。");
    });
  };
  const exportBackup = () => {
    void run(async () => {
      const content = JSON.stringify({
        format: "mealweek-planner-v1", exportedAt: new Date().toISOString(),
        plan: planner.plan, checked: planner.checked,
      }, null, 2);
      if (Platform.OS === "web") {
        const url = URL.createObjectURL(new Blob([content], { type: "application/json" }));
        const link = document.createElement("a");
        link.href = url;
        link.download = "mealweek-backup-" + new Date().toISOString().slice(0, 10) + ".json";
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } else {
        await Share.share({ title: "一周好食排餐备份", message: content });
      }
      setMessage("备份已导出，包含当前设备上的排餐和购物勾选。");
    });
  };
  const inputStyle = {
    backgroundColor: brand.card, color: brand.ink, borderWidth: 1,
    borderColor: brand.line, borderRadius: 12, padding: 14, fontSize: 15,
  };

  return <AppFrame>
    <ScrollView contentContainerStyle={{ padding: 22, gap: 18 }}>
      <BrandHeader title="我的账号" subtitle="把每周的安排，带到每一台设备。" />
      <Link href="/" style={{ color: brand.orange }}>← 回到周计划</Link>
      {!account.configured ? (
        <Text style={{ color: brand.ink, lineHeight: 24 }}>
          云同步尚未开通。当前记录保存在本机；开通后可以登录账号，并将本机记录导入云端。
        </Text>
      ) : (
        <>
          {!!account.authError && <Text style={{ color: brand.orange }}>{account.authError}</Text>}
          {(!account.session || account.recovery) ? (
            <View style={{ gap: 14 }}>
              <Text style={{ color: brand.ink, fontSize: 19, fontWeight: "600" }}>
                {account.recovery ? "设置新密码" : signUp ? "创建账号" : "登录账号"}
              </Text>
              {!account.recovery && <TextInput
                accessibilityLabel="邮箱" placeholder="邮箱" placeholderTextColor={brand.muted}
                autoCapitalize="none" autoCorrect={false} keyboardType="email-address"
                textContentType="emailAddress" autoComplete="email" value={email} onChangeText={setEmail}
                style={inputStyle} editable={!busy}
              />}
              <TextInput accessibilityLabel={account.recovery ? "新密码" : "密码"}
                placeholder={account.recovery ? "新密码（至少 8 位）" : "密码（至少 8 位）"}
                placeholderTextColor={brand.muted} secureTextEntry autoCapitalize="none" autoCorrect={false}
                textContentType={signUp || account.recovery ? "newPassword" : "password"}
                autoComplete={signUp || account.recovery ? "new-password" : "current-password"}
                value={password} onChangeText={setPassword} style={inputStyle} editable={!busy}
              />
              <Button title={busy ? "处理中…" : account.recovery ? "更新密码" : signUp ? "注册" : "登录"} disabled={busy} onPress={submit} />
              {!account.recovery && <>
                <Pressable accessibilityRole="button" disabled={busy} onPress={() => { setSignUp(!signUp); setMessage(""); }}>
                  <Text style={{ color: brand.orange }}>{signUp ? "已有账号？登录" : "还没有账号？注册"}</Text>
                </Pressable>
                <Pressable accessibilityRole="button" disabled={busy} onPress={() => {
                  void run(async () => {
                    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setMessage("请先填写邮箱。"); return; }
                    const { error } = await getSupabase()!.auth.resetPasswordForEmail(email.trim(), { redirectTo: redirectUrl() });
                    if (error) throw error;
                    setMessage("如果该邮箱有账号，你会收到重置密码邮件。");
                  });
                }}><Text style={{ color: brand.muted }}>忘记密码</Text></Pressable>
              </>}
            </View>
          ) : (
            <View style={{ gap: 14 }}>
              <Text style={{ color: brand.ink }}>已登录：{account.session.user.email}</Text>
              <Text style={{ color: brand.muted, lineHeight: 22 }}>
                同一个账号可以在手机和电脑上使用。记录按账号保存；打开页面时及使用过程中会自动同步。
              </Text>
              <Button title={planner.syncStatus === "syncing" ? "正在同步…" : "立即同步"}
                disabled={busy || planner.syncStatus === "syncing" || planner.syncStatus === "conflict"}
                onPress={() => { void run(() => planner.sync()); }} />
              {planner.syncStatus === "conflict" && (
                <View style={{ padding: 16, borderRadius: 12, gap: 12, backgroundColor: brand.orangeSoft }}>
                  <Text style={{ color: brand.ink, lineHeight: 22 }}>
                    另一台设备修改了同一条记录。保留本机修改时，只替换你编辑过的条目；使用云端记录会放弃当前待同步修改。
                  </Text>
                  <Button title={confirmLocal ? "确认保留本机修改" : "保留本机修改"}
                    disabled={busy} onPress={() => {
                      if (!confirmLocal) { setConfirmLocal(true); setConfirmCloud(false); return; }
                      void run(async () => { await planner.keepLocal(); setConfirmLocal(false); });
                    }} />
                  <Button title={confirmCloud ? "确认使用云端记录" : "使用云端记录"}
                    disabled={busy} onPress={() => {
                      if (!confirmCloud) { setConfirmCloud(true); setConfirmLocal(false); return; }
                      void run(async () => { await planner.useCloud(); setConfirmCloud(false); });
                    }} />
                </View>
              )}
              <Button title="导入登录前的本机记录" disabled={busy || planner.syncStatus === "conflict" || planner.syncStatus === "syncing"}
                onPress={() => { void run(async () => {
                  const count = await planner.importGuest();
                  setMessage(count ? `已导入 ${count} 条本机记录，保存状态见上方。` : "没有可导入的新记录。账号里已有的内容会保留。");
                }); }} />
              <Text style={{ color: brand.muted, fontSize: 12, lineHeight: 20 }}>
                导入会补充云端缺少的餐次和购物勾选，不会覆盖已有记录。请在保存过旧记录的浏览器和网址中操作。
              </Text>
              {confirmLogout && planner.pendingCount > 0 && <Text style={{ color: brand.orange }}>
                还有 {planner.pendingCount} 条修改未同步。退出后会留在此设备，重新登录才能继续上传。
              </Text>}
              <Button title={confirmLogout ? "确认退出登录" : "退出登录"} disabled={busy || planner.syncStatus === "syncing"}
                onPress={() => { if (!confirmLogout) setConfirmLogout(true); else logout(); }} />
            </View>
          )}
        </>
      )}
      <Button title="导出排餐备份" disabled={busy} onPress={exportBackup} />
      {!!message && <Text accessibilityRole="alert" style={{ color: brand.ink, lineHeight: 23 }}>{message}</Text>}
    </ScrollView>
  </AppFrame>;
}
