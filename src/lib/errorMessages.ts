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
    case "RATE_LIMITED":
      return "rate";
    case "JOB_TIMEOUT":
      return "timeout";
    case "PROVIDER_REFUSED":
      return "refused";
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
  return `errors.${errorKind(code)}`;
}
