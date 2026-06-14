import { describe, it, expect } from "vitest"
import { buildQueryParams } from "./api"

describe("buildQueryParams", () => {
  it("serializes defined values", () => {
    const qs = buildQueryParams({ q: "wheat", budget: 1000000, roi: 2 }).toString()
    expect(qs).toContain("q=wheat")
    expect(qs).toContain("budget=1000000")
    expect(qs).toContain("roi=2")
  })

  it("omits undefined, null and empty-string values", () => {
    const params = buildQueryParams({ q: "", budget: undefined, roi: null as any, sort: "score" })
    expect(params.has("q")).toBe(false)
    expect(params.has("budget")).toBe(false)
    expect(params.has("roi")).toBe(false)
    expect(params.get("sort")).toBe("score")
  })

  it("keeps falsy-but-meaningful zero", () => {
    const params = buildQueryParams({ page: 0 })
    expect(params.get("page")).toBe("0")
  })
})
