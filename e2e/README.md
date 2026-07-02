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

Two workflows:

- **`e2e.yml`** — runs the read-only suite against each successful Vercel
  **preview** deploy (`deployment_status` trigger). Note: this only fires if
  preview deploys actually build (see Convex preview deploy keys).
- **`e2e-staging.yml`** — self-contained: builds + runs the app in the runner
  against the **dev** Convex deployment, seeds data, and runs the FULL suite
  (including mutating specs). No Vercel involved. Requires one repo secret
  `CONVEX_DEPLOY_KEY` = a **dev** deploy key
  (Convex dashboard → Project → Settings → Deploy Keys → Development).
