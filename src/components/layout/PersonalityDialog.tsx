// src/components/layout/PersonalityDialog.tsx
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Modal } from "../ui/Modal";
import { useUIStore } from "../../store/uiStore";
import { useToastStore } from "../../store/toastStore";
import { api } from "../../lib/api";
import type { Personality } from "../../types";

export function PersonalityDialog() {
  const { t } = useTranslation();
  const { personalityOpen, setPersonalityOpen } = useUIStore();
  const pushToast = useToastStore((s) => s.push);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<Personality["mode"]>("auto");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!personalityOpen) return;

    setLoading(true);
    api.me
      .getPreferences()
      .then((res) => {
        setMode(res.personality.mode);
        setNote(res.personality.note || "");
      })
      .catch(() => {
        pushToast("error", t("personality.loadError"));
      })
      .finally(() => setLoading(false));
  }, [personalityOpen, pushToast, t]);

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await api.me.updatePreferences({
        personality: { mode, note: note.trim() || undefined },
      });
      pushToast("success", t("personality.toastSuccess"));
      setPersonalityOpen(false);
    } catch {
      pushToast("error", t("personality.toastError"));
    } finally {
      setSaving(false);
    }
  };

  const modes: { id: Personality["mode"]; label: string; desc: string }[] = [
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
  ];

  return (
    <Modal
      open={personalityOpen}
      onClose={() => !saving && setPersonalityOpen(false)}>
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-semibold text-ink">
            {t("personality.title")}
          </h2>
          <p className="text-sm text-muted mt-1">{t("personality.desc")}</p>
        </div>

        {loading ? (
          <div className="text-sm text-muted">{t("common.loading")}</div>
        ) : (
          <>
            <div className="flex flex-col gap-2">
              {modes.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id)}
                  className={`text-left px-4 py-3 border rounded-xl transition-colors ${
                    mode === m.id
                      ? "border-accent bg-accent/10"
                      : "border-line hover:bg-surface2"
                  }`}>
                  <div className="font-medium text-sm text-ink">{m.label}</div>
                  <div className="text-xs text-muted mt-0.5">{m.desc}</div>
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-1.5 mt-2">
              <label className="text-xs font-medium text-muted">
                {t("personality.noteLabel")}
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value.slice(0, 300))}
                placeholder={t("personality.notePlaceholder")}
                className="w-full bg-surface2 border border-line rounded-lg p-3 text-sm focus:outline-none focus:border-accent resize-none h-24"
              />
              <div className="text-[11px] text-muted text-right">
                {note.length} / 300
              </div>
            </div>
          </>
        )}

        <div className="flex justify-end gap-2 mt-2">
          <button
            onClick={() => setPersonalityOpen(false)}
            disabled={saving}
            className="px-4 py-2 text-sm text-muted hover:text-ink transition-colors disabled:opacity-50">
            {t("personality.cancel")}
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="px-4 py-2 text-sm bg-accent text-accent-fg rounded-lg font-medium hover:bg-accent-hover transition-colors disabled:opacity-50">
            {saving ? t("personality.saving") : t("personality.save")}
          </button>
        </div>
      </div>
    </Modal>
  );
}
