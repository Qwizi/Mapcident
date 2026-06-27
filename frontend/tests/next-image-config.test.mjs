import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import nextConfig from "../next.config.ts"

test("allows media images served through the local Caddy proxy", () => {
  const patterns = nextConfig.images?.remotePatterns ?? []

  assert.ok(
    patterns.some(
      (pattern) =>
        pattern.protocol === "http" &&
        pattern.hostname === "localhost" &&
        pattern.port === "8088" &&
        pattern.pathname === "/media/**",
    ),
  )
})

test("allows the image optimizer to fetch local development media URLs", () => {
  assert.equal(nextConfig.images?.dangerouslyAllowLocalIP, true)
})

test("points the dev media URL at the Compose-internal backend host", () => {
  const compose = readFileSync(new URL("../../compose.yml", import.meta.url), "utf8")

  assert.match(compose, /NEXT_PUBLIC_MEDIA_URL:\s+http:\/\/backend:8000\b/)
})
