import httpx
from bs4 import BeautifulSoup
import yt_dlp
import html as html_lib
import json
import re
from typing import Any, List, Optional
from playwright.async_api import async_playwright
import playwright_stealth


def normalize_unicode_text(text: str) -> str:
    """
    Convert mathematical alphanumeric symbols to regular ASCII.
    """
    if not text:
        return text

    result = []
    for char in text:
        code = ord(char)
        if 0x1D400 <= code <= 0x1D7FF:
            mapped = None
            if 0x1D400 <= code <= 0x1D419:
                mapped = chr(ord("A") + (code - 0x1D400))
            elif 0x1D41A <= code <= 0x1D433:
                mapped = chr(ord("a") + (code - 0x1D41A))
            elif 0x1D7CE <= code <= 0x1D7D7:
                mapped = chr(ord("0") + (code - 0x1D7CE))
            elif 0x1D434 <= code <= 0x1D44D:
                mapped = chr(ord("A") + (code - 0x1D434))
            elif 0x1D44E <= code <= 0x1D467:
                mapped = chr(ord("a") + (code - 0x1D44E))
            elif 0x1D7D8 <= code <= 0x1D7E1:
                mapped = chr(ord("0") + (code - 0x1D7D8))
            elif 0x1D468 <= code <= 0x1D481:
                mapped = chr(ord("A") + (code - 0x1D468))
            elif 0x1D482 <= code <= 0x1D49B:
                mapped = chr(ord("a") + (code - 0x1D482))
            elif 0x1D49C <= code <= 0x1D4B5:
                mapped = chr(ord("A") + (code - 0x1D49C))
            elif 0x1D4B6 <= code <= 0x1D4CF:
                mapped = chr(ord("a") + (code - 0x1D4B6))
            elif 0x1D4D0 <= code <= 0x1D4E9:
                mapped = chr(ord("A") + (code - 0x1D4D0))
            elif 0x1D4EA <= code <= 0x1D503:
                mapped = chr(ord("a") + (code - 0x1D4EA))
            elif 0x1D504 <= code <= 0x1D51D:
                mapped = chr(ord("A") + (code - 0x1D504))
            elif 0x1D51E <= code <= 0x1D537:
                mapped = chr(ord("a") + (code - 0x1D51E))
            elif 0x1D538 <= code <= 0x1D551:
                mapped = chr(ord("A") + (code - 0x1D538))
            elif 0x1D552 <= code <= 0x1D56B:
                mapped = chr(ord("a") + (code - 0x1D552))
            elif 0x1D5A0 <= code <= 0x1D5B9:
                mapped = chr(ord("A") + (code - 0x1D5A0))
            elif 0x1D5BA <= code <= 0x1D5D3:
                mapped = chr(ord("a") + (code - 0x1D5BA))
            elif 0x1D5D4 <= code <= 0x1D5ED:
                mapped = chr(ord("A") + (code - 0x1D5D4))
            elif 0x1D5EE <= code <= 0x1D607:
                mapped = chr(ord("a") + (code - 0x1D5EE))
            elif 0x1D608 <= code <= 0x1D621:
                mapped = chr(ord("A") + (code - 0x1D608))
            elif 0x1D622 <= code <= 0x1D63B:
                mapped = chr(ord("a") + (code - 0x1D622))
            elif 0x1D63C <= code <= 0x1D655:
                mapped = chr(ord("A") + (code - 0x1D63C))
            elif 0x1D656 <= code <= 0x1D66F:
                mapped = chr(ord("a") + (code - 0x1D656))
            elif 0x1D670 <= code <= 0x1D689:
                mapped = chr(ord("A") + (code - 0x1D670))
            elif 0x1D68A <= code <= 0x1D6A3:
                mapped = chr(ord("a") + (code - 0x1D68A))
            elif 0x1D7E2 <= code <= 0x1D7EB:
                mapped = chr(ord("0") + (code - 0x1D7E2))
            elif 0x1D7F6 <= code <= 0x1D7FF:
                mapped = chr(ord("0") + (code - 0x1D7F6))

            result.append(mapped or char)
        else:
            result.append(char)

    return "".join(result)


def upscale_fb_image_url(url: str) -> str:
    """
    Attempts to remove resolution markers from Facebook CDN URLs to get higher resolution images.
    """
    if not url:
        return url

    # Facebook CDN URLs are signed; changing query params invalidates the signature.
    if "_nc_" in url or "oh=" in url:
        return url

    upscaled = re.sub(r"/(s?\d+x\d+)/", "/", url)
    if upscaled == url:
        upscaled = re.sub(r"_s\d+x\d+", "", url)
    if upscaled == url:
        upscaled = re.sub(r"s=\d+", "s=2048", url)

    return upscaled


