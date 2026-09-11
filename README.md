# AI Resume Analyzer & Job Finder

A full-stack app that analyzes a resume against a job description with a
**deterministic** skill-matching pipeline (no hallucinated matches), scores
it against an ATS-style rubric, and searches **real, live jobs** from
multiple job APIs.

## What changed in this revision

| Area | Before | Now |
|---|---|---|
| Skill matching | LLM asked to "guess" matched/missing skills — inconsistent, sometimes wrong | Deterministic extract → normalize → compare pipeline (`server/services/skillsService.js`), with a 80+ entry synonym table (JS↔JavaScript, Node↔Node.js, Mongo↔MongoDB, etc.) |
| ATS score | Single LLM-guessed number | 11-category deterministic breakdown out of 20 each (`server/services/atsService.js`) |
| Suggestions | Generic ("improve your projects") | Grounded in your actual resume text (matched project names, missing skills you don't mention) |
| Job Finder | Hardcoded/templated fake job listings | Real listings from Adzuna, Jooble, RemoteOK, Remotive, Arbeitnow, JSearch (Google Jobs), USAJobs (`server/services/jobsService.js`) — **zero hardcoded jobs** |
| Resume profile extraction | Skills only | Also extracts probable job title(s) and estimated years of experience (`server/services/profileService.js`) and uses them to bias job search queries toward your actual target role, not just raw skills |
| LinkedIn/Indeed/Naukri/Wellfound/Glassdoor | Fake jobs labeled with these platform names | Honest direct "search on X" links only — these platforms don't offer public search APIs to third-party apps |
| Resume Tailoring / Cover Letter | Not present | New endpoints + UI, constrained to never invent experience |
| Security | None | Helmet, CORS allowlist, rate limiting, file-type/size validated uploads |

### Known limitation, stated plainly
LinkedIn, Indeed, Naukri, Wellfound, and Glassdoor **do not provide public
job-search APIs** to third-party applications (LinkedIn's official API
doesn't include public job search; the others require enterprise/partner
agreements or explicitly disallow scraping in their Terms of Service). This
app does not fabricate listings under those names — it gives you a direct,
pre-filled search link to each platform instead, clearly labeled as such.

## Architecture

```
server/
  controllers/     # HTTP-layer glue (validation, calls into services, response shaping)
  services/
    skillsService.js   # deterministic skill extraction/normalization/comparison
    atsService.js       # deterministic ATS category scoring
    aiService.js         # optional LLM narrative layer + resume tailoring + cover letters
    jobsService.js       # live job-source integrations, filtering, sorting, pagination
  routes/           # Express routers
  models/           # Mongoose schemas
  middleware/       # auth middleware
client/
  src/pages/        # route-level pages (Home, JobFinder, Dashboard, ...)
  src/components/   # shared UI (AnalysisResult, UploadDropzone, ...)
  src/services/api.js  # axios wrapper for every backend endpoint
```

## Setup

### 1. Backend
```bash
cd server
npm install
cp .env.example .env   # fill in whichever keys you have — see below
npm run dev
```
No `MONGO_URI`? The server auto-starts an in-memory MongoDB for local dev.

### 2. Frontend
```bash
cd client
npm install
npm run dev
```

### 3. API keys — what you need and where to get it

Everything below is **optional**. Skill matching and ATS scoring work with
**zero** keys. Each key you add unlocks one more feature/job source.

| Variable | Unlocks | Get it at |
|---|---|---|
| `GEMINI_API_KEY` | AI-written summary/strengths wording, Resume Tailoring, Cover Letter generation | https://aistudio.google.com/app/apikey |
| `ADZUNA_APP_ID` + `ADZUNA_APP_KEY` | Adzuna job listings | https://developer.adzuna.com/ |
| `JOOBLE_API_KEY` | Jooble job listings | https://jooble.org/api/about |
| `REMOTIVE_API_KEY` | Remotive job listings | https://remotive.io/api-key (free, email signup) |
| `RAPIDAPI_KEY` | JSearch listings (aggregates Google for Jobs → LinkedIn/Indeed/Glassdoor via a licensed API) | https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch |
| `USAJOBS_API_KEY` + `USAJOBS_USER_AGENT_EMAIL` | U.S. federal job listings | https://developer.usajobs.gov/ |
| `SERPAPI_KEY` | Google Jobs aggregator results | https://serpapi.com/ |
| *(none needed)* | RemoteOK + Arbeitnow listings work out of the box | — |

See `server/.env.example` for the full annotated list.

## Features

- **Resume analysis**: upload a PDF + paste a job description → deterministic
  matched/missing/additional skills, skill match %, ATS breakdown, strengths,
  weaknesses, a short learning path for missing skills, and grounded
  suggestions.
- **Job Finder**: live jobs pulled from every configured source, filterable
  by location, remote-only, posted-within, employment type, and sortable by
  relevance/newest/salary/remote. Every job shows its real source platform
  and an "Apply" button that opens the original listing — never an internal
  redirect.
- **Resume Tailoring**: rewrites wording (summary/experience/skills) to
  target a specific job description without inventing new experience.
- **Cover Letter Generator**: personalized to resume + job description +
  company/role.

## Testing what you built

1. Start both servers as above.
2. Go to the Home/Analyzer page, upload a PDF resume, paste a job
   description containing skills like `React, Redux, Next.js, TypeScript,
   Docker, AWS, Git, REST API`.
3. Confirm Matched/Missing skills match what's actually in your resume text
   (this is now deterministic — re-running the same resume+JD always gives
   the same result).
4. Go to Job Finder — with no job-API keys configured you'll see an
   informational banner and the direct platform search links; add e.g.
   `ADZUNA_APP_ID`/`ADZUNA_APP_KEY` or nothing at all (RemoteOK/Remotive
   need no key) and refresh to see real listings appear.
5. Try "Tailor Resume" and "Cover Letter" from the analysis screen (requires
   `GEMINI_API_KEY`).

## Deployment

- Backend: any Node host (Render, Railway, Fly.io, etc). Set all env vars
  from `.env.example` in your host's dashboard — never commit `.env`.
- Frontend: any static host (Vercel, Netlify, etc). Set `VITE_API_URL` to
  your deployed backend's `/api` URL.
- Set `CORS_ORIGINS` on the backend to your deployed frontend URL(s) once
  you're out of local development.

## Not yet implemented (roadmap)

- Infinite-scroll job list (currently paginated with page/pageSize params
  already supported server-side — wiring up scroll-triggered fetch is the
  remaining piece)
- Response caching layer for job searches
- Full input-sanitization middleware beyond upload validation
- Dark-mode visual polish pass across all pages
- Formal test suite

Contributions/continuation welcome — the service boundaries above
(`skillsService`, `atsService`, `jobsService`, `aiService`) were split out
specifically to make picking up any of these independently straightforward.
