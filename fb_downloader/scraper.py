from typing import Any, Optional
import os
from urllib.parse import quote

import httpx
import yt_dlp

DEFAULT_APIFY_ACTOR_ID = "apify~facebook-posts-scraper"
APIFY_API_BASE_URL = "https://api.apify.com/v2"
APIFY_TIMEOUT_SECONDS = 120.0

JUNK_TEXT_BLACKLIST = {
    "facebook", "log in", "sign up", "meta", "join facebook",
    "find friends", "create account", "forgot password", "loading...",
    "cookie policy", "terms of service", "privacy policy",
}


def get_apify_api_token() -> str:
    return os.environ.get("APIFY_API_TOKEN", "").strip()


def get_apify_actor_id() -> str:
    actor_id = os.environ.get("APIFY_ACTOR_ID", DEFAULT_APIFY_ACTOR_ID).strip()
    return actor_id.replace("/", "~") or DEFAULT_APIFY_ACTOR_ID


def get_apify_actor_candidates() -> list[str]:
    candidates: list[str] = []
    preferred = get_apify_actor_id()
    if preferred:
        candidates.append(preferred)
    if DEFAULT_APIFY_ACTOR_ID not in candidates:
        candidates.append(DEFAULT_APIFY_ACTOR_ID)
    return candidates


