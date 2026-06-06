# ZRC Stories

A "Facebook" for the PSHS-ZRC community, featuring content purely by, from, and for the people of the school.

## Project Structure
- `main/`: React + Tailwind frontend (Deployed on Vercel).
- `fb_downloader/`: Python/FastAPI service for extracting public Facebook post content (Deployed on Render).

## Core Features
- **Home**: Landing page.
- **Gallery**: Collection of all published articles.
- **Events**: A sophisticated calendar for school events.
- **Article Maker**: Protected admin page for writing, editing, publishing, and removing articles.
- **FB Content Extraction**: Integration with `fb_downloader` to import content from Facebook links.

## Development Commands

### Frontend (`main/`)
- Install dependencies: `npm install`
- Run development server: `npm run dev`
- Build for production: `npm run build`

### FB Extractor (`fb_downloader/`)
- Install dependencies: `pip install -r requirements.txt`
- Install browser: `playwright install chromium`
- Run server: `uvicorn main:app --reload --host 0.0.0.0 --port 8000`

## Coding Guidelines
- **Frontend**: React with Tailwind CSS.
- **Backend**: Python FastAPI for auxiliary services.
- **Styling**: Maintain consistency with the Tailwind design system used in `main/src`.
- **Architecture**: Modular frontend with a clear separation between public pages and admin tools.
