// src/lib/errorMessages.ts

export type ErrorKind =
  | "network"
  | "provider"
  | "rate"
  | "timeout"
  | "refused"
  | "credits"
  | "media"
  | "upload"
  | "asset"
  | "auth"
  | "validation"
  | "unknown";

/**
 * Klasifikasi error code backend sesuai error envelope `{ code, message }`.
 * `media`/`upload`/`asset`/`auth`/`validation` sengaja dipisah dari
 * `provider`/`network` supaya UI tidak menawarkan retry buta untuk error
 * permanen (media disabled, kuota upload penuh, file kedaluwarsa, sesi
 * habis, atau validasi input).
 */
export function errorKind(code: string | undefined): ErrorKind {
  switch (code) {
    case "NETWORK_ERROR":
    case "DISCONNECTED":
    case "HTTP_408":
    case "ECONNRESET":
      return "network";
    case "RATE_LIMITED":
    case "COMMAND_RATE_LIMIT":
    case "HTTP_429":
    case "GENERATION_BUSY":
      return "rate";
    case "JOB_TIMEOUT":
    case "COMMAND_TIMEOUT":
    case "HTTP_504":
      return "timeout";
    case "PROVIDER_REFUSED":
      return "refused";
    case "HTTP_502":
    case "HTTP_503":
    case "PROVIDER_ERROR":
    case "STREAM_ERROR":
      return "provider";
    case "INSUFFICIENT_CREDITS":
    case "ENTITLEMENT_REQUIRED":
      return "credits";
    case "MEDIA_DISABLED":
      return "media";
    case "QUOTA_EXCEEDED":
    case "PAYLOAD_TOO_LARGE":
    case "UPLOAD_MISSING":
    case "SIZE_MISMATCH":
    case "HASH_MISMATCH":
    case "UNSUPPORTED_MIME":
      return "upload";
    case "ASSET_EXPIRED":
      return "asset";
    case "HTTP_401":
    case "UNAUTHORIZED":
    case "TOKEN_EXPIRED":
      return "auth";
    case "COMMAND_INVALID_INPUT":
    case "VALIDATION_ERROR":
      return "validation";
    default:
      return "unknown";
  }
}

/**
 * Hanya kind di bawah ini yang aman di-retry dari UI. Error validasi,
 * media disabled, kuota upload, sesi habis, dan asset kedaluwarsa tidak
 * boleh memunculkan tombol "Coba Lagi" — mengulang request tidak akan
 * mengubah hasilnya dan bisa memicu side effect berulang.
 */
export function isRetryable(code: string | undefined): boolean {
  const k = errorKind(code);
  return (
    k === "network" ||
    k === "rate" ||
    k === "timeout" ||
    k === "provider" ||
    k === "refused"
  );
}

export function errorI18nKey(code: string | undefined): string {
  switch (code) {
    case "MEDIA_DISABLED":
      return "errors.mediaDisabled";
    case "COMMAND_INVALID_INPUT":
      return "errors.commandInvalidInput";
    case "COMMAND_NOT_ALLOWED":
      return "errors.commandNotAllowed";
    case "COMMAND_FAILED":
      return "errors.commandFailed";
    case "QUOTA_EXCEEDED":
      return "errors.uploadQuota";
    case "PAYLOAD_TOO_LARGE":
      return "errors.uploadTooLarge";
    case "UPLOAD_MISSING":
      return "errors.uploadMissing";
    case "SIZE_MISMATCH":
      return "errors.uploadSizeMismatch";
    case "HASH_MISMATCH":
      return "errors.uploadHashMismatch";
    case "UNSUPPORTED_MIME":
      return "errors.uploadUnsupported";
    case "ASSET_EXPIRED":
      return "errors.assetExpired";
    case "GENERATION_BUSY":
      return "errors.busy";
    case "INSUFFICIENT_CREDITS":
      return "errors.credits";
    case "ENTITLEMENT_REQUIRED":
      return "errors.entitlementRequired";
    case "HTTP_401":
    case "UNAUTHORIZED":
    case "TOKEN_EXPIRED":
      return "errors.auth";
    default:
      return `errors.${errorKind(code)}`;
  }
}
