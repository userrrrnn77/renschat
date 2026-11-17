// src/components/media/DonateCard.tsx
import { useEffect, useState } from "react";
import { Modal } from "../ui/Modal";
import { useMediaStore } from "../../store/mediaStore";
import { useToastStore } from "../../store/toastStore";
import { ClaimDonationDialog } from "./ClaimDonationDialog";
import { Copy, ExternalLink } from "lucide-react";
import { useTranslation } from "react-i18next";

/**
 * Dialog donasi (bukan sekadar card): dibuka dari UserMenu, ImageModelDropdown
 * (model terkunci), atau error INSUFFICIENT_CREDITS. State `donateOpen`
 * hidup di mediaStore agar bisa dipicu dari mana saja.
 */
export function DonateCard() {
  const { t } = useTranslation();

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
      pushToast("success", t("donation.codeCopied"));
    } catch {
      pushToast("error", t("donation.codeCopyError"));
    }
  };

  return (
    <>
      <Modal open={open} onClose={() => setOpen(false)}>
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-lg font-semibold text-ink">
              {t("donation.title")}
            </h2>
            <p
              className="text-sm text-muted mt-1"
              dangerouslySetInnerHTML={{ __html: t("donation.desc") }}
            />
          </div>

          {entitlements?.donationCode ? (
            <div className="border border-line rounded-lg p-3 bg-surface2">
              <p className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-1">
                {t("donation.yourCode")}
              </p>
              <div className="flex items-center gap-2">
                <code className="font-mono text-base text-ink flex-1">
                  {entitlements.donationCode}
                </code>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="p-1.5 rounded-md hover:bg-surface border border-line transition-colors"
                  aria-label={t("donation.copyCode")}
                  title={t("donation.copyCode")}>
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-muted mt-2 leading-relaxed">
                {t("donation.codeDesc")}
              </p>
            </div>
          ) : (
            <div className="border border-line rounded-lg p-3 bg-surface2 text-sm text-muted">
              {t("donation.loadingCode")}
            </div>
          )}

          <div className="flex flex-col gap-2">
            {entitlements?.koFiUrl ? (
              <a
                href={entitlements.koFiUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-accent text-accent-fg rounded-lg text-sm font-medium hover:bg-accent-hover transition-colors">
                {t("donation.openKofi")} <ExternalLink className="w-4 h-4" />
              </a>
            ) : (
              <p className="text-xs text-muted">
                {t("donation.kofiNotConfigured")}
              </p>
            )}
            <button
              type="button"
              onClick={() => setClaimOpen(true)}
              className="text-xs text-accent hover:underline text-left">
              {t("donation.alreadyDonated")}
            </button>
          </div>

          <p className="text-[11px] text-muted text-center border-t border-line pt-3">
            {t("donation.freeNote")}
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
