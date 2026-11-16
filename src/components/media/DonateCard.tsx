// src/components/media/DonateCard.tsx
import { useEffect, useState } from "react";
import { Modal } from "../ui/Modal";
import { useMediaStore } from "../../store/mediaStore";
import { useToastStore } from "../../store/toastStore";
import { ClaimDonationDialog } from "./ClaimDonationDialog";
import { Copy, ExternalLink } from "lucide-react";

/**
 * Dialog donasi (bukan sekadar card): dibuka dari UserMenu, ImageModelDropdown
 * (model terkunci), atau error INSUFFICIENT_CREDITS. State `donateOpen`
 * hidup di mediaStore agar bisa dipicu dari mana saja.
 */
export function DonateCard() {
  const open = useMediaStore((s) => s.donateOpen);
  const setOpen = useMediaStore((s) => s.setDonateOpen);
  const entitlements = useMediaStore((s) => s.entitlements);
  const fetchEntitlements = useMediaStore((s) => s.fetchEntitlements);
  const pushToast = useToastStore((s) => s.push);
  const [claimOpen, setClaimOpen] = useState(false);

  useEffect(() => {
    if (open && entitlements === null) void fetchEntitlements();
  }, [open, entitlements, fetchEntitlements]);

  const handleCopyCode = async (): Promise<void> => {
    if (!entitlements?.donationCode) return;
    try {
      await navigator.clipboard.writeText(entitlements.donationCode);
      pushToast("success", "Kode donasi disalin");
    } catch {
      pushToast("error", "Gagal menyalin kode");
    }
  };

  return (
    <>
      <Modal open={open} onClose={() => setOpen(false)}>
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-lg font-semibold text-ink">
              Buka fitur ekstra lewat donasi
            </h2>
            <p className="text-sm text-muted mt-1">
              Satu donasi (min. USD 3) langsung memberi{" "}
              <strong className="text-ink">+10 kredit gambar FLUX.3</strong> dan{" "}
              <strong className="text-ink">+4 kredit video Cosmos</strong>{" "}
              sekaligus.
            </p>
          </div>

          {entitlements?.donationCode ? (
            <div className="border border-line rounded-lg p-3 bg-surface2">
              <p className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-1">
                Kode donasi kamu
              </p>
              <div className="flex items-center gap-2">
                <code className="font-mono text-base text-ink flex-1">
                  {entitlements.donationCode}
                </code>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="p-1.5 rounded-md hover:bg-surface border border-line transition-colors"
                  aria-label="Salin kode donasi"
                  title="Salin kode donasi">
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-muted mt-2 leading-relaxed">
                Tulis kode ini di pesan donasi supaya kredit masuk otomatis.
              </p>
            </div>
          ) : (
            <div className="border border-line rounded-lg p-3 bg-surface2 text-sm text-muted">
              Memuat kode donasi…
            </div>
          )}

          <div className="flex flex-col gap-2">
            {entitlements?.koFiUrl ? (
              <a
                href={entitlements.koFiUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-accent text-accent-fg rounded-lg text-sm font-medium hover:bg-accent-hover transition-colors">
                Buka Ko-fi <ExternalLink className="w-4 h-4" />
              </a>
            ) : (
              <p className="text-xs text-muted">
                Halaman Ko-fi belum dikonfigurasi server.
              </p>
            )}
            <button
              type="button"
              onClick={() => setClaimOpen(true)}
              className="text-xs text-accent hover:underline text-left">
              Sudah donasi tapi kredit belum masuk? Klaim di sini
            </button>
          </div>

          <p className="text-[11px] text-muted text-center border-t border-line pt-3">
            Semua fitur tetap gratis. Donasi bersifat opsional.
          </p>
        </div>
      </Modal>
      <ClaimDonationDialog
        open={claimOpen}
        onClose={() => setClaimOpen(false)}
      />
    </>
  );
}
