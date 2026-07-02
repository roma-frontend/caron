# E2E tests (Playwright)

Two ways to run the end-to-end suite.

## 1. Against a deployed site (read-only)

```bash
npm run e2e                       # defaults to https://www.caron.group
E2E_BASE_URL=https://<preview>.vercel.app npm run e2e
```

Runs the read-only specs (catalog→checkout funnel, login validation). Mutating
specs are skipped unless credentials are provided.

## 2. Staging with mutating flows (local app + dev Convex)

```bash
npm run e2e:staging               # seeds dev Convex, boots `next dev`, runs all specs
```

Seeds throw-away accounts + a returnable order via `convex run e2e:seed`
(guarded to the dev deployment only), then exercises the customer return and
admin mark-paid flows.

## CI

`.github/workflows/e2e.yml` runs the read-only suite against each successful
Vercel **preview** deploy (`deployment_status` trigger). If preview deploys are
protected, set the repo secret `VERCEL_AUTOMATION_BYPASS_SECRET`
(Vercel → Project → Settings → Deployment Protection → Protection Bypass for
Automation).
