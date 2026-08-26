# Stateproof — Product Requirements Document

| Field | Value |
|---|---|
| Product | **Stateproof** |
| Document owner | Manus AI |
| Status | Planning complete; implementation not started |
| Version | 1.0 |
| Date | August 23, 2026 |
| Primary release | Local-first CLI plus interactive companion for React/Vite and Next.js |
| Product category | Frontend runtime validation and proof utility |

## 1. Product summary

Stateproof is a **frontend-focused runtime validation utility** for developers and AI-assisted builders. It helps them deliberately exercise the user-interface states most often missed by happy-path development: **loading, empty, error, offline, and mobile viewport** states.

The product does not generate code, replace a test framework, or promise that a page is bug-free. It controls a selected local network response, opens the real route in a controlled browser, verifies a visible UI state, captures a screenshot, and generates a compact **Stateproof Card** that can be used in a pull request.

> **Product promise:** Let agents build fast. Prove the UI survives real states.

The tool is deliberately narrow. A developer can run an app, choose a route and request, select a state, inspect the real result, and capture proof in minutes. This creates an experience closer to a practical checklist for a running UI than to a broad testing dashboard.

## 2. Problem statement

Frontend work frequently succeeds on the happy path while failing to account for slow requests, missing data, failed requests, offline conditions, and narrow screens. A developer discussion on r/webdev describes developers using temporary code changes, DevTools throttling, network response overrides, manually thrown errors, mock services, component tests, or local proxies to test these cases. [1]

Existing tools are capable but do not remove this friction by default. Playwright can mock or modify network traffic and capture screenshots; Storybook can render component states and run interactions; Chromatic can run cloud visual testing around Storybook. [2] [3] [4] Each requires a developer to configure, author, and maintain test-level or story-level constructs. Stateproof is the missing workflow layer for one repeated job: **“Show me the real screen in the non-happy-path state, then record that I checked it.”**

AI-assisted development increases the importance of this task. Research and practitioner reporting indicate that AI can accelerate throughput while creating greater review, validation, and decision pressure later in delivery. [5] [6] The product is designed to be a deterministic runtime guardrail that coding agents can invoke, not another agent that produces a second opinion.

## 3. Goals and non-goals

### 3.1 Goals

| ID | Goal | Release-1 success condition |
|---|---|---|
| G-01 | Make non-happy-path UI inspection fast. | A developer can run a saved scenario and inspect a resulting screen in fewer than three interactions after initial setup. |
| G-02 | Make state verification repeatable. | A scenario is stored as a readable repository file and produces equivalent request overrides when rerun. |
| G-03 | Create reviewable evidence. | Each run produces screenshots and a concise Markdown/JSON Stateproof Card. |
| G-04 | Stay compatible with agent-first workflows. | A CLI command returns a non-zero status and structured result when a scenario fails. |
| G-05 | Default to privacy. | Normal local runs do not transmit application responses, screenshots, or source code to a backend. |
| G-06 | Keep the core useful without account setup. | A user can install, configure, run, and export a local proof without authentication. |

### 3.2 Non-goals

| ID | Explicit non-goal | Reason |
|---|---|---|
| NG-01 | Replace end-to-end test suites. | Stateproof validates named states; it does not model every business flow or interaction. |
| NG-02 | Replace Storybook, Playwright, MSW, or Chromatic. | It sits on top of complementary primitives and workflows. |
| NG-03 | Offer generic AI code review or code generation. | This would duplicate mature agent capabilities and weaken the focused value proposition. |
| NG-04 | Diagnose all accessibility, security, performance, or product issues. | The MVP must remain a small UI-state proof utility. |
| NG-05 | Host arbitrary customer applications or secrets in the MVP. | Cloud browser execution introduces cost, risk, and operational complexity too early. |
| NG-06 | Support every framework and response shape in release 1. | First support must be stable and demoable: React/Vite and Next.js with standard fetch/XHR flows. |

## 4. Target users

### 4.1 Primary persona: AI-assisted frontend builder

This user works alone or in a small team and uses Cursor, Claude Code, Codex, Copilot, v0, Lovable, Bolt, or similar tools to create UI quickly. They can make a screen look correct with normal data but do not consistently author or maintain test fixtures. They need a visual, guided way to check that the screen survives common API states.

### 4.2 Secondary persona: product-minded frontend developer