def find_text_in_json(data: Any, target_keys: List[str]) -> Optional[str]:
    """
    Recursively searches a JSON-like structure for the longest string matching target keys.
    """
    best_text = ""
    if isinstance(data, dict):
        for k, v in data.items():
            if k in target_keys and isinstance(v, str):
                if len(v) > len(best_text):
                    best_text = v
            elif isinstance(v, (dict, list)):
                found = find_text_in_json(v, target_keys)
                if found and len(found) > len(best_text):
                    best_text = found
    elif isinstance(data, list):
        for item in data:
            found = find_text_in_json(item, target_keys)
            if found and len(found) > len(best_text):
                best_text = found
    return best_text if best_text else None


def find_urls_in_json(data: Any, target_keys: List[str]) -> List[str]:
    """
    Recursively searches a JSON-like structure for all strings that look like URLs matching target keys.
    """
    urls = []
    if isinstance(data, dict):
        for k, v in data.items():
            if k in target_keys:
                if isinstance(v, str) and (v.startswith("http") or "cdn" in v):
                    urls.append(v)
                elif isinstance(v, list):
                    for item in v:
                        if isinstance(item, str) and (item.startswith("http") or "cdn" in item):
                            urls.append(item)
                elif isinstance(v, dict):
                    nested_url = find_text_in_json(v, ["url", "src", "link"])
                    if nested_url:
                        urls.append(nested_url)
            elif isinstance(v, (dict, list)):
                urls.extend(find_urls_in_json(v, target_keys))
    elif isinstance(data, list):
        for item in data:
            urls.extend(find_urls_in_json(item, target_keys))
    return urls


SHARE_LINK_PATTERN = re.compile(r"facebook\.com/share/p/", re.IGNORECASE)
IMAGE_URL_PATTERN = re.compile(
    r"https?://[^\"'<>\s]+(?:scontent|fbcdn)[^\"'<>\s]+\.(?:jpg|jpeg|png|webp)(?:\?[^\"'<>\s]*)?",
    re.IGNORECASE,
)
VIDEO_URL_PATTERN = re.compile(
    r"https?://[^\"'<>\s]+(?:video|fbcdn)[^\"'<>\s]+\.mp4(?:\?[^\"'<>\s]*)?",
    re.IGNORECASE,
)

BROWSER_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/125.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://www.google.com/",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Upgrade-Insecure-Requests": "1",
}

IDENTITIES = [
    {
        "name": "Googlebot",
        "headers": {
            "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
            "Accept": BROWSER_HEADERS["Accept"],
            "Accept-Language": "en-US,en;q=0.9",
            "Referer": "https://www.google.com/",
            "Sec-Fetch-Dest": "document",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Site": "none",
            "Accept-Encoding": "gzip, deflate, br",
        },
    },
    {
        "name": "Bingbot",
        "headers": {
            "User-Agent": "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)",
            "Accept": BROWSER_HEADERS["Accept"],
            "Accept-Language": "en-US,en;q=0.9",
            "Referer": "https://www.bing.com/",
            "Sec-Fetch-Dest": "document",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Site": "none",
            "Accept-Encoding": "gzip, deflate, br",
        },
    },
    {
        "name": "Desktop-Chrome",
        "headers": BROWSER_HEADERS,
    },
    {
        "name": "Mobile-iPhone",
        "headers": {
            "User-Agent": (
                "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) "
                "AppleWebKit/605.1.15 (KHTML, like Gecko) "
                "Version/16.6 Mobile/15E148 Safari/604.1"
            ),
            "Accept": BROWSER_HEADERS["Accept"],
            "Accept-Language": "en-US,en;q=0.9",
            "Referer": "https://www.google.com/",
            "Sec-Fetch-Dest": "document",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Site": "none",
            "Accept-Encoding": "gzip, deflate, br",
        },
    },
]


def get_extraction_strategy(url: str) -> dict[str, Any]:
    """Return the best extraction strategy based on URL type."""
    if SHARE_LINK_PATTERN.search(url):
        return {
            "priority": True,
            "methods": ["Playwright-with-UserScripts", "Static-Headers"],
            "reason": "share-link",
        }

    if "facebook.com" in url or "fb.watch" in url:
        return {
            "priority": True,
            "methods": ["Static-Headers", "Playwright-with-UserScripts"],
            "reason": "facebook-url",
        }

    return {"priority": False, "methods": [], "reason": "unsupported"}


def is_likely_image_url(url: str) -> bool:
    lowered = str(url or "").lower()
    if not lowered.startswith("http"):
        return False
    if not any(domain in lowered for domain in ("scontent", "fbcdn")):
        return False
    if any(bad in lowered for bad in ("static.xx.fbcdn.net", "static.facebook.com", "emoji", ".js", ".css")):
        return False
    return any(marker in lowered for marker in (".jpg", ".jpeg", ".png", ".webp", "t39.", "safe_image"))


