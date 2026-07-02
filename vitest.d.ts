// Vite/Vitest provides `import.meta.glob` at test time (used by convex-test to
// load Convex modules). Declare it so `tsc` accepts the test files.
interface ImportMeta {
  glob: (pattern: string) => Record<string, () => Promise<Record<string, unknown>>>;
}
