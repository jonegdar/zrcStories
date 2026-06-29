import os
import httpx
from typing import Any, Optional
import yt_dlp

APIFY_API_TOKEN = os.environ.get("APIFY_API_TOKEN")
APIFY_ACTOR_ID = os.environ.get("APIFY_ACTOR_ID", "omkar_gurav~facebook-post-scraper")

JUNK_TEXT_BLACKLIST = {
    "facebook", "log in", "sign up", "meta", "join facebook",
    "find friends", "create account", "forgot password", "loading...",
    "cookie policy", "terms of service", "privacy policy",
}

def is_junk_text(text: str) -> bool:
    """Check if the text consists only of common UI elements or is too short."""
    if not text:
        return True

    stripped = " ".join(text.split()).lower()
    if len(stripped) < 5:
        return True

    if stripped in JUNK_TEXT_BLACKLIST:
        return True

    words = stripped.split()
    if all(word in JUNK_TEXT_BLACKLIST for word in words):
        return True

    return False

def extract_video_url(url: str) -> Optional[str]:
    try:
        ydl_opts = {
            "quiet": True,
            "no_warnings": True,
            "format": "best",
            "logger": YoutubeDlQuietLogger(),
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            if isinstance(info, dict) and info.get("url"):
                return str(info["url"])
    except Exception:
        return None
    return None

class YoutubeDlQuietLogger:
    def debug(self, msg): pass
    def warning(self, msg): pass
    def error(self, msg): pass

async def extract_fb_content(url: str, strategy: Optional[dict[str, Any]] = None):
    content = {
        "text": "",
        "images": [],
        "video": None,
        "error": None,
    }

    clean_url = str(url or "").strip()
    if "facebook.com" not in clean_url and "fb.watch" not in clean_url:
        content["error"] = "Invalid URL: Please provide a valid Facebook link."
        return content

    if not APIFY_API_TOKEN:
        content["error"] = "APIFY_API_TOKEN is not configured. Please add it to your Render environment variables."
        return content

    # Keep yt-dlp fallback for video since it works reliably for public videos
    content["video"] = extract_video_url(clean_url)

    # Use the Apify synchronous get-dataset-items endpoint
    apify_url = f"https://api.apify.com/v2/acts/{APIFY_ACTOR_ID}/run-sync-get-dataset-items"
    
    payload = {
        "startUrls": [{"url": clean_url}],
        "resultsLimit": 1
    }

    async with httpx.AsyncClient(timeout=120.0) as client:
        try:
            print(f"INFO: Calling Apify Actor '{APIFY_ACTOR_ID}' for {clean_url}")
            # The run-sync endpoint blocks until the Actor finishes, which can take up to 60s
            response = await client.post(
                f"{apify_url}?token={APIFY_API_TOKEN}",
                json=payload
            )
            
            if response.status_code != 200:
                content["error"] = f"Apify API returned {response.status_code}: {response.text}"
                return content
            
            items = response.json()
            if not items:
                content["error"] = "Apify returned an empty dataset. The post might be private, deleted, or a Captcha blocked the scraper."
                return content
            
            data = items[0]
            
            # Robust text extraction depending on the actor's exact schema
            text_candidates = [
                data.get("text"), data.get("postText"), data.get("message"), 
                data.get("description"), data.get("content")
            ]
            for t in text_candidates:
                if t and isinstance(t, str) and not is_junk_text(t):
                    content["text"] = t
                    break
            
            # Robust image extraction
            images_raw = data.get("photos") or data.get("images") or data.get("media") or []
            if isinstance(images_raw, str):
                content["images"] = [images_raw]
            elif isinstance(images_raw, list):
                content["images"] = []
                for img in images_raw:
                    if isinstance(img, str):
                        content["images"].append(img)
                    elif isinstance(img, dict):
                        url_val = img.get("url") or img.get("image") or img.get("src")
                        if url_val and isinstance(url_val, str):
                            content["images"].append(url_val)
                            
            # Robust video extraction
            video_val = data.get("videoUrl") or data.get("video")
            if video_val and isinstance(video_val, str):
                content["video"] = video_val
                
        except Exception as e:
            content["error"] = f"Failed to communicate with Apify API: {str(e)}"
            return content

    if not content["text"] and not content["images"] and not content["video"]:
        content["error"] = "Content not found: The API extracted no text or media."

    return content