def add_image_url(image_urls: set[str], url: str) -> None:
    clean_url = html_lib.unescape(str(url or "").strip())
    if clean_url and is_likely_image_url(clean_url):
        image_urls.add(upscale_fb_image_url(clean_url))


def add_video_url(video_urls: set[str], url: str) -> None:
    clean_url = html_lib.unescape(str(url or "").strip())
    lowered = clean_url.lower()
    if clean_url.startswith("http") and ".mp4" in lowered and ("video" in lowered or "fbcdn" in lowered):
        video_urls.add(clean_url)


async def apply_stealth(page) -> None:
    if hasattr(playwright_stealth, "stealth_async"):
        await playwright_stealth.stealth_async(page)
        return

    stealth_cls = getattr(playwright_stealth, "Stealth", None)
    if stealth_cls is None:
        return

    stealth = stealth_cls(navigator_user_agent_override=BROWSER_HEADERS["User-Agent"])
    await stealth.apply_stealth_async(page)


async def is_url_accessible(client: httpx.AsyncClient, url: str) -> bool:
    if not url:
        return False

    clean_url = str(url).strip()
    if not clean_url:
        return False

    for method in ("HEAD", "GET"):
        try:
            response = await client.request(method, clean_url, follow_redirects=True, timeout=5.0)
            if response.status_code >= 400:
                continue
            final_url = str(response.url).lower()
            if "login" in final_url or "checkpoint" in final_url:
                continue
            return True
        except Exception:
            continue

    return False


def parse_html_content(html: str):
    """
    Helper to parse HTML and extract potential text and image candidates.
    """
    soup = BeautifulSoup(html or "", "html.parser")
    text_candidates = []
    image_urls = set()
    video_urls = set()

    json_ld_scripts = soup.find_all("script", type="application/ld+json")
    for script in json_ld_scripts:
        try:
            data = json.loads(script.string or "")
            items = data if isinstance(data, list) else [data]
            for item in items:
                if not isinstance(item, dict):
                    continue
                for key in ("articleBody", "description", "caption", "text"):
                    value = item.get(key)
                    if isinstance(value, str) and value.strip():
                        text_candidates.append(value.strip())
        except Exception:
            continue

    for meta_key in ("og:description", "twitter:description"):
        meta = soup.find("meta", property=meta_key) or soup.find("meta", attrs={"name": meta_key})
        if meta and meta.get("content"):
            text_candidates.append(meta.get("content").strip())

    for div in soup.find_all(["div", "span"], {"dir": "auto"}):
        text = div.get_text(" ", strip=True)
        if text:
            text_candidates.append(text)

    for script in soup.find_all("script"):
        content = script.string or script.get_text() or ""
        if not content:
            continue
        for json_match in re.finditer(r"(\{[^<]{20,}\})", content):
            try:
                blob_data = json.loads(json_match.group(1))
            except Exception:
                continue

            found_text = find_text_in_json(
                blob_data,
                ["message", "caption", "text", "articleBody", "description"],
            )
            if found_text:
                text_candidates.append(found_text)

            found_urls = find_urls_in_json(
                blob_data,
                ["media", "images", "urls", "attachments", "image", "src", "url"],
            )
            for found_url in found_urls:
                if isinstance(found_url, str):
                    add_image_url(image_urls, found_url)
                    add_video_url(video_urls, found_url)

    for pattern in (IMAGE_URL_PATTERN,):
        for match in pattern.finditer(html or ""):
            add_image_url(image_urls, match.group(0))

    for match in VIDEO_URL_PATTERN.finditer(html or ""):
        add_video_url(video_urls, match.group(0))

    for meta_key in ("og:image", "twitter:image"):
        meta = soup.find("meta", property=meta_key) or soup.find("meta", attrs={"name": meta_key})
        if meta and meta.get("content"):
            add_image_url(image_urls, meta.get("content").strip())

    for img in soup.find_all("img"):
        src = img.get("src") or img.get("data-src") or img.get("srcset")
        if not src:
            continue
        if "," in src:
            src = src.split(",")[-1].split(" ")[0].strip()
        add_image_url(image_urls, src)

    return text_candidates, image_urls, video_urls


async def collect_static_content(url: str) -> tuple[list[str], set[str], set[str]]:
    text_candidates = []
    image_urls = set()
    video_urls = set()

    async with httpx.AsyncClient(follow_redirects=True, timeout=15.0) as client:
        for identity in IDENTITIES:
            try:
                response = await client.get(url, headers=identity["headers"])
                final_url = str(response.url).lower()
                if response.status_code != 200 or "login" in final_url or "checkpoint" in final_url:
                    continue

                texts, imgs, videos = parse_html_content(response.text)
                text_candidates.extend(texts)
                image_urls.update(imgs)
                video_urls.update(videos)
            except Exception as exc:
                print(f"DEBUG: Static-Headers identity '{identity['name']}' failed: {exc}")

    return text_candidates, image_urls, video_urls