This user maintains a React or Next.js application. They already understand DevTools, MSW, Storybook, or Playwright but want a lower-friction, repeatable artifact for routine state checks and pull-request handoffs.

### 4.3 Tertiary persona: reviewer or engineering lead

This user does not create every scenario. They need evidence that a contributor deliberately checked loading, empty, error, and mobile states for a changed screen. They value a small proof card more than a verbose test dashboard.

## 5. Jobs to be done

| User | Job | Desired outcome |
|---|---|---|
| AI-assisted builder | “When an agent finishes a screen, help me see what normal development data hides.” | The user finds broken empty/error/loading states before shipping. |
| Frontend developer | “When I touch a data-dependent screen, let me replay known states without temporary code edits.” | A versioned scenario can be rerun locally or in CI. |
| Reviewer | “When a UI pull request arrives, show me which meaningful states were checked.” | Review starts from evidence, not assumptions. |
| Coding agent | “Before I say a frontend task is done, tell me whether the required runtime states actually render.” | The agent receives deterministic failure information and can iterate. |

## 6. Product scope and first-release experience

### 6.1 Product surfaces

| Surface | Release | Purpose |
|---|---:|---|
| Node CLI | R1 | Execute saved scenarios, capture screenshots, generate a card, and provide an agent-friendly exit code. |
| Local companion panel | R1.1 | Let a developer observe requests and create a scenario without hand-writing JSON. |
| Scenario file | R1 | Make the selected request, forced response, viewport, and expected UI state durable and reviewable. |
| HTML/Markdown/JSON report | R1 | Give an individual, an agent, or a reviewer usable evidence. |
| GitHub Action | R2 | Run project scenarios on pull requests and publish a Stateproof Card. |
| VS Code extension | R3 | Create and launch scenarios from the active route or file. |
| Optional cloud sync | R4 | Support account-backed sharing and artifact retention only after local value is proven. |

### 6.2 The golden path

```text
Developer starts local app
          ↓
Developer runs Stateproof against /account/settings
          ↓
Stateproof intercepts GET /api/account with a named state
          ↓
Browser waits for the expected UI selector at desktop and mobile viewport
          ↓
Stateproof saves screenshots, result data, and Stateproof Card
          ↓
Developer fixes any failed scenario or attaches proof to a pull request
```

### 6.3 Example Stateproof Card

```markdown
# Stateproof Card — Account settings

✅ Loading — `GET /api/account` delayed 3 seconds
✅ Empty — response fixture `account-empty.json`
✅ Error — response status `500`
⚠️ Mobile Error — expected retry control was not visible at 390 px

Artifacts
- loading-desktop.png
- empty-mobile.png
- error-desktop.png
- error-mobile.png

Run: local · 2026-08-23T14:02:15Z · Stateproof 0.1.0
```

## 7. User flows

### 7.1 Flow A: first-time vibe coder

1. The user installs Stateproof and starts their app in development mode.
2. The user opens the local Stateproof companion and selects an existing route.
3. The companion observes relevant `fetch` or XHR requests made by that route.
4. The user selects one request and clicks a simple state button: **Loading**, **Empty**, **Error**, or **Offline**.
5. Stateproof replays the route with the local controlled condition.
6. The user reviews the actual UI and captures a screenshot if the state is acceptable.
7. The companion saves a scenario draft and allows export of the Stateproof Card.

### 7.2 Flow B: experienced developer running saved scenarios

1. The developer creates or reviews `stateproof.scenarios.json` in the repository.
2. The developer runs `npx stateproof run account-settings`.
3. The CLI starts or connects to the configured local application URL.
4. The runner applies each interception rule, waits for the expected selector, and captures a screenshot at every configured viewport.
5. The command exits successfully only when all expectations pass.
6. The developer opens `artifacts/stateproof/account-settings/index.html` or exports the Stateproof Card to a pull request.

### 7.3 Flow C: coding agent verification loop

1. The developer prompts an agent to build a frontend feature and explicitly requests a Stateproof run.
2. The agent implements the feature, runs the configured scenario command, and reads structured results.
3. If a selector is missing or the screenshot capture fails, the agent fixes the UI and reruns the scenario.
4. The agent includes the successful Stateproof Card in its final summary or pull request.

### 7.4 Flow D: pull-request evidence through GitHub Actions

