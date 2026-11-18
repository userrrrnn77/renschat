import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useUIStore } from "../../store/uiStore";
import { useToastStore } from "../../store/toastStore";
import { api } from "../../lib/api";
import {
  Sun,
  Moon,
  Monitor,
  UserCog,
  BarChart3,
  Globe,
  X,
  Settings as SettingsIcon,
  Check,
  Loader2,
  Palette,
} from "lucide-react";
import { cn } from "../../lib/cn";
import type { Personality, UsageReport } from "../../types";

type Tab = "general" | "personality" | "usage";

export function SettingsDialog() {
  const { t, i18n } = useTranslation();
  const { settingsOpen, setSettingsOpen, theme, setTheme } = useUIStore();
  const pushToast = useToastStore((s) => s.push);

  const [activeTab, setActiveTab] = useState<Tab>("general");

  // ── STATE UNTUK PERSONALITY ──
  const [loadingPers, setLoadingPers] = useState(false);
  const [savingPers, setSavingPers] = useState(false);
  const [mode, setMode] = useState<Personality["mode"]>("auto");
  const [note, setNote] = useState("");

  // ── STATE UNTUK USAGE ──
  const [usageData, setUsageData] = useState<UsageReport | null>(null);
  const [loadingUsage, setLoadingUsage] = useState(false);

  useEffect(() => {
    if (settingsOpen && activeTab === "personality") {
      setLoadingPers(true);
      api.me
        .getPreferences()
        .then((res) => {
          setMode(res.personality.mode);
          setNote(res.personality.note || "");
        })
        .catch(() => pushToast("error", t("personality.loadError")))
        .finally(() => setLoadingPers(false));
    }
  }, [settingsOpen, activeTab, pushToast, t]);

  useEffect(() => {
    if (settingsOpen && activeTab === "usage") {
      setLoadingUsage(true);
      api.me
        .usage()
        .then((data) => setUsageData(data))
        .catch(() => pushToast("error", t("usage.loadError")))
        .finally(() => setLoadingUsage(false));
    }
  }, [settingsOpen, activeTab, pushToast, t]);

  const handleLanguageChange = (lang: "en" | "id") => {
    i18n.changeLanguage(lang);
    document.documentElement.lang = lang;
  };

  const handleSavePersonality = async () => {
    if (savingPers) return;
    setSavingPers(true);
    try {
      await api.me.updatePreferences({
        personality: { mode, note: note.trim() || undefined },
      });
      pushToast("success", t("personality.toastSuccess"));
    } catch {
      pushToast("error", t("personality.toastError"));
    } finally {
      setSavingPers(false);
    }
  };

  const tabs = [
    { id: "general" as Tab, icon: SettingsIcon, label: t("settings.general") },
    {
      id: "personality" as Tab,
      icon: UserCog,
      label: t("settings.personality"),
    },
    { id: "usage" as Tab, icon: BarChart3, label: t("settings.usage") },
  ];

  if (!settingsOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-start">
      {" "}
      {/* FIX: justify-end */}
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in"
        onClick={() => setSettingsOpen(false)}
      />
      {/* Panel Kanan (Drawer) */}
      <div className="relative w-full max-w-5xl h-full bg-surface border-l border-line shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-line shrink-0">
          <h2 className="text-lg font-semibold text-ink">
            {t("settings.title")}
          </h2>
          <button
            onClick={() => setSettingsOpen(false)}
            className="p-2 -mr-2 text-muted hover:text-ink hover:bg-surface2 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* SIDEBAR KIRI */}
          <div className="w-64 shrink-0 border-r border-line bg-bg/30 p-4 overflow-y-auto hidden md:block">
            <p className="px-3 text-[11px] font-semibold text-muted uppercase tracking-wider mb-3">
              {t("settings.preferences")}
            </p>
            <div className="space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-xl transition-all text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                    activeTab === tab.id
                      ? "bg-surface text-ink font-medium shadow-sm ring-1 ring-line/50"
                      : "text-muted hover:bg-surface2/80 hover:text-ink",
                  )}>
                  <tab.icon className="w-4 h-4 shrink-0" />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* KONTEN KANAN */}
          <div className="flex-1 overflow-y-auto bg-surface">
            {/* TABS MOBILE */}
            <div className="md:hidden flex border-b border-line overflow-x-auto bg-bg/30 shrink-0">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                    activeTab === tab.id
                      ? "border-accent text-accent"
                      : "border-transparent text-muted",
                  )}>
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* WRAPPER KONTEN */}
            <div className="p-6 md:p-10 mx-auto w-full max-w-3xl">
              {/* ── 1. TAB GENERAL (LAYOUT BARU LEBIH RAPI) ── */}
              {activeTab === "general" && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6">
                  {/* SECTION: TAMPILAN / THEME */}
                  <div className="border border-line rounded-2xl bg-surface overflow-hidden">
                    <div className="p-5 border-b border-line bg-surface2/30">
                      <h3 className="text-base font-semibold text-ink flex items-center gap-2">
                        <Palette className="w-5 h-5 text-muted" />
                        {t("settings.theme")}
                      </h3>
                      <p className="text-sm text-muted mt-1">
                        {t("settings.themeDesc")}
                      </p>
                    </div>
                    <div className="p-5 flex justify-center">
                      {" "}
                      {/* Ganti jadi justify-center aja */}
                      <div className="flex w-full max-w-md bg-bg/50 rounded-xl p-1 border border-line/50">
                        {" "}
                        {/* Tambahin w-full */}
                        {[
                          { id: "light", icon: Sun, label: t("theme.light") },
                          { id: "dark", icon: Moon, label: t("theme.dark") },
                          {
                            id: "system",
                            icon: Monitor,
                            label: t("theme.system"),
                          },
                        ].map((item) => (
                          <button
                            key={item.id}
                            onClick={() => setTheme(item.id as any)}
                            className={cn(
                              "flex-1 flex items-center justify-center gap-2 py-2.5 text-sm rounded-lg transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                              theme === item.id
                                ? "bg-surface text-ink font-medium shadow-sm ring-1 ring-line/50"
                                : "text-muted hover:text-ink hover:bg-surface/50",
                            )}>
                            <item.icon className="w-4 h-4" />
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* SECTION: BAHASA / LANGUAGE */}
                  <div className="border border-line rounded-2xl bg-surface overflow-hidden">
                    <div className="p-5 border-b border-line bg-surface2/30">
                      <h3 className="text-base font-semibold text-ink flex items-center gap-2">
                        <Globe className="w-5 h-5 text-muted" />
                        {t("settings.language")}
                      </h3>
                      <p className="text-sm text-muted mt-1">
                        {t("settings.languageDesc")}
                      </p>
                    </div>
                    <div className="p-5 flex justify-center">
                      {" "}
                      {/* <-- Tambahin flex justify-center di sini */}
                      <div className="flex gap-3 w-full max-w-md">
                        {" "}
                        {/* <-- Tambahin w-full di sini */}
                        <button
                          onClick={() => handleLanguageChange("id")}
                          className={cn(
                            "flex-1 py-3 text-sm border rounded-xl transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-accent flex items-center justify-center gap-2",
                            i18n.language === "id"
                              ? "border-accent bg-accent/5 text-accent font-medium ring-1 ring-accent/20"
                              : "border-line text-muted hover:bg-surface2",
                          )}>
                          <span className="text-lg">🇮🇩</span> Indonesia
                        </button>
                        <button
                          onClick={() => handleLanguageChange("en")}
                          className={cn(
                            "flex-1 py-3 text-sm border rounded-xl transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-accent flex items-center justify-center gap-2",
                            i18n.language === "en"
                              ? "border-accent bg-accent/5 text-accent font-medium ring-1 ring-accent/20"
                              : "border-line text-muted hover:bg-surface2",
                          )}>
                          <span className="text-lg">🇬🇧</span> English
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── 2. TAB PERSONALITY ── */}
              {activeTab === "personality" && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div>
                    <h3 className="text-base font-semibold text-ink flex items-center gap-2">
                      <UserCog className="w-5 h-5 text-muted" />{" "}
                      {t("settings.personality")}
                    </h3>
                    <p className="text-sm text-muted mt-1">
                      {t("settings.personalityDesc")}
                    </p>
                  </div>

                  {loadingPers ? (
                    <div className="flex items-center gap-2 text-sm text-muted py-4">
                      <Loader2 className="w-4 h-4 animate-spin" />{" "}
                      {t("common.loading")}
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {[
                          {
                            id: "auto",
                            label: t("personality.auto"),
                            desc: t("personality.autoDesc"),
                          },
                          {
                            id: "serious",
                            label: t("personality.serious"),
                            desc: t("personality.seriousDesc"),
                          },
                          {
                            id: "casual",
                            label: t("personality.casual"),
                            desc: t("personality.casualDesc"),
                          },
                          {
                            id: "playful",
                            label: t("personality.playful"),
                            desc: t("personality.playfulDesc"),
                          },
                        ].map((m) => (
                          <button
                            key={m.id}
                            onClick={() => setMode(m.id as any)}
                            className={cn(
                              "text-left px-4 py-3 border rounded-xl transition-all relative",
                              mode === m.id
                                ? "border-accent bg-accent/5 ring-1 ring-accent/20"
                                : "border-line hover:bg-surface2",
                            )}>
                            <div className="font-medium text-sm text-ink">
                              {m.label}
                            </div>
                            <div className="text-xs text-muted mt-0.5">
                              {m.desc}
                            </div>
                            {mode === m.id && (
                              <Check className="w-4 h-4 text-accent absolute top-3 right-3" />
                            )}
                          </button>
                        ))}
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-ink">
                          {t("personality.noteLabel")}
                        </label>
                        <textarea
                          value={note}
                          onChange={(e) =>
                            setNote(e.target.value.slice(0, 300))
                          }
                          placeholder={t("personality.notePlaceholder")}
                          className="w-full bg-surface2 border border-line rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent resize-none h-24"
                        />
                        <div className="text-[11px] text-muted text-right">
                          {note.length} / 300
                        </div>
                      </div>

                      <div className="pt-2 flex justify-end">
                        <button
                          onClick={handleSavePersonality}
                          disabled={savingPers}
                          className="px-6 py-2.5 bg-accent text-accent-fg rounded-xl text-sm font-medium hover:bg-accent-hover transition-colors disabled:opacity-50 flex items-center gap-2">
                          {savingPers && (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          )}
                          {savingPers
                            ? t("personality.saving")
                            : t("personality.save")}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── 3. TAB USAGE ── */}
              {activeTab === "usage" && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div>
                    <h3 className="text-base font-semibold text-ink flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-muted" />{" "}
                      {t("settings.usage")}
                    </h3>
                    <p className="text-sm text-muted mt-1">
                      {t("settings.usageDesc")}
                    </p>
                  </div>

                  {loadingUsage ? (
                    <div className="flex items-center gap-2 text-sm text-muted py-4">
                      <Loader2 className="w-4 h-4 animate-spin" />{" "}
                      {t("common.loading")}
                    </div>
                  ) : !usageData ? (
                    <div className="text-sm text-muted py-4">
                      {t("usage.empty")}
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="text-xs text-muted bg-surface2 px-4 py-2 rounded-lg border border-line inline-block">
                        {t("usage.period", {
                          month: usageData.month,
                          tz: usageData.timezone,
                        })}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="p-5 border border-line rounded-2xl bg-surface2/30">
                          <p className="text-sm font-medium text-muted mb-1">
                            {t("usage.tokens")}
                          </p>
                          <p className="text-3xl font-semibold text-ink">
                            {usageData.total.totalTokens?.toLocaleString() || 0}
                          </p>
                        </div>
                        <div className="p-5 border border-line rounded-2xl bg-surface2/30">
                          <p className="text-sm font-medium text-muted mb-1">
                            {t("usage.requests")}
                          </p>
                          <p className="text-3xl font-semibold text-ink">
                            {usageData.total.requests?.toLocaleString() || 0}
                          </p>
                        </div>
                        <div className="p-5 border border-line rounded-2xl bg-surface2/30">
                          <p className="text-sm font-medium text-muted mb-1">
                            {t("usage.images")}
                          </p>
                          <p className="text-3xl font-semibold text-ink">
                            {usageData.total.images?.toLocaleString() || 0}
                          </p>
                        </div>
                        <div className="p-5 border border-line rounded-2xl bg-surface2/30">
                          <p className="text-sm font-medium text-muted mb-1">
                            {t("usage.videos")}
                          </p>
                          <p className="text-3xl font-semibold text-ink">
                            {usageData.total.videos?.toLocaleString() || 0}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
