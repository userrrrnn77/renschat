// src/components/usage/UsageDialog.tsx
import { useEffect, useState, type ReactNode } from "react";
import { api, ApiError } from "../../lib/api";
import type { UsageReport } from "../../types";
import { useTranslation } from "react-i18next";
import { X, MessageSquare, Image as ImageIcon, Video, Zap } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

export function UsageDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [data, setData] = useState<UsageReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    api.me
      .usage()
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const msg =
          err instanceof ApiError ? err.message : t("usage.loadError");
        setError(msg);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, t]);

  if (!open) return null;

  const chartData =
    data?.daily.map((d) => ({
      day: d.day.slice(5),
      tokens: d.totalTokens,
      images: d.images,
      videos: d.videos,
    })) ?? [];

  const totals = data?.total;
  const isEmpty =
    !loading &&
    !error &&
    data !== null &&
    totals !== undefined &&
    totals.totalTokens === 0 &&
    totals.images === 0 &&
    totals.videos === 0 &&
    totals.requests === 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-3xl bg-surface border border-line rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-4 border-b border-line">
          <h2 className="text-lg font-semibold">{t("usage.title")}</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-surface2 rounded-md"
            title={t("common.close")}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1">
          {loading && (
            <div className="text-sm text-muted">{t("common.loading")}</div>
          )}
          {error && <div className="text-sm text-danger">{error}</div>}
          {isEmpty && (
            <div className="text-sm text-muted">{t("usage.empty")}</div>
          )}

          {data && totals && !loading && !error && !isEmpty && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Stat
                  icon={<Zap className="w-4 h-4" />}
                  label={t("usage.tokens")}
                  value={formatNumber(totals.totalTokens)}
                />
                <Stat
                  icon={<MessageSquare className="w-4 h-4" />}
                  label={t("usage.requests")}
                  value={formatNumber(totals.requests)}
                />
                <Stat
                  icon={<ImageIcon className="w-4 h-4" />}
                  label={t("usage.images")}
                  value={formatNumber(totals.images)}
                />
                <Stat
                  icon={<Video className="w-4 h-4" />}
                  label={t("usage.videos")}
                  value={formatNumber(totals.videos)}
                />
              </div>

              <div>
                <h3 className="text-sm font-semibold mb-2">
                  {t("usage.dailyTokens")}
                </h3>
                <div className="h-52 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="day" fontSize={10} />
                      <YAxis fontSize={10} />
                      <Tooltip />
                      <Bar dataKey="tokens" fill="#6366f1" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold mb-2">
                  {t("usage.dailyMedia")}
                </h3>
                <div className="h-40 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="day" fontSize={10} />
                      <YAxis fontSize={10} allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="images" stackId="a" fill="#8b5cf6" />
                      <Bar dataKey="videos" stackId="a" fill="#06b6d4" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="text-[11px] text-muted">
                {t("usage.period", {
                  month: data.month,
                  tz: data.timezone,
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="border border-line rounded-lg p-3 bg-surface2">
      <div className="flex items-center gap-1.5 text-muted text-xs mb-1">
        {icon}
        <span>{label}</span>
      </div>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}

function formatNumber(n: number): string {
  return new Intl.NumberFormat().format(n);
}
