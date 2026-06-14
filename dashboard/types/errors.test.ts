import { describe, it, expect } from "vitest"
import { isBackendError, errorStatus, AppError } from "./errors"

describe("isBackendError", () => {
  it("accepts an object with a numeric status >= 400", () => {
    expect(isBackendError({ status: 403, error: "Access denied" })).toBe(true)
    expect(isBackendError({ status: 500 })).toBe(true)
  })

  it("rejects success payloads and non-error statuses", () => {
    expect(isBackendError({ items: [], page: 0 })).toBe(false)
    expect(isBackendError({ status: 200 })).toBe(false)
    expect(isBackendError(null)).toBe(false)
    expect(isBackendError(undefined)).toBe(false)
    expect(isBackendError("403")).toBe(false)
    expect(isBackendError({ status: "403" })).toBe(false)
  })
})

describe("errorStatus", () => {
  it("reads the status from an AppError", () => {
    expect(errorStatus(new AppError("nope", 404))).toBe(404)
  })

  it("reads the status off a plain object", () => {
    expect(errorStatus({ status: 401 })).toBe(401)
  })

  it("returns undefined when there is no status", () => {
    expect(errorStatus(new Error("boom"))).toBeUndefined()
    expect(errorStatus(null)).toBeUndefined()
    expect(errorStatus({})).toBeUndefined()
  })
})

describe("AppError", () => {
  it("is an Error carrying message + status", () => {
    const e = new AppError("failed", 422)
    expect(e).toBeInstanceOf(Error)
    expect(e.name).toBe("AppError")
    expect(e.message).toBe("failed")
    expect(e.status).toBe(422)
  })
})