async def collect_playwright_content(url: str) -> tuple[list[str], set[str], set[str]]:
    text_candidates = []
    image_urls = set()
    video_urls = set()

    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(
            headless=True,
            args=[
                "--disable-blink-features=AutomationControlled",
                "--disable-dev-shm-usage",
                "--no-sandbox",
            ],
        )
        try:
            context = await browser.new_context(
                user_agent=BROWSER_HEADERS["User-Agent"],
                viewport={"width": 1280, "height": 720},
                locale="en-US",
                extra_http_headers={
                    "Accept-Language": "en-US,en;q=0.9",
                    "Referer": "https://www.google.com/",
                },
            )

            page = await context.new_page()
            await apply_stealth(page)
            await page.add_init_script(
                """
                Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
                Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
                Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
                """
            )

            await page.goto(url, wait_until="domcontentloaded", timeout=30000)
            try:
                await page.wait_for_load_state("networkidle", timeout=8000)
            except Exception:
                pass
            try:
                await page.wait_for_timeout(2500)
            except Exception:
                pass

            html = await page.content()
            texts, imgs, videos = parse_html_content(html)
            text_candidates.extend(texts)
            image_urls.update(imgs)
            video_urls.update(videos)
        finally:
            await browser.close()

    return text_candidates, image_urls, video_urls


def choose_best_text(text_candidates: list[str]) -> str:
    best_text = ""
    for candidate in text_candidates:
        stripped = " ".join(str(candidate or "").split())
        if not stripped or "Loading..." in stripped:
            continue
        if len(stripped) > len(best_text):
            best_text = stripped
    return normalize_unicode_text(best_text) if best_text else ""


def choose_target_cluster_text(text_candidates: list[str]) -> str:
    cleaned = [" ".join(str(candidate or "").split()) for candidate in text_candidates]
    cleaned = [candidate for candidate in cleaned if candidate and "Loading..." not in candidate]
    if not cleaned:
        return ""

    first_normalized = normalize_unicode_text(cleaned[0]).lower()
    target_prefix = first_normalized[: min(48, len(first_normalized))]
    cluster = [
        candidate
        for candidate in cleaned
        if normalize_unicode_text(candidate).lower().startswith(target_prefix)
    ]
    return choose_best_text(cluster or cleaned[:1])


async def verify_image_urls(image_urls: set[str]) -> list[str]:
    verified_images = []
    unique_urls = [str(url).strip() for url in dict.fromkeys(image_urls) if str(url).strip()]

    async with httpx.AsyncClient(follow_redirects=True, timeout=10.0, headers=BROWSER_HEADERS) as client:
        for img_url in unique_urls:
            if await is_url_accessible(client, img_url):
                verified_images.append(img_url)

    return verified_images


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
    def debug(self, msg):
        pass

    def warning(self, msg):
        pass

    def error(self, msg):
        pass


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

    extraction_strategy = strategy or get_extraction_strategy(clean_url)
    all_text_candidates = []
    all_image_urls = set()
    method_text_candidates: dict[str, list[str]] = {}

    content["video"] = extract_video_url(clean_url)

    for method_name in extraction_strategy.get("methods", []):
        try:
            if method_name == "Playwright-with-UserScripts":
                texts, imgs, videos = await collect_playwright_content(clean_url)
            elif method_name == "Static-Headers":
                texts, imgs, videos = await collect_static_content(clean_url)
            else:
                continue

            all_text_candidates.extend(texts)
            all_image_urls.update(imgs)
            method_text_candidates.setdefault(method_name, []).extend(texts)

            best_so_far = choose_best_text(all_text_candidates)
            if extraction_strategy.get("reason") == "share-link" and method_name == "Playwright-with-UserScripts":
                continue
            if best_so_far and all_image_urls:
                break
        except Exception as exc:
            print(
                f"DEBUG: Method '{method_name}' failed for "
                f"{extraction_strategy.get('reason', 'unknown')} URL. Trying next strategy... {exc}"
            )
            continue

    static_candidates = method_text_candidates.get("Static-Headers", [])
    static_text = choose_target_cluster_text(static_candidates)
    browser_text = choose_best_text(method_text_candidates.get("Playwright-with-UserScripts", []))
    if extraction_strategy.get("reason") == "share-link" and static_text:
        content["text"] = static_text
    else:
        content["text"] = choose_best_text([static_text, browser_text, *all_text_candidates])
    content["images"] = await verify_image_urls(all_image_urls)

    if not content["text"] and not content["images"] and not content["video"]:
        content["error"] = "Content not found: Facebook is blocking the request or the post is private."

    return content
