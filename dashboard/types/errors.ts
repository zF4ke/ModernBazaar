/**
 * Shared error shapes for the Next.js API proxy layer and client hooks.
 *
 * The backend (and our proxy helpers) signal failures by returning a plain object
 * with a numeric `status` >= 400 instead of the expected payload. `isBackendError`
 * is the single type guard used everywhere to discriminate that union without `any`.
 */
export interface BackendError {
  status: number
  error?: string
  details?: string
  message?: string
  requiredPermission?: string
  requiredPermissions?: string[]
  currentPermissions?: string[]
  missingPermissions?: string[]
}

/** True when `value` is a backend error envelope (object with a numeric status >= 400). */
export function isBackendError(value: unknown): value is BackendError {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { status?: unknown }).status === "number" &&
    (value as { status: number }).status >= 400
  )
}

/** A fetch/query result that is either the expected payload or a backend error. */
export type BackendResult<T> = T | BackendError

/** Error carrying an HTTP status, thrown by client query helpers. */
export class AppError extends Error {
  readonly status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = "AppError"
    this.status = status
  }
}

/** Narrow an unknown caught error to its HTTP status, if any. */
export function errorStatus(error: unknown): number | undefined {
  if (error instanceof AppError) return error.status
  if (typeof error === "object" && error !== null) {
    const s = (error as { status?: unknown }).status
    if (typeof s === "number") return s
  }
  return undefined
}