1. A contributor pushes a scenario file and UI change.
2. The Stateproof GitHub Action runs relevant configured scenarios in headless mode.
3. The action uploads screenshots and report files as artifacts.
4. It writes a pull-request summary showing passes, failures, and links to artifacts.
5. The reviewer uses the card to decide which screenshots require deeper inspection.

## 8. Functional requirements

### 8.1 Scenario authoring

| ID | Requirement | Priority | Acceptance criteria |
|---|---|---:|---|
| FR-01 | The system shall define scenarios in a versioned JSON file. | Must | A file can describe a route, one or more viewports, a request matcher, controlled response, and expected selector. |
| FR-02 | The CLI shall validate scenario files before running them. | Must | Invalid JSON, missing route, invalid response mode, or malformed glob returns a clear file/line-oriented error. |
| FR-03 | The local companion shall create a scenario draft from an observed request. | Should | A user can choose a request and save a valid scenario without editing JSON. |
| FR-04 | The scenario schema shall support comments through an adjacent documentation field. | Should | Each scenario can include a `note` explaining its product purpose. |

### 8.2 Request and state simulation

| ID | Requirement | Priority | Acceptance criteria |
|---|---|---:|---|
| FR-05 | The runner shall match a request by HTTP method and URL pattern. | Must | A scenario can target `GET **/api/account`. |
| FR-06 | The runner shall simulate a delayed response. | Must | The selected request is delayed for a configured number of milliseconds before normal or fixture fulfillment. |
| FR-07 | The runner shall simulate an empty response. | Must | A scenario can return JSON from an inline value or fixture file. |
| FR-08 | The runner shall simulate a chosen HTTP error response. | Must | A scenario can return a configured status, headers, and JSON/text body. |
| FR-09 | The runner shall simulate browser offline mode. | Must | A scenario can disable the controlled browser context’s network connection. |
| FR-10 | The runner shall never modify the production application or production API. | Must | All interception occurs in the local or CI browser context. |

### 8.3 Validation and evidence

| ID | Requirement | Priority | Acceptance criteria |
|---|---|---:|---|
| FR-11 | The runner shall wait for an expected selector. | Must | A scenario fails with a clear message and screenshot if the selector is absent before timeout. |
| FR-12 | The runner shall support desktop and mobile viewport capture. | Must | A scenario can run at 390 px and 1440 px widths. |
| FR-13 | The runner shall save a screenshot for every scenario/viewport combination. | Must | Stable semantic filenames are created under the configured artifact directory. |
| FR-14 | The runner shall generate Markdown and JSON Stateproof Cards. | Must | Both exports include scenario status, viewport, request rule, timestamps, and artifact references. |
| FR-15 | The runner shall produce a browsable local HTML report. | Should | The report displays a state matrix and screenshot gallery without an internet connection. |
| FR-16 | The system shall support a baseline screenshot comparison mode. | Later | A scenario can optionally compare its capture against a committed baseline with configurable tolerance. |

### 8.4 CLI and agent integration

| ID | Requirement | Priority | Acceptance criteria |
|---|---|---:|---|
| FR-17 | The CLI shall expose `init`, `run`, `list`, and `export` commands. | Must | Each command has documented help and deterministic exit codes. |
| FR-18 | The CLI shall support a machine-readable output mode. | Must | `--reporter json` returns structured scenario statuses suitable for an agent. |
| FR-19 | The CLI shall exit non-zero on any failed required scenario. | Must | A failed selector, browser error, or asset capture failure makes CI fail. |
| FR-20 | A future MCP server shall expose `stateproof_run` and `stateproof_list`. | Later | The MCP tool calls the CLI core and returns structured reports without arbitrary shell access. |

### 8.5 Collaboration and GitHub integration

| ID | Requirement | Priority | Acceptance criteria |
|---|---|---:|---|
| FR-21 | The GitHub Action shall run selected scenarios in CI. | R2 | A workflow action accepts `base-url`, `scenario`, and artifact options. |
| FR-22 | The Action shall upload artifact files. | R2 | Screenshots, HTML report, JSON, and Markdown can be downloaded from the workflow. |
| FR-23 | The Action shall create a concise pull-request summary. | R2 | Summary includes passed/failed state count and links to artifacts. |
| FR-24 | GitHub App installation shall be optional and deferred. | Later | Users can get PR value through the Action without authorizing a hosted App. |

## 9. Non-functional requirements

