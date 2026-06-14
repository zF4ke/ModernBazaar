import { describe, it, expect } from "vitest"
import { format, formatTime, formatCompact } from "./utils"

describe("format", () => {
  // `format` delegates to Intl.NumberFormat with the runtime locale, so assert on
  // the digits/decimals rather than a specific grouping/decimal separator.
  it("groups integer digits and keeps fixed decimals", () => {
    expect(format(1234567).replace(/\D/g, "")).toBe("1234567")
    expect(format(1234.5, 2).replace(/\D/g, "")).toBe("123450")
  })
  it("returns a dash for nullish / non-finite", () => {
    expect(format(undefined)).toBe("-")
    expect(format(Infinity)).toBe("-")
    expect(format(NaN)).toBe("-")
  })
})

describe("formatTime", () => {
  it("renders minutes, hours and days", () => {
    expect(formatTime(0.5)).toBe("30m")
    expect(formatTime(1.5)).toBe("1.5h")
    expect(formatTime(48)).toBe("2d")
  })
  it("guards against missing/invalid input", () => {
    expect(formatTime(undefined)).toBe("N/A")
    expect(formatTime(0)).toBe("N/A")
    expect(formatTime(Infinity)).toBe("N/A")
  })
})

describe("formatCompact", () => {
  it("abbreviates large magnitudes", () => {
    expect(formatCompact(12_300_000)).toBe("12.3M")
    expect(formatCompact(1_200_000_000)).toBe("1.2B")
    expect(formatCompact(5_400)).toBe("5.4k")
  })
  it("formats small numbers plainly and guards nullish", () => {
    expect(formatCompact(950)).toBe("950")
    expect(formatCompact(undefined)).toBe("-")
  })
})
