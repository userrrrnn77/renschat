// src/components/media/ClaimDonationDialog.tsx
import { useState } from "react";
import { Modal } from "../ui/Modal";
import { api, ApiError } from "../../lib/api";
import { useMediaStore } from "../../store/mediaStore";
import { useToastStore } from "../../store/toastStore";

export function ClaimDonationDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
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
        `Kredit masuk: +${res.creditsGranted.imageFlux3} gambar, +${res.creditsGranted.videoCosmos} video`,
      );
      await fetchEntitlements();
      setEmail("");
      setTxId("");
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(
          err.code === "CLAIM_NOT_FOUND"
            ? "Klaim donasi tidak ditemukan. Periksa email dan ID transaksi."
            : err.message,
        );
      } else {
        setError(err instanceof Error ? err.message : "Gagal mengklaim donasi");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={busy ? () => {} : onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div>
          <h2 className="text-lg font-semibold text-ink">Klaim donasi</h2>
          <p className="text-sm text-muted mt-1">
            Masukkan email dan ID transaksi Ko-fi untuk mengaitkan donasi ke
            akun ini.
          </p>
        </div>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted">Email donatur</span>
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
            ID transaksi Ko-fi (kofi_transaction_id)
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
            Lihat di email konfirmasi Ko-fi atau di halaman Riwayat donasi.
          </span>
        </label>
        {error && <p className="text-xs text-danger">{error}</p>}
        <div className="flex gap-2 justify-end mt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="px-3 py-1.5 text-sm text-muted hover:text-ink transition-colors disabled:opacity-50">
            Batal
          </button>
          <button
            type="submit"
            disabled={busy || email.length < 3 || txId.length < 1}
            className="px-4 py-1.5 text-sm bg-accent text-accent-fg rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-50">
            {busy ? "Mengklaim…" : "Klaim"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