| Category | Requirement |
|---|---|
| Performance | A single local scenario should begin executing within 10 seconds after the target app is reachable. The default timeout should be 15 seconds per scenario and configurable. |
| Reliability | Scenario results must include the Stateproof version, browser version, timestamp, viewport, and route for reproducibility. |
| Accessibility | Companion UI and HTML reports must be keyboard navigable, use visible focus states, expose text labels for color status, and maintain WCAG AA contrast. |
| Portability | R1 supports macOS, Linux, and Windows through Node.js and Playwright-supported browsers. |
| Offline use | Core execution and local reports must function without backend access. |
| Observability | Local debug logs must record request matching, response fulfillment, browser navigation, selector waits, and capture failures without storing full response bodies by default. |
| Maintainability | The scenario schema, core runner, reporters, CLI, and any GUI must be separate packages with stable interfaces. |

## 10. Scenario data model

```json
{
  "$schema": "https://stateproof.dev/schema/v1.json",
  "name": "account-settings",
  "baseUrl": "http://localhost:3000",
  "route": "/account/settings",
  "viewports": [
    { "name": "mobile", "width": 390, "height": 844 },
    { "name": "desktop", "width": 1440, "height": 1024 }
  ],
  "scenarios": [
    {
      "id": "account-loading",
      "label": "Account details loading",
      "note": "Ensure the settings form does not jump while account data is pending.",
      "request": { "method": "GET", "urlPattern": "**/api/account" },
      "response": { "mode": "delay", "milliseconds": 3000 },
      "expect": { "visible": "[data-state='loading']" }
    },
    {
      "id": "account-empty",
      "label": "No account returned",
      "request": { "method": "GET", "urlPattern": "**/api/account" },
      "response": { "mode": "fixture", "path": "fixtures/account-empty.json", "status": 200 },
      "expect": { "visible": "[data-state='empty']" }
    },
    {
      "id": "account-error",
      "label": "Account API failure",
      "request": { "method": "GET", "urlPattern": "**/api/account" },
      "response": { "mode": "error", "status": 500, "body": { "message": "Temporary error" } },
      "expect": { "visible": "[data-state='error']" }
    }
  ]
}
```

## 11. Technical architecture

### 11.1 Core principle

The **runtime execution stays local or inside the repository’s own CI**. The optional hosted layer stores only user-approved metadata and artifacts. Browser automation must not run inside a small request-driven function because browser runtime work is costlier, slower, and less private than executing against the local/CI application.

```mermaid
flowchart LR
  Dev[Developer or agent] --> CLI[Stateproof CLI]
  CLI --> Core[@stateproof/core]
  Core --> Scenario[Scenario file + fixtures]
  CLI --> PW[Playwright adapter]
  PW --> App[Local app or CI preview app]
  PW --> Artifacts[Screenshots + result JSON]
  Artifacts --> Card[HTML + Markdown Stateproof Card]
  Card --> PR[Optional GitHub Action PR summary]
  Card -. opt-in sync .-> API[Hosted API]
  API --> DB[(Metadata database)]
  API --> Object[(Artifact storage)]
```

### 11.2 Packages

| Package | Responsibility |
|---|---|
| `@stateproof/core` | Scenario validation, result model, request matching abstraction, Stateproof Card renderer. |
| `@stateproof/playwright` | Browser lifecycle, route interception, offline mode, viewport runs, selector checks, screenshot capture. |
| `@stateproof/cli` | Commands, config discovery, output formatting, Node process lifecycle. |
| `@stateproof/reporter-html` | Standalone local report with state matrix and artifact gallery. |
| `@stateproof/github-action` | CI wrapper, artifact upload, pull-request summary. |
| `@stateproof/extension` | Later browser or VS Code companion for observing requests and authoring scenarios. |
| `apps/stateproof-web` | Marketing, docs, and optional authenticated artifact viewer. |

### 11.3 Technology choices

| Concern | Choice | Rationale |
|---|---|---|
| Language | TypeScript | Matches frontend targets and enables shared types across CLI, extension, Action, and web UI. |
| Runtime test engine | Playwright | Supports network interception, controlled browser contexts, screenshots, traces, and viewport configuration. [2] [3] |
| Package manager | pnpm workspace | Supports a portfolio-quality monorepo while keeping packages separated. |
| CLI framework | Commander or Clipanion | Offers typed commands, validation, help, and stable exit behavior. |
| Schema validation | Zod plus generated JSON Schema | Supports safe config parsing and helpful errors. |
| Reporting | Static HTML plus Markdown/JSON | Keeps reports portable, reviewable, and backend-independent. |
| GitHub CI | JavaScript Action | Runs in the user’s repository and can publish workflow artifacts. |

