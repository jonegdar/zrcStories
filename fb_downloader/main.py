import json
import os
from typing import Optional
from urllib.parse import urlparse

from fastapi import FastAPI, HTTPException, Depends, Body, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session

from scraper import extract_fb_content, get_apify_config_status, is_junk_text
from database import init_db, get_db, Article

# Initialize database tables
init_db()

app = FastAPI(title="Facebook Content Manager API")

DEFAULT_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5175",
    "http://127.0.0.1:5175",
]


def get_allowed_origins():
    raw = os.getenv("ALLOWED_ORIGINS", "")
    origins = [origin.strip() for origin in raw.split(",") if origin.strip()]
    return origins


def allow_all_local_origins():
    return os.getenv("ALLOWED_ORIGINS", "").strip() == ""


def is_facebook_url(url: str) -> bool:
    parsed = urlparse(url)
    hostname = (parsed.hostname or "").lower()
    if parsed.scheme not in {"http", "https"}:
        return False
    return (
        hostname == "facebook.com"
        or hostname.endswith(".facebook.com")
        or hostname == "fb.watch"
    )


class ImportRequest(BaseModel):
    url: str


class ImportMedia(BaseModel):
    type: str
    src: str
    caption: str = ""


class ImportResponse(BaseModel):
    id: Optional[int] = None
    caption: str
    media: list[ImportMedia]
    sourceUrl: str


allowed_origins = get_allowed_origins()
allow_all_local = allow_all_local_origins()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if allow_all_local else (allowed_origins or DEFAULT_ALLOWED_ORIGINS),
    allow_credentials=False if allow_all_local else True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    from scraper import get_apify_actor_candidates, get_apify_api_token
    
    return {
        "status": "ok",
        "message": "Server is running",
        "apify": {
            **get_apify_config_status(),
            "actorCandidates": get_apify_actor_candidates(),
            "hasToken": bool(get_apify_api_token()),
        }
    }

@app.post("/import")
async def import_content(
    payload: Optional[ImportRequest] = Body(None),
    url: Optional[str] = Query(None),
    db: Session = Depends(get_db),
) -> ImportResponse:
    url = (payload.url if payload else url or "").strip()
    print(f"INFO: Received import request for URL: {url}")
    if not url:
        raise HTTPException(status_code=400, detail="URL is required")
    if not is_facebook_url(url):
        raise HTTPException(status_code=400, detail="Please provide a valid public Facebook post URL.")
    
    try:
        result = await extract_fb_content(url)
        if result.get("error"):
            print(f"INFO: Extraction failed: {result['error']}")
            raise HTTPException(status_code=422, detail=result["error"])

        text = str(result.get("text") or "").strip()
        images = [str(src).strip() for src in result.get("images") or [] if str(src).strip()]
        video = str(result.get("video") or "").strip()
        media = [
            ImportMedia(type="image", src=src, caption="")
            for src in dict.fromkeys(images)
        ]
        if video:
            media.append(ImportMedia(type="video", src=video, caption=""))

        if is_junk_text(text) and not media:
            raise HTTPException(
                status_code=422,
                detail="No meaningful content found. The post may be private or contain only UI elements.",
            )
        
        new_article = Article(
            fb_url=url,
            text=text,
            images=json.dumps(images),
            video=video or None,
        )
        db.add(new_article)
        db.commit()
        db.refresh(new_article)
        
        print(f"INFO: Successfully imported article ID: {new_article.id}")
        return ImportResponse(
            id=new_article.id,
            caption=text,
            media=media,
            sourceUrl=url,
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"ERROR: Unexpected error during import: {e}")
        raise HTTPException(
            status_code=500,
            detail="The importer failed unexpectedly. Please try again or create the article manually.",
        )

@app.get("/articles")
async def list_articles(db: Session = Depends(get_db)):
    articles = db.query(Article).order_by(Article.created_at.desc()).all()
    return [
        {
            "id": a.id,
            "fb_url": a.fb_url,
            "text_preview": a.text[:100] + "..." if a.text else "",
            "created_at": a.created_at.isoformat()
        }
        for a in articles
    ]

@app.get("/articles/{article_id}")
async def get_article(article_id: int, db: Session = Depends(get_db)):
    article = db.query(Article).filter(Article.id == article_id).first()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    
    return {
        "id": article.id,
        "fb_url": article.fb_url,
        "text": article.text,
        "images": json.loads(article.images),
        "video": article.video,
        "created_at": article.created_at.isoformat()
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