def get_apify_config_status() -> dict[str, Any]:
    preferred_actor_id = get_apify_actor_id()
    candidate_ids = get_apify_actor_candidates()
    return {
        "configured": bool(get_apify_api_token()),
        "actorId": preferred_actor_id,
        "defaultActorId": DEFAULT_APIFY_ACTOR_ID,
        "fallbackEnabled": candidate_ids[-1] != preferred_actor_id if candidate_ids else False,
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


def _as_text(value: Any) -> str:
    if isinstance(value, str):
        return value.strip()
    if isinstance(value, (int, float)):
        return str(value)
    return ""


def _add_unique_url(values: list[str], url: Any) -> None:
    clean = _as_text(url)
    if clean and clean not in values:
        values.append(clean)


def _collect_image_urls(value: Any) -> list[str]:
    images: list[str] = []

    def visit(node: Any) -> None:
        if isinstance(node, str):
            _add_unique_url(images, node)
            return
        if isinstance(node, dict):
            for key in (
                "url",
                "image",
                "src",
                "source",
                "fullSizeUrl",
                "thumbnail",
                "thumbnailUrl",
                "photoUrl",
            ):
                _add_unique_url(images, node.get(key))
            for key in ("images", "photos", "media"):
                child = node.get(key)
                if child is not node:
                    visit(child)
            return
        if isinstance(node, list):
            for item in node:
                visit(item)

    visit(value)
    return images


def _extract_apify_error(response: httpx.Response, actor_id: str) -> str:
    error_type, message = _parse_apify_error_payload(response)

    if response.status_code == 401:
        return "Apify rejected the API token. Check APIFY_API_TOKEN in Render."
    if response.status_code == 403:
        return "Apify denied access to this Actor. Check the token permissions or Actor subscription."
    if response.status_code == 404 and error_type == "record-not-found":
        return (
            f"Apify Actor '{actor_id}' was not found. "
            f"Current configured actor: '{actor_id}'. "
            f"Set APIFY_ACTOR_ID to '{DEFAULT_APIFY_ACTOR_ID}' in Render, "
            f"or remove the environment variable to use the default."
        )
    if response.status_code == 408:
        return "Apify timed out before returning data. Try again or use a simpler public post URL."
    if response.status_code == 429:
        return "Apify rate limited the request. Wait briefly, then try again."

    detail = message or response.text[:500]
    return f"Apify API returned HTTP {response.status_code}: {detail}"


def _parse_apify_error_payload(response: httpx.Response) -> tuple[str, str]:
    try:
        payload = response.json()
    except ValueError:
        return "", ""

    api_error = payload.get("error") if isinstance(payload, dict) else None
    if not isinstance(api_error, dict):
        return "", ""

    return _as_text(api_error.get("type")), _as_text(api_error.get("message"))


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


def _normalize_apify_item(data: dict[str, Any]) -> dict[str, Any]:
    text_candidates = [
        data.get("text"),
        data.get("postText"),
        data.get("message"),
        data.get("description"),
        data.get("content"),
        data.get("caption"),
        data.get("title"),
    ]
    text = ""
    for candidate in text_candidates:
        clean = _as_text(candidate)
        if clean and not is_junk_text(clean):
            text = clean
            break

    images: list[str] = []
    for key in ("photos", "images", "media", "attachments"):
        for src in _collect_image_urls(data.get(key)):
            _add_unique_url(images, src)

    video_candidates = _collect_video_urls(data)
    video = video_candidates[0] if video_candidates else ""

    return {"text": text, "images": images, "video": video}


def _collect_video_urls(value: Any) -> list[str]:
    videos: list[str] = []

    def visit(node: Any) -> None:
        if isinstance(node, str):
            _add_unique_url(videos, node)
            return
        if isinstance(node, dict):
            for key in (
                "videoUrl",
                "videoUrlHd",
                "videoUrlSd",
                "video_url",
                "playableUrl",
                "playableUrlHd",
                "playableUrlSd",
                "downloadUrl",
            ):
                _add_unique_url(videos, node.get(key))

            type_hint = _as_text(node.get("type")).lower()
            mime_hint = _as_text(node.get("mimeType")).lower()
            if "video" in type_hint or "video" in mime_hint:
                for key in ("url", "src", "fileUrl"):
                    _add_unique_url(videos, node.get(key))

            for key in ("video", "videos", "media", "attachments"):
                child = node.get(key)
                if child is not node:
                    visit(child)
            return
        if isinstance(node, list):
            for item in node:
                visit(item)

    visit(value)
    return videos


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

    apify_token = get_apify_api_token()
    actor_ids = get_apify_actor_candidates()
    preferred_actor_id = actor_ids[0]
    if not apify_token:
        content["error"] = "APIFY_API_TOKEN is not configured. Please add it to your Render environment variables."
        return content

    # Keep yt-dlp fallback for video since it works reliably for public videos
    content["video"] = extract_video_url(clean_url)

    # Use the Apify synchronous get-dataset-items endpoint
    payload = {
        "startUrls": [{"url": clean_url}],
        "resultsLimit": 1,
    }

    async with httpx.AsyncClient(timeout=APIFY_TIMEOUT_SECONDS) as client:
        try:
            for index, actor_id in enumerate(actor_ids):
                actor_path = quote(actor_id, safe="")
                apify_url = f"{APIFY_API_BASE_URL}/acts/{actor_path}/run-sync-get-dataset-items"

                print(f"INFO: Calling Apify Actor '{actor_id}' for {clean_url}")
                # The run-sync endpoint blocks until the Actor finishes, which can take up to 60s
                response = await client.post(
                    apify_url,
                    params={"token": apify_token},
                    json=payload,
                )

                if response.status_code < 200 or response.status_code >= 300:
                    error_type, _ = _parse_apify_error_payload(response)
                    error_message = _extract_apify_error(response, actor_id)
                    
                    # Enhanced fallback: Check for both 404 and record-not-found, plus normalize actor IDs
                    should_fallback = (
                        (response.status_code == 404 or error_type == "record-not-found")
                        and str(actor_id).strip() != str(DEFAULT_APIFY_ACTOR_ID).strip()
                        and DEFAULT_APIFY_ACTOR_ID in actor_ids
                        and index < len(actor_ids) - 1  # Ensure there's a next actor to try
                    )
                    
                    if should_fallback:
                        print(
                            f"INFO: Apify Actor '{actor_id}' failed (HTTP {response.status_code}, type: {error_type}). "
                            f"Falling back to '{DEFAULT_APIFY_ACTOR_ID}'."
                        )
                        continue
                    
                    content["error"] = error_message
                    return content

                try:
                    items = response.json()
                except ValueError:
                    content["error"] = "Apify returned a non-JSON response."
                    return content

                if not isinstance(items, list):
                    content["error"] = "Apify returned an unexpected response shape."
                    return content

                if not items:
                    content["error"] = "Apify returned an empty dataset. The post might be private, deleted, or a Captcha blocked the scraper."
                    return content

                data = items[0]
                if not isinstance(data, dict):
                    content["error"] = "Apify returned an invalid dataset item."
                    return content

                normalized = _normalize_apify_item(data)
                content["text"] = normalized["text"]
                content["images"] = normalized["images"]
                content["video"] = normalized["video"] or content["video"]
                break

        except httpx.TimeoutException:
            content["error"] = "Timed out while waiting for Apify. Please try again."
            return content
        except httpx.HTTPError as e:
            content["error"] = f"Failed to communicate with Apify API: {str(e)}"
            return content

    if not content["text"] and not content["images"] and not content["video"]:
        content["error"] = "Content not found: The API extracted no text or media."

    return content
