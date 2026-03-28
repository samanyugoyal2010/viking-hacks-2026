# FuelScan

Mobile-first **Next.js 16** hackathon app: snap a meal photo for **estimated** macros (via a **server-only** LLM key) and align with a simple **Mifflin–St Jeor** nutrition plan. Meal logs and profile stay in **localStorage** on the device.

## Setup

```bash
npm install
cp .env.example .env.local
```

Set **either**:

- **`OPENAI_API_KEY`** — from [OpenAI API keys](https://platform.openai.com/api-keys), or  
- **`OPENROUTER_API_KEY`** — from [OpenRouter](https://openrouter.ai/keys) (OpenAI-compatible; default model `nvidia/nemotron-nano-12b-v2-vl:free`, override with `OPENROUTER_MODEL`).

If both are set, **OpenRouter is used first**. Never commit real keys.

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). On a phone, use the same host (e.g. tunnel or LAN IP) and test **Safari** camera permissions.

## Deploy (Vercel)

1. Push the repo to GitHub and import the project in [Vercel](https://vercel.com/new).
2. In **Project → Settings → Environment Variables**, add `OPENAI_API_KEY` and/or `OPENROUTER_API_KEY` (plus optional `OPENROUTER_MODEL`, `OPENROUTER_HTTP_REFERER` for Production).
3. Deploy. The Route Handler at `/api/analyze-meal` runs on the server, so the key is not exposed to the browser.

## 60-second demo script

1. **Home** — “API keys live only on the server; logs stay on your phone.”
2. **Log meal** — Take a photo → **Estimate** → show editable fields → **Save** (trust / validation).
3. **Plan** — Enter stats → show **TDEE** and **daily target** → **Today vs plan** updates from the log.
4. Close with the **medical disclaimer**: estimates only, not advice.

## Scripts

```bash
npm run dev    # development
npm run build  # production build
npm run start  # run production server locally
npm run lint
```
