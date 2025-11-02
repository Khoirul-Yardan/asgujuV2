# AsGuJu Pro — Vercel Ready

This is a demo of **AsGuJu Pro** — an AI legal assistant (Vercel-ready).
It contains a serverless API (`/api/analyze`) that accepts file uploads and a case description,
extracts text (PDF/DOCX/TXT/PNG/JPG), calls Google Gemini (server-side) and returns a structured legal analysis.

## Quick start (local testing)
1. Copy repository locally.
2. Create `.env` from `.env.example` and fill your `GEMINI_API_KEY`.
3. Install dependencies:
   ```
   npm install
   ```
4. Run local dev (requires Vercel CLI):
   ```
   npx vercel dev
   ```
5. Open http://localhost:3000

## Deploy to Vercel
1. Push this project to a GitHub repository.
2. On Vercel dashboard, import the repo.
3. Add Environment Variable `GEMINI_API_KEY` in Project Settings.
4. Deploy — the site will be available at your Vercel domain.

## Notes
- This is a demo. For production, secure API keys, enable HTTPS, consider using cloud OCR for heavy loads,
  and add file encryption / retention policies for sensitive data.
- `.env` must NOT be committed to public repos.
