import { useState, useEffect } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useTranslation } from "react-i18next";
import { useUIStore } from "../../store/uiStore";
import { useToastStore } from "../../store/toastStore";
import { api, ApiError } from "../../lib/api";
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
  Brain,
  Plus,
  Pencil,
  Trash2,
} from "lucide-react";
import { cn } from "../../lib/cn";
import type { Personality, SavedNote, UsageReport } from "../../types";
import { createPortal } from "react-dom";

type Tab = "general" | "personality" | "memory" | "usage";

export function SettingsDialog() {
  const reduced = useReducedMotion();
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

  // ── STATE UNTUK SAVED MEMORY ──
  const [memoryNotes, setMemoryNotes] = useState<SavedNote[]>([]);
  const [memoryLoading, setMemoryLoading] = useState(false);
  const [memorySaving, setMemorySaving] = useState(false);
  const [memoryError, setMemoryError] = useState<string | null>(null);
  const [memoryConfirmClear, setMemoryConfirmClear] = useState(false);
  const [noteForm, setNoteForm] = useState<{
    topic: string;
    text: string;
    editingIndex: number | null;
  }>({ topic: "", text: "", editingIndex: null });

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

  useEffect(() => {
    if (settingsOpen && activeTab === "memory") {
      setMemoryLoading(true);
      setMemoryError(null);
      setMemoryConfirmClear(false);
      setNoteForm({ topic: "", text: "", editingIndex: null });
      api.me.memory
        .get()
        .then((res) =>
          setMemoryNotes(Array.isArray(res?.notes) ? res.notes : []),
        )
        .catch((err: unknown) =>
          setMemoryError(
            err instanceof ApiError
              ? err.message || t("memory.loadError")
              : t("memory.loadError"),
          ),
        )
        .finally(() => setMemoryLoading(false));
    }
  }, [settingsOpen, activeTab, t]);

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

  // ── SAVED MEMORY HANDLERS ──
  const resetNoteForm = (): void => {
    setNoteForm({ topic: "", text: "", editingIndex: null });
    setMemoryError(null);
  };

  const validateNote = (topic: string, text: string): string | null => {
    if (topic.length < 2) return t("memory.errors.topicTooShort");
    if (topic.length > 64) return t("memory.errors.topicTooLong");
    if (text.length < 1) return t("memory.errors.textEmpty");
    if (text.length > 240) return t("memory.errors.textTooLong");
    return null;
  };

  const handleSaveNote = async (): Promise<void> => {
    const topic = noteForm.topic.trim();
    const text = noteForm.text.trim();
    const validation = validateNote(topic, text);
    if (validation) {
      setMemoryError(validation);
      return;
    }
    const next: SavedNote[] =
      noteForm.editingIndex === null
        ? [...memoryNotes, { topic, text }]
        : memoryNotes.map((n, i) =>
            i === noteForm.editingIndex ? { ...n, topic, text } : n,
          );
    if (next.length > 24) {
      setMemoryError(t("memory.errors.tooMany"));
      return;
    }
    setMemorySaving(true);
    setMemoryError(null);
    try {
      await api.me.memory.save(next);
      setMemoryNotes(next);
      resetNoteForm();
      pushToast("success", t("memory.toastSaved"));
    } catch (err) {
      setMemoryError(
        err instanceof ApiError
          ? err.message || t("memory.saveError")
          : t("memory.saveError"),
      );
    } finally {
      setMemorySaving(false);
    }
  };

  const handleDeleteNote = async (index: number): Promise<void> => {
    const next = memoryNotes.filter((_, i) => i !== index);
    setMemorySaving(true);
    setMemoryError(null);
    try {
      await api.me.memory.save(next);
      setMemoryNotes(next);
      if (noteForm.editingIndex !== null) resetNoteForm();
      pushToast("success", t("memory.toastSaved"));
    } catch (err) {
      setMemoryError(
        err instanceof ApiError
          ? err.message || t("memory.saveError")
          : t("memory.saveError"),
      );
    } finally {
      setMemorySaving(false);
    }
  };

  const handleClearAll = async (): Promise<void> => {
    setMemorySaving(true);
    setMemoryError(null);
    try {
      await api.me.memory.clear();
      setMemoryNotes([]);
      setMemoryConfirmClear(false);
      resetNoteForm();
      pushToast("success", t("memory.toastCleared"));
    } catch (err) {
      setMemoryError(
        err instanceof ApiError
          ? err.message || t("memory.clearError")
          : t("memory.clearError"),
      );
    } finally {
      setMemorySaving(false);
    }
  };

  const tabs = [
    { id: "general" as Tab, icon: SettingsIcon, label: t("settings.general") },
    {
      id: "personality" as Tab,
      icon: UserCog,
      label: t("settings.personality"),
    },
    { id: "memory" as Tab, icon: Brain, label: t("settings.memory") },
    { id: "usage" as Tab, icon: BarChart3, label: t("settings.usage") },
  ];

  return createPortal(
    <AnimatePresence>
      {settingsOpen && (
        <motion.div
          key="settings-overlay"
          initial="closed"
          animate="open"
          exit="closed"
          variants={{ open: {}, closed: {} }}
          className="fixed inset-0 z-50 flex justify-start">
          <motion.div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            variants={{ closed: { opacity: 0 }, open: { opacity: 1 } }}
            transition={{ duration: reduced ? 0 : 0.16 }}
            onClick={() => setSettingsOpen(false)}
          />
          <motion.div
            variants={{
              closed: { x: reduced ? 0 : -32, opacity: 0 },
              open: { x: 0, opacity: 1 },
            }}
            transition={{ duration: reduced ? 0 : 0.2, ease: "easeOut" }}
            className="relative w-full max-w-5xl h-full bg-surface border-l border-line shadow-2xl flex flex-col">
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
                <motion.div
                  initial={{ opacity: reduced ? 1 : 0, y: reduced ? 0 : 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: reduced ? 0 : 0.14 }}
                  className="space-y-6">
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
                </motion.div>
              )}

              {/* ── 2. TAB PERSONALITY ── */}
              {activeTab === "personality" && (
                <motion.div
                  initial={{ opacity: reduced ? 1 : 0, y: reduced ? 0 : 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: reduced ? 0 : 0.14 }}
                  className="space-y-6">
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
                </motion.div>
              )}

              {/* ── 3. TAB SAVED MEMORY ── */}
              {activeTab === "memory" && (
                <motion.div
                  initial={{ opacity: reduced ? 1 : 0, y: reduced ? 0 : 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: reduced ? 0 : 0.14 }}
                  className="space-y-6">
                  <div>
                    <h3 className="text-base font-semibold text-ink flex items-center gap-2">
                      <Brain className="w-5 h-5 text-muted" />{" "}
                      {t("settings.memory")}
                    </h3>
                    <p className="text-sm text-muted mt-1">
                      {t("settings.memoryDesc")}
                    </p>
                  </div>

                  {memoryLoading ? (
                    <div className="flex items-center gap-2 text-sm text-muted py-4">
                      <Loader2 className="w-4 h-4 animate-spin" />{" "}
                      {t("common.loading")}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="text-xs text-muted bg-surface2 px-3 py-1.5 rounded-lg border border-line inline-block">
                        {t("memory.count", {
                          count: memoryNotes.length,
                          max: 24,
                        })}
                      </div>

                      {memoryNotes.length === 0 ? (
                        <div className="text-sm text-muted py-2">
                          {t("memory.empty")}
                        </div>
                      ) : (
                        <ul className="space-y-2">
                          {memoryNotes.map((n, i) => (
                            <li
                              key={i}
                              className="border border-line rounded-xl p-3 bg-surface2/30">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium text-ink wrap-break-word">
                                    {n.topic}
                                  </p>
                                  <p className="text-xs text-muted mt-1 whitespace-pre-wrap wrap-break-word">
                                    {n.text}
                                  </p>
                                </div>
                                <div className="flex shrink-0 gap-1">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setNoteForm({
                                        topic: n.topic,
                                        text: n.text,
                                        editingIndex: i,
                                      })
                                    }
                                    aria-label={t("memory.editAria")}
                                    className="p-1.5 text-muted hover:text-ink hover:bg-surface2 rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => void handleDeleteNote(i)}
                                    disabled={memorySaving}
                                    aria-label={t("memory.deleteAria")}
                                    className="p-1.5 text-muted hover:text-danger hover:bg-danger/10 rounded-md transition-colors disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}

                      <div className="border border-line rounded-2xl bg-surface2/20 p-4 space-y-3">
                        <p className="text-sm font-medium text-ink">
                          {noteForm.editingIndex === null
                            ? t("memory.addTitle")
                            : t("memory.editTitle")}
                        </p>
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-muted">
                            {t("memory.topicLabel")}
                          </label>
                          <input
                            type="text"
                            value={noteForm.topic}
                            onChange={(e) =>
                              setNoteForm((f) => ({
                                ...f,
                                topic: e.target.value.slice(0, 64),
                              }))
                            }
                            maxLength={64}
                            placeholder={t("memory.topicPlaceholder")}
                            className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-muted">
                            {t("memory.textLabel")}
                          </label>
                          <textarea
                            value={noteForm.text}
                            onChange={(e) =>
                              setNoteForm((f) => ({
                                ...f,
                                text: e.target.value.slice(0, 240),
                              }))
                            }
                            maxLength={240}
                            placeholder={t("memory.textPlaceholder")}
                            className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent resize-none h-24"
                          />
                        </div>
                        <div className="flex items-center justify-between gap-2 text-[11px] text-muted">
                          <span>
                            {noteForm.topic.length}/64 ·{" "}
                            {noteForm.text.length}/240
                          </span>
                          <div className="flex gap-2">
                            {noteForm.editingIndex !== null && (
                              <button
                                type="button"
                                onClick={resetNoteForm}
                                disabled={memorySaving}
                                className="px-3 py-1.5 text-xs text-muted hover:text-ink rounded-lg transition-colors disabled:opacity-50">
                                {t("common.cancel")}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => void handleSaveNote()}
                              disabled={
                                memorySaving ||
                                (noteForm.editingIndex === null &&
                                  memoryNotes.length >= 24)
                              }
                              className="px-4 py-1.5 bg-accent text-accent-fg rounded-lg text-xs font-medium hover:bg-accent-hover transition-colors disabled:opacity-50 flex items-center gap-1.5">
                              {memorySaving ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Plus className="w-3.5 h-3.5" />
                              )}
                              {t("memory.save")}
                            </button>
                          </div>
                        </div>
                      </div>

                      {memoryError && (
                        <div className="text-xs text-danger bg-danger/10 border border-danger/20 rounded-lg p-2">
                          {memoryError}
                        </div>
                      )}

                      {memoryNotes.length > 0 && (
                        <div className="pt-2 flex justify-end">
                          {memoryConfirmClear ? (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted">
                                {t("memory.confirmClearPrompt")}
                              </span>
                              <button
                                type="button"
                                onClick={() => setMemoryConfirmClear(false)}
                                disabled={memorySaving}
                                className="px-3 py-1.5 text-xs text-muted hover:text-ink rounded-lg transition-colors disabled:opacity-50">
                                {t("common.cancel")}
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleClearAll()}
                                disabled={memorySaving}
                                className="px-3 py-1.5 text-xs bg-danger/10 text-danger border border-danger/30 rounded-lg hover:bg-danger/20 transition-colors disabled:opacity-50">
                                {memorySaving
                                  ? t("common.loading")
                                  : t("memory.clearConfirm")}
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setMemoryConfirmClear(true)}
                              disabled={memorySaving}
                              className="px-3 py-1.5 text-xs text-danger border border-danger/30 rounded-lg hover:bg-danger/10 transition-colors disabled:opacity-50 flex items-center gap-1.5">
                              <Trash2 className="w-3.5 h-3.5" />
                              {t("memory.clearAll")}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              )}

              {/* ── 4. TAB USAGE ── */}
              {activeTab === "usage" && (
                <motion.div
                  initial={{ opacity: reduced ? 1 : 0, y: reduced ? 0 : 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: reduced ? 0 : 0.14 }}
                  className="space-y-6">
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
                </motion.div>
              )}
            </div>
          </div>
        </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
