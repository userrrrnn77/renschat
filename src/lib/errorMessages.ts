// src/lib/errorMessages.ts

export type ErrorKind =
  | "network"
  | "provider"
  | "rate"
  | "timeout"
  | "refused"
  | "credits"
  | "unknown";

export function errorKind(code: string | undefined): ErrorKind {
  switch (code) {
    case "NETWORK_ERROR":
    case "DISCONNECTED":
      return "network";
    case "HTTP_429":
    case "RATE_LIMITED":
    case "COMMAND_RATE_LIMIT":
      return "rate";
    case "JOB_TIMEOUT":
    case "COMMAND_TIMEOUT":
      return "timeout";
    case "PROVIDER_REFUSED":
      return "refused";
    case "HTTP_502":
    case "HTTP_503":
    case "HTTP_504":
    case "PROVIDER_ERROR":
    case "STREAM_ERROR":
      return "provider";
    case "INSUFFICIENT_CREDITS":
    case "ENTITLEMENT_REQUIRED":
      return "credits";
    default:
      return "unknown";
  }
}

/** Hanya code di bawah ini yang boleh memunculkan tombol Coba Lagi. */
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
    default:
      return `errors.${errorKind(code)}`;
  }
}
