import { useTranslation } from "react-i18next";
import { Modal } from "../ui/Modal";
import { useMediaStore } from "../../store/mediaStore";

export function DonateCard() {
  const { t } = useTranslation();
  const open = useMediaStore((s) => s.donateOpen);
  const setOpen = useMediaStore((s) => s.setDonateOpen);

  return (
    <Modal open={open} onClose={() => setOpen(false)}>
      <div className="space-y-4">
        <h2 className="font-serif text-xl text-ink">
          {t("donation.donateOptional")}
        </h2>
        <p className="text-sm leading-relaxed text-muted">
          {t("donation.supportOnly")}
        </p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg bg-surface2 px-3 py-2 text-sm text-ink hover:bg-line">
          {t("common.close")}
        </button>
      </div>
    </Modal>
  );
}