## 12. Privacy and security

| Threat or concern | Requirement and mitigation |
|---|---|
| Private API responses | Local execution by default. Do not upload response bodies, request headers, cookies, or source code. |
| Sensitive screenshot content | Store screenshots locally by default; make sync explicitly opt-in; support redaction selectors and an artifact blocklist. |
| Accidental production traffic | Require an explicit `baseUrl`; warn when a non-loopback URL is used; block production-like URLs unless `--allow-remote` is passed. |
| Fixture secrets | Add `.stateproofignore` and warn when likely key, token, or credential patterns appear in inline fixtures. |
| GitHub webhook spoofing | When a GitHub App is introduced, verify webhook signatures using a high-entropy secret as GitHub recommends. [10] |
| Excess permissions | Prefer a GitHub Action first. If an App is added, request minimum repository contents/PR permissions and add commenting only after explicit user consent. |
| Agent overreach | MCP tools expose named scenario execution only; they must not provide arbitrary request interception or unrestricted shell execution. |

## 13. Free-tier infrastructure and scale plan

### 13.1 MVP: fully local

The first useful product has **no backend**. The CLI runs against `localhost`; screenshots and reports live under an ignored `artifacts/stateproof/` folder; scenario files live in Git. This satisfies privacy, avoids cloud-browser cost, and makes the portfolio project useful immediately.

### 13.2 Optional hosted layer

| Capability | Recommended starting service | Reason |
|---|---|---|
| Product site, OAuth callback, lightweight API | Cloudflare Pages plus Workers | The Free plan includes 100,000 Worker requests per day but limits CPU to 10 ms per invocation; use it for lightweight API and callbacks, not browser execution. [7] |
| Metadata | Cloudflare D1 | Useful for user/project/scenario/receipt metadata; available on the free Workers plan with daily read/write allowances. [7] |
| Opt-in screenshots | Cloudflare R2 | Free tier includes 10 GB-month storage, 1 million Class A operations, and 10 million Class B operations per month. [8] |
| All-in-one alternative | Supabase | The Free plan includes Auth, 50,000 MAUs, 500 MB database, and 1 GB file storage, but inactive projects can pause after one week. [9] |

### 13.3 Scale transition

| Trigger | Change |
|---|---|
| Teams want PR summaries | Publish a GitHub Action; run browsers inside repository CI. |
| Teams want hosted screenshot review | Add R2 signed uploads, retention policies, and an opt-in web viewer. |
| Teams want organization-wide scenario rules | Add authenticated projects, role-based settings, and versioned policy templates. |
| Users request fully hosted browser runs | Offer a paid isolated browser runner only after demand validates the cost and security model. |

## 14. Success metrics

Metrics are not product claims; they are signals to decide whether the workflow is truly useful.

| Category | Metric | Initial target |
|---|---|---:|
| Activation | Share of installers who complete one successful local scenario run | 40% within first session |
| Time to value | Median time from `init` to first Stateproof Card | Under 10 minutes |
| Repeat use | Projects with a second scenario run within 14 days | 25% |
| Coverage behavior | Average captured named states per active route | At least 2.5 |
| Reliability | Scenario-run completion rate excluding user assertion failures | At least 95% |
| Agent utility | Agent-run scenarios that produce an actionable failure/fix loop | Qualitative early interviews; then instrumented opt-in metric |
| Review utility | Pull requests containing a Stateproof Card with an artifact view | Track after GitHub Action release |

## 15. Rollout milestones

