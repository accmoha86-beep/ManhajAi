// lib/result.ts — Result type for error handling without exceptions

export type Result<T> =
  | { ok: true; data: T; error?: never }
  | { ok: false; error: string; data?: never };

export function ok<T>(data: T): Result<T> {
  return { ok: true, data };
}

export function err<T = never>(error: string): Result<T> {
  return { ok: false, error };
}
