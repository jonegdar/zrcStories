# ZRC Stories Facebook Extractor API

FastAPI service used by the ZRC Stories admin Article Maker to import public Facebook post content into a draft.

## Local Run

```bash
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Set the Apify token before using `/import`:

```bash
APIFY_API_TOKEN=your-apify-token
APIFY_ACTOR_ID=apify~facebook-posts-scraper
```

See `.env.example` for the complete environment variable configuration.

`APIFY_ACTOR_ID` is optional unless you want to override the default. If you set it on Render, use `apify~facebook-posts-scraper` or `apify/facebook-posts-scraper`; stale actor names will return `record-not-found`.

Set this environment variable when the frontend is hosted somewhere other than local Vite:

```bash
ALLOWED_ORIGINS=http://localhost:5173,https://your-vercel-domain.vercel.app
```

## API

```http
GET /health
```

```http
POST /import
Content-Type: application/json

{ "url": "https://www.facebook.com/..." }
```

Response:

```json
{
  "id": 1,
  "caption": "Post text",
  "media": [
    { "type": "image", "src": "https://...", "caption": "" }
  ],
  "sourceUrl": "https://www.facebook.com/..."
}
```

## Railway

Deploy this `fb_downloader` folder as a Docker service. Set:

```bash
APIFY_API_TOKEN=your-apify-token
APIFY_ACTOR_ID=apify~facebook-posts-scraper
ALLOWED_ORIGINS=https://your-vercel-domain.vercel.app
```

See `.env.example` for the complete environment variable configuration.

Then set the frontend Vercel variable:

```bash
VITE_FB_EXTRACTOR_API_URL=https://your-railway-service.up.railway.app
```