| Milestone | Scope | Exit criteria |
|---|---|---|
| M0 — Product demo | A polished interactive web demo showing four UI states and a proof card. | Five developers can explain the value after a short demo. |
| M1 — CLI core | `init`, schema validation, one delay scenario, one selector assertion, one screenshot. | Runs reliably on a sample React/Vite app. |
| M2 — State matrix | Fixture/empty/error/offline modes, mobile viewport, Markdown/JSON/HTML reporting. | Four scenarios run deterministically in a sample project. |
| M3 — Developer experience | Helpful errors, scenario templates, redaction rules, local companion proof-of-concept. | A developer can create a basic scenario without manually writing all config. |
| M4 — GitHub Action | Artifact upload and PR summary. | A sample repository posts state evidence from CI. |
| M5 — Agent bridge | Narrow MCP server and agent documentation. | An agent can run a named scenario, read failure output, and iterate. |
| M6 — Optional cloud sync | Sign-in, opt-in artifact upload, share links, retention settings. | Private artifacts are encrypted in transit, access-controlled, and deleted on policy. |

## 16. Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| The utility duplicates existing Playwright/MSW practice. | Adoption may be low among mature teams. | Target teams and vibe coders who need scenario authoring and proof cards, not testing experts who already have complete frameworks. |
| Every app’s “empty” data shape differs. | Automation could make wrong assumptions. | Use user-selected fixture files and label empty responses as explicit scenario input, not inferred truth. |
| Network interception fails for WebSockets, GraphQL, service workers, or unusual clients. | Some apps cannot use R1. | Scope R1 to fetch/XHR REST-like requests; document unsupported patterns and add adapters later. |
| Visual proof is mistaken for full correctness. | Users may over-trust screenshots. | Use precise language: “captured” and “assertion passed,” never “fully tested” or “bug-free.” |
| Screenshots contain private data. | Security risk. | Local default, redaction options, opt-in sync, short retention, and warnings. |
| Test setup feels too hard. | The simple-tool thesis breaks. | Use request observation and generated templates in the companion; keep first CLI config under 30 lines. |
| AI agents still bypass the tool. | Product may not become part of agent workflow. | Provide deterministic CLI output and concise agent instructions; introduce MCP only after CLI value is proven. |

## 17. Open decisions

| Decision | Options | Recommendation for implementation start |
|---|---|---|
| Primary authoring surface | Browser extension, Vite plugin, VS Code extension, CLI-only | Start CLI plus static scenario template. Prototype the companion UI after M2. |
| First framework support | React/Vite, Next.js, Vue | Start React/Vite; add Next.js after route/server rendering behavior is verified. |
| Default `empty` response | `null`, `[]`, empty object, fixture only | Require a fixture or explicit inline response; do not guess. |
| Browser binary | Bundled Playwright Chromium, installed browser connection | Bundle Playwright Chromium for deterministic M1; support `--browser-channel` later. |
| Visual-diff scope | No baseline, local baseline, hosted baseline | Start screenshot capture and selector assertion; defer comparison to M2/M3. |
| Branding relation to RepoLens | Full rename, Stateproof by RepoLens, separate project | Use **Stateproof** as the product. Credit it as a new project in the portfolio; retain RepoLens design motifs only where useful. |

## 18. Definition of done for version 0.1

Stateproof 0.1 is complete when a developer can clone a sample React/Vite project, install the CLI, run three named scenarios against one route, receive desktop and mobile screenshots, see at least one selector failure, fix the sample UI, rerun successfully, and paste a Markdown Stateproof Card into a pull request description. The complete flow must work locally without an account, a backend, or manually modified fetch code.

## References

[1]: [r/webdev — Frontend devs, how do you handle Loading and Error states when the real API is too fast/stable?](https://www.reddit.com/r/webdev/comments/1q45fgs/frontend_devs_how_do_you_handle_loading_and_error/).

[2]: [Playwright — Network mocking](https://playwright.dev/docs/network).

[3]: [Playwright — Visual comparisons](https://playwright.dev/docs/test-snapshots).

[4]: [Storybook — Interaction tests](https://storybook.js.org/docs/writing-tests/interaction-testing) and [Chromatic — Visual testing for Storybook](https://www.chromatic.com/storybook).

[5]: [DORA 2025: Year in review](https://dora.dev/insights/dora-2025-year-in-review/).

[6]: [Stack Overflow — Coding agents are giving everyone decision fatigue](https://stackoverflow.blog/2026/05/21/coding-agents-are-giving-everyone-decision-fatigue/).

[7]: [Cloudflare Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/).

[8]: [Cloudflare R2 pricing](https://developers.cloudflare.com/r2/pricing/).

[9]: [Supabase pricing](https://supabase.com/pricing).

[10]: [GitHub Docs — Using webhooks with GitHub Apps](https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/using-webhooks-with-github-apps).
