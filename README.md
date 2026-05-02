# Council

> A local-first, bring-your-own-key workspace where multiple frontier LLMs deliberate on a question across rounds, then a chosen arbiter drafts the synthesis.

Council is a single-user app you run on your own machine. You pose a question, two or more frontier models (Claude, GPT, Gemini, Grok) respond in parallel, then keep responding to each other across rounds. At the end, a chosen "arbiter" model produces a written synthesis: the points of consensus, the points of dissent (with for/against attribution), and the key insights.

It is meant for thinking, not chatting. Long-form deliberation about hard questions, executed with the model of a parliamentary chamber rather than a chat thread.

## What you get

- **Multi-LLM panel** — Claude, GPT, Gemini, Grok deliberate side-by-side
- **Rounds** — 1–5 rounds; each round, every model sees every other model's previous response
- **Arbiter synthesis** — pick one model (or randomize) to draft the final report
- **Live streaming** — every pane streams in parallel; focus mode (`1–4`), sync scroll (`S`), per-round history
- **Local SQLite** — every session is saved on disk; navigate back anytime via the sessions rail
- **Document attachments** — drop in `.txt / .md / .pdf / .docx / .csv` for the council to read
- **Bring your own keys** — no accounts, no telemetry, no servers in the middle. Your keys, your machine, your data.

## Requirements

- Node.js 20+ (for `next` and `better-sqlite3`)
- An API key for at least **two** of: Anthropic, OpenAI, Google AI Studio, xAI

## Install

```bash
git clone <your-fork-url> council
cd council
npm install
cp .env.example .env.local
```

Then open `.env.local` and add API keys for the providers you want to use. You only need two:

```env
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
GOOGLE_GENERATIVE_AI_API_KEY=...
XAI_API_KEY=xai-...
```

Where to get keys:

| Provider | Console |
|---|---|
| Anthropic | https://console.anthropic.com/settings/keys |
| OpenAI | https://platform.openai.com/api-keys |
| Google AI Studio | https://aistudio.google.com/apikey |
| xAI | https://console.x.ai |

Council degrades gracefully — providers without keys appear disabled with a *missing API key* tag in the UI.

## Run

```bash
npm run dev
```

Then open http://localhost:3333.

The SQLite schema is created automatically on first run (no migration step). Sessions are written to `./council.db`. Uploaded documents are written to `./uploads/`.

## Usage

1. **Create** — write a question, pick at least two members, set rounds (1–5), choose an arbiter (or leave random), drop attachments if any. Click *Convene Council*.
2. **Deliberate** — click *Begin*. Each pane streams in parallel. While streaming:
   - `1` `2` `3` `4` — focus a single pane (other panes shrink to a sidebar)
   - `Esc` — exit focus
   - `S` — toggle synchronized scrolling across panes
   - Click any past round (`R1` `R2` …) to scrub through history
3. **Synthesize** — when the last round finishes, the arbiter drafts a synthesis. The bottom drawer auto-opens with the streaming summary, then the full *Proceedings*: consensus points, dissent points (with for/against tags), numbered insights.

## Models

Out of the box Council points each provider at one default model:

| Seat | Provider | Model |
|---|---|---|
| I | Anthropic | Claude Opus 4.6 |
| II | OpenAI | GPT-5.4 |
| III | Google | Gemini 3.1 Pro |
| IV | xAI | Grok 4.1 Fast |

To change a default, edit `src/lib/providers/config.ts`. Anything supported by the [Vercel AI SDK](https://ai-sdk.dev) for that provider will work — just update the `modelId` string.

## Project layout

```
src/
  app/                  Next.js App Router pages + API routes
    api/session/        REST + SSE endpoints
    session/[id]/       The live workspace page
  components/
    deliberation/       Workspace, response cards, round nav
    session/            Create-session form, file upload
    synthesis/          The drawer + proceedings view
    shared/             SeatMark, ArbiterSeal, TopBar, SessionsRail, …
  lib/
    db/                 Drizzle ORM schema + boot-time table creation
    files/              Upload + text extraction (pdf / docx / etc.)
    orchestrator/       Round runner, prompt builder, consensus detector
    providers/          Provider registry, default config, env-availability
    synthesis/          Arbiter prompt + structured-output synthesizer
```

## Cost

You are using your own API keys. A four-provider, three-round deliberation on a hard question typically costs **\$0.10–\$0.50** depending on which models you've picked and how long they reply. Council shows token counts and latency in each pane footer so you can see what every round cost.

## Safety / scope notes

Council is designed for **single-user local use**. There is no auth, no rate limit, no per-session ownership. Do not expose this to the open internet without adding those things first.

Markdown rendering of model output is XSS-hardened (HTML attribute injection blocked, link schemes allowlisted, protocol-relative URLs rejected) — but you should still treat hosted-LLM output as untrusted content and not paste arbitrary tools or credentials into Council prompts.

## Contributing

Issues and PRs welcome. Things that need work:

- Editable provider/model config in the UI (no need to edit `config.ts`)
- Export proceedings to PDF / markdown
- Optional dark theme polish (the design system supports it; just needs review)
- Drizzle migrations folder, in case the inline schema gets unwieldy
- Bigger model rosters (OpenRouter passthrough, local Ollama, etc.)

## License

[MIT](./LICENSE)
