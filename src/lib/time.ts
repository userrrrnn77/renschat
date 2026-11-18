import i18n from "../i18n";
import type { TFunction } from "i18next";

export const formatTime = (isoString: string) => {
  return new Date(isoString).toLocaleTimeString(
    i18n.language === "id" ? "id-ID" : "en-US",
    {
      hour: "2-digit",
      minute: "2-digit",
    },
  );
};

export const groupByDate = (isoString: string | null) => {
  if (!isoString) return i18n.t("sidebar.older");
  const d = new Date(isoString);
  const now = new Date();

  const today = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

  const diffDays = Math.floor((today - target) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return i18n.t("sidebar.today");
  if (diffDays === 1) return i18n.t("sidebar.yesterday");
  if (diffDays <= 7) return i18n.t("sidebar.last7Days");
  return i18n.t("sidebar.older");
};

export const formatDuration = (totalSeconds: number, t: TFunction) => {
  const mins = Math.floor(totalSeconds / 60);
  const secs = Math.floor(totalSeconds % 60);

  if (mins > 0) {
    if (secs > 0) {
      // Contoh: 1 menit 9 detik
      return t("common.minuteSecond", { m: mins, s: secs });
    }
    // Contoh: 1 menit
    return t("common.minute", { count: mins });
  }

  // Contoh: 45 detik
  return t("common.second", { count: secs });
};
