import { defineConfig } from 'vitest/config'

// unit : sans réseau, sur les fixtures enregistrées de la boutique de démo.
// live : la vraie boutique de démo, branchée par connexion.demo.json.
export default defineConfig({
  test: {
    projects: [
      { test: { name: 'unit', include: ['src/**/*.test.{ts,tsx}', 'test/unit/**/*.test.{ts,tsx}'] } },
      { test: { name: 'live', include: ['test/live/**/*.test.ts'], testTimeout: 30_000 } },
    ],
  },
})
