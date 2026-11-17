// src/components/media/ClaimDonationDialog.tsx
import { useState } from "react";
import { Modal } from "../ui/Modal";
import { api, ApiError } from "../../lib/api";
import { useMediaStore } from "../../store/mediaStore";
import { useToastStore } from "../../store/toastStore";
import { useTranslation } from "react-i18next";

export function ClaimDonationDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();

  const [email, setEmail] = useState("");
  const [txId, setTxId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchEntitlements = useMediaStore((s) => s.fetchEntitlements);
  const pushToast = useToastStore((s) => s.push);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api.me.claimDonation({
        email: email.trim().toLowerCase(),
        kofiTransactionId: txId.trim(),
      });
      pushToast(
        "success",
        t("donation.creditsAdded", {
          image: res.creditsGranted.imageFlux3,
          video: res.creditsGranted.videoCosmos,
        }),
      );
      await fetchEntitlements();
      setEmail("");
      setTxId("");
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(
          err.code === "CLAIM_NOT_FOUND"
            ? t("donation.claimNotFound")
            : err.message,
        );
      } else {
        setError(err instanceof Error ? err.message : t("donation.claimError"));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={busy ? () => {} : onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div>
          <h2 className="text-lg font-semibold text-ink">
            {t("donation.claimTitle")}
          </h2>
          <p className="text-sm text-muted mt-1">{t("donation.claimDesc")}</p>
        </div>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted">
            {t("donation.donorEmail")}
          </span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={busy}
            required
            placeholder="email@contoh.com"
            className="w-full px-3 py-2 bg-surface2 border border-line rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-60"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted">
            {t("donation.txId")}
          </span>
          <input
            type="text"
            value={txId}
            onChange={(e) => setTxId(e.target.value)}
            disabled={busy}
            required
            placeholder="00000000-1111-2222-3333-444444444444"
            className="w-full px-3 py-2 bg-surface2 border border-line rounded-lg text-sm font-mono focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-60"
          />
          <span className="text-[11px] text-muted">
            {t("donation.txIdDesc")}
          </span>
        </label>
        {error && <p className="text-xs text-danger">{error}</p>}
        <div className="flex gap-2 justify-end mt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="px-3 py-1.5 text-sm text-muted hover:text-ink transition-colors disabled:opacity-50">
            {t("common.cancel")}
          </button>
          <button
            type="submit"
            disabled={busy || email.length < 3 || txId.length < 1}
            className="px-4 py-1.5 text-sm bg-accent text-accent-fg rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-50">
            {busy ? t("donation.claiming") : t("donation.claimButton")}
          </button>
        </div>
      </form>
    </Modal>
  );
}
