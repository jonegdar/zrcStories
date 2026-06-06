import asyncio
from playwright.async_api import async_playwright
import yt_dlp
import unicodedata
import html
import json
import re

IMAGE_URL_RE = re.compile(r"https:(?:\\?/\\?/)[^\"'<>\\s]+")

UI_TEXT_MARKERS = [
    "Log Into Facebook", "Create a new account", "Home", "Profile",
    "Ð’Ð¾Ð¹Ñ‚Ð¸", "ÐŸÐ°Ñ€Ð¾Ð»ÑŒ", "Ð­Ð»ÐµÐºÑ‚Ñ€Ð¾Ð½Ð½Ñ‹Ð¹ Ð°Ð´Ñ€ÐµÑ", "Ð£ÑÑ‚Ð°Ð½Ð¾Ð²Ð¸Ñ‚Ðµ Facebook",
    "Search", "Settings", "Help", "Terms", "Privacy", "About",
    "Language", "Facebook", "Meta", "Forgot password?",
    "Log in", "Sign up", "Email address", "Password",
]

REJECTED_CAPTION_TEXTS = {
    "try again",
    "retry",
    "loading",
    "loading...",
    "please wait",
}

IMAGE_BLOCKLIST = [
    "static.facebook.com",
    "static.xx.fbcdn.net",
    "emoji",
    "z-m-static",
    "static-assets",
    "rsrc.php",
]


def is_noise_caption(text: str) -> bool:
    cleaned = re.sub(r"\s+", " ", str(text or "")).strip().lower()
    if not cleaned:
        return True
    if cleaned in REJECTED_CAPTION_TEXTS:
        return True
    return any(marker.lower() in cleaned for marker in UI_TEXT_MARKERS)


def clean_caption_text(text: str) -> str:
    if not text:
        return ""

    text = html.unescape(text)
    lines = [line.strip() for line in text.replace("\r\n", "\n").split("\n")]
    ui_noise = ['like', 'comment', 'share', 'reply', 'loading', 'cancel', 'wait', 'try again']
    filtered_lines = [
        line for line in lines
        if line and line.lower() not in ui_noise
    ]
    cleaned = normalize_unicode_text("\n".join(filtered_lines).strip())
    return "" if is_noise_caption(cleaned) else cleaned


def is_importable_image_url(src: str) -> bool:
    lowered = str(src or "").lower()
    if not src:
        return False
    if not any(domain in lowered for domain in ['scontent', 'fbcdn']):
        return False
    return not any(bad in lowered for bad in IMAGE_BLOCKLIST)


def normalize_image_url(raw_url: str) -> str:
    value = str(raw_url or "").strip()
    if not value:
        return ""
    if "\\" in value:
        try:
            value = json.loads(f'"{value}"')
        except Exception:
            value = value.replace("\\/", "/")
    value = html.unescape(value).replace("\\/", "/").strip()
    return value if is_importable_image_url(value) else ""


def image_key(src: str) -> str:
    base_url = str(src or "").split("?", 1)[0]
    return base_url.rsplit("/", 1)[-1] or base_url


def add_image_url(images: list[str], src: str) -> None:
    if not src:
        return
    existing_keys = {image_key(item) for item in images}
    if image_key(src) not in existing_keys:
        images.append(src)


def unique_image_urls(urls: list[str]) -> list[str]:
    unique = []
    for url in urls:
        add_image_url(unique, url)
    return unique


async def first_meta_content(page, selectors: list[str]) -> str:
    for selector in selectors:
        try:
            element = await page.query_selector(selector)
            if not element:
                continue
            content = await element.get_attribute("content")
            cleaned = clean_caption_text(content or "")
            if cleaned:
                return cleaned
        except Exception:
            continue
    return ""


async def collect_direct_page_media(page) -> list[str]:
    urls = []

    for selector in [
        'meta[property="og:image"]',
        'meta[name="twitter:image"]',
        'meta[property="og:image:secure_url"]',
    ]:
        try:
            elements = await page.query_selector_all(selector)
            for element in elements:
                normalized = normalize_image_url(await element.get_attribute("content") or "")
                if normalized:
                    urls.append(normalized)
        except Exception:
            continue

    try:
        page_html = await page.content()
        for match in IMAGE_URL_RE.findall(page_html):
            normalized = normalize_image_url(match)
            if normalized:
                urls.append(normalized)
    except Exception:
        pass

    return unique_image_urls(urls)


async def collect_rendered_page_text(page) -> str:
    best_text = ""
    candidates = []
    try:
        elements = await page.query_selector_all('[data-ad-preview="message"], div[dir="auto"]')
        for element in elements:
            text = clean_caption_text(await element.inner_text() or "")
            if not text:
                continue
            candidates.append(text)
            if len(text) > len(best_text):
                best_text = text
    except Exception:
        pass

    if best_text and "\n" not in best_text:
        parts = []
        for text in candidates:
            if text == best_text or text not in best_text:
                continue
            if any(text in existing or existing in text for existing in parts):
                continue
            parts.append(text)
        parts.sort(key=lambda text: best_text.find(text))
        if len(parts) > 1 and sum(len(part) for part in parts) >= len(best_text) * 0.8:
            return "\n".join(parts)

    return best_text


async def collect_rendered_page_media(page) -> list[str]:
    urls = []
    try:
        images = await page.query_selector_all("img")
        for image in images:
            normalized = normalize_image_url(await image.get_attribute("src") or "")
            if normalized:
                urls.append(normalized)
    except Exception:
        pass
    return unique_image_urls(urls)

def normalize_unicode_text(text: str) -> str:
    """
    Convert mathematical alphanumeric symbols to regular ASCII.
    Handles all variants in Unicode block U+1D400-U+1D7FF
    """
    if not text:
        return text

    result = []
    for char in text:
        code = ord(char)
        if 0x1D400 <= code <= 0x1D7FF:
            mapped = None
            if 0x1D400 <= code <= 0x1D419:
                mapped = chr(ord('A') + (code - 0x1D400))
            elif 0x1D41A <= code <= 0x1D433:
                mapped = chr(ord('a') + (code - 0x1D41A))
            elif 0x1D7CE <= code <= 0x1D7D7:
                mapped = chr(ord('0') + (code - 0x1D7CE))
            elif 0x1D434 <= code <= 0x1D44D:
                mapped = chr(ord('A') + (code - 0x1D434))
            elif 0x1D44E <= code <= 0x1D467:
                mapped = chr(ord('a') + (code - 0x1D44E))
            elif 0x1D7D8 <= code <= 0x1D7E1:
                mapped = chr(ord('0') + (code - 0x1D7D8))
            elif 0x1D468 <= code <= 0x1D481:
                mapped = chr(ord('A') + (code - 0x1D468))
            elif 0x1D482 <= code <= 0x1D49B:
                mapped = chr(ord('a') + (code - 0x1D482))
            elif 0x1D49C <= code <= 0x1D4B5:
                mapped = chr(ord('A') + (code - 0x1D49C))
            elif 0x1D4B6 <= code <= 0x1D4CF:
                mapped = chr(ord('a') + (code - 0x1D4B6))
            elif 0x1D4D0 <= code <= 0x1D4E9:
                mapped = chr(ord('A') + (code - 0x1D4D0))
            elif 0x1D4EA <= code <= 0x1D503:
                mapped = chr(ord('a') + (code - 0x1D4EA))
            elif 0x1D504 <= code <= 0x1D51D:
                mapped = chr(ord('A') + (code - 0x1D504))
            elif 0x1D51E <= code <= 0x1D537:
                mapped = chr(ord('a') + (code - 0x1D51E))
            elif 0x1D538 <= code <= 0x1D551:
                mapped = chr(ord('A') + (code - 0x1D538))
            elif 0x1D552 <= code <= 0x1D56B:
                mapped = chr(ord('a') + (code - 0x1D552))
            elif 0x1D5A0 <= code <= 0x1D5B9:
                mapped = chr(ord('A') + (code - 0x1D5A0))
            elif 0x1D5BA <= code <= 0x1D5D3:
                mapped = chr(ord('a') + (code - 0x1D5BA))
            elif 0x1D5D4 <= code <= 0x1D5ED:
                mapped = chr(ord('A') + (code - 0x1D5D4))
            elif 0x1D5EE <= code <= 0x1D607:
                mapped = chr(ord('a') + (code - 0x1D5EE))
            elif 0x1D608 <= code <= 0x1D621:
                mapped = chr(ord('A') + (code - 0x1D608))
            elif 0x1D622 <= code <= 0x1D63B:
                mapped = chr(ord('a') + (code - 0x1D622))
            elif 0x1D63C <= code <= 0x1D655:
                mapped = chr(ord('A') + (code - 0x1D63C))
            elif 0x1D656 <= code <= 0x1D66F:
                mapped = chr(ord('a') + (code - 0x1D656))
            elif 0x1D670 <= code <= 0x1D689:
                mapped = chr(ord('A') + (code - 0x1D670))
            elif 0x1D68A <= code <= 0x1D6A3:
                mapped = chr(ord('a') + (code - 0x1D68A))
            elif 0x1D7E2 <= code <= 0x1D7EB:
                mapped = chr(ord('0') + (code - 0x1D7E2))
            elif 0x1D7F6 <= code <= 0x1D7FF:
                mapped = chr(ord('0') + (code - 0x1D7F6))

            if mapped:
                result.append(mapped)
            else:
                result.append(char)
        else:
            result.append(char)

    return ''.join(result)

async def extract_fb_content(url: str):
    """
    Extracts text, images, and video from a public Facebook post.
    Uses mbasic.facebook.com to bypass heavy bot detection.
    """
    content = {
        "text": "",
        "images": [],
        "video": None,
        "error": None
    }

    if "facebook.com" not in url:
        content["error"] = "Invalid URL: Please provide a valid Facebook link."
        return content

    print(f"DEBUG: Starting extraction for URL: {url}")

    # Use the original URL for yt-dlp as it handles various FB formats better
    try:
        print("DEBUG: Attempting video extraction with yt-dlp...")
        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'format': 'best',
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            try:
                info = ydl.extract_info(url, download=False)
                if 'url' in info:
                    content["video"] = info['url']
                    print("DEBUG: Video URL found.")
            except Exception as e:
                print(f"DEBUG: yt-dlp could not find a video: {e}")
    except Exception as e:
        print(f"DEBUG: yt-dlp critical error: {e}")

    try:
        print("DEBUG: Launching Playwright browser...")
        async with async_playwright() as p:
            browser = await p.chromium.launch(
                headless=True,
                args=[
                    "--disable-blink-features=AutomationControlled",
                    "--disable-dev-shm-usage",
                    "--no-first-run",
                    "--no-default-browser-check",
                ]
            )
            # Use a regular desktop browser signature so public Open Graph
            # metadata is available before falling back to mbasic.
            context = await browser.new_context(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
                viewport={'width': 1366, 'height': 768},
                extra_http_headers={
                    "Accept-Language": "en-US,en;q=0.9",
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3",
                }
            )

            await context.add_init_script("""
                Object.defineProperty(navigator, 'webdriver', { get: () => false });
            """)

            page = await context.new_page()

            # Facebook's regular page often exposes public Open Graph metadata
            # even when mbasic redirects headless browsers to a login/retry wall.
            print("DEBUG: Checking direct Facebook metadata...")
            try:
                try:
                    await page.goto(url, wait_until="networkidle", timeout=60000)
                except Exception as e:
                    print(f"DEBUG: Direct networkidle wait failed: {e}")
                    await page.goto(url, wait_until="domcontentloaded", timeout=30000)
                await asyncio.sleep(3)

                rendered_text = await collect_rendered_page_text(page)
                if rendered_text:
                    content["text"] = rendered_text
                    print(f"DEBUG: Rendered text extracted ({len(rendered_text)} chars)")

                for src in await collect_rendered_page_media(page):
                    add_image_url(content["images"], src)

                meta_text = await first_meta_content(page, [
                    'meta[property="og:description"]',
                    'meta[name="description"]',
                    'meta[name="twitter:description"]',
                ])
                if meta_text and len(meta_text) > len(content["text"]):
                    content["text"] = meta_text
                    print(f"DEBUG: Metadata text extracted ({len(meta_text)} chars)")

                for src in await collect_direct_page_media(page):
                    add_image_url(content["images"], src)

                if content["images"]:
                    print(f"DEBUG: Metadata images found: {len(content['images'])}")
            except Exception as e:
                print(f"DEBUG: Direct metadata extraction failed: {e}")

            # Step 1: Resolve share links using mbasic to avoid the www.facebook.com bot-wall
            resolved_url = url
            if "/share/" in url:
                mbasic_resolve_url = url.replace("www.facebook.com", "mbasic.facebook.com")
                if "facebook.com" in url and "mbasic" not in mbasic_resolve_url:
                    mbasic_resolve_url = url.replace("facebook.com", "mbasic.facebook.com")

                print(f"DEBUG: Resolving share link via mbasic: {mbasic_resolve_url}...")
                try:
                    await page.goto(mbasic_resolve_url, wait_until="domcontentloaded", timeout=30000)
                    await asyncio.sleep(2)
                    resolved_url = page.url
                    print(f"DEBUG: Resolved URL: {resolved_url}")
                except Exception as e:
                    print(f"DEBUG: mbasic resolution failed: {e}")
            else:
                print(f"DEBUG: Standard URL detected, no resolution needed: {url}")

            # Step 2: Transform the RESOLVED URL to mbasic for extraction
            mbasic_url = resolved_url.replace("www.facebook.com", "mbasic.facebook.com")
            if "facebook.com" in resolved_url and "mbasic" not in mbasic_url:
                mbasic_url = resolved_url.replace("facebook.com", "mbasic.facebook.com")

            print(f"DEBUG: Navigating to mbasic URL for extraction: {mbasic_url}...")
            try:
                await page.goto(mbasic_url, wait_until="networkidle", timeout=60000)
            except Exception as e:
                print(f"DEBUG: Navigation timeout: {e}")
                await page.goto(mbasic_url, wait_until="domcontentloaded")

            await asyncio.sleep(2)
            current_url = page.url

            if "login" in current_url or "/login.php" in current_url:
                print("DEBUG: mbasic redirected to login. Attempting content extraction anyway...")

            print("DEBUG: Extracting content from mbasic layout...")

            # HARD CHECK: Is this a login page? (Language-agnostic)
            is_login_wall = await page.query_selector('input[type="password"]')
            if is_login_wall:
                print("DEBUG: Login wall detected (password field found).")

            # Give the page an extra second to ensure content is rendered
            await asyncio.sleep(1)

            # Improved text extraction: Look for the post content
            text_elements = await page.query_selector_all('div')
            best_text = ""

            for el in text_elements:
                txt = await el.inner_text()
                if not txt:
                    continue

                # Remove common UI noise that might be bundled in inner_text()
                clean_txt = txt.replace('Loading...', '').replace('Cancel', '').strip()

                if len(clean_txt) > len(best_text):
                    # UI markers that indicate this is a navigation/system block, not a post
                    markers = [
                        "Log Into Facebook", "Create a new account", "Home", "Profile",
                        "Войти", "Пароль", "Электронный адрес", "Установите Facebook",
                        "Search", "Settings", "Help", "Terms", "Privacy", "About",
                        "Language", "Facebook", "Meta", "Forgot password?"
                    ]

                    # SMART FILTER:
                    # 1. If the text is long (e.g. > 100 chars), it's likely a post, regardless of markers.
                    # 2. If it's short, it must NOT contain any UI markers.
                    is_likely_content = len(clean_txt) > 100 or not any(marker in txt for marker in markers)

                    if is_likely_content and len(clean_txt) > 5:
                        best_text = clean_txt

            if best_text:
                # Clean up the extracted text
                final_text = clean_caption_text(best_text)
                if final_text and len(final_text) > len(content["text"]):
                    content["text"] = final_text

                print(f"DEBUG: Text extracted ({len(content['text'])} chars)")

            # Extract images
            images = await page.query_selector_all('img')
            seen_src = set()
            for img in images:
                src = await img.get_attribute('src')
                if not src or src in seen_src:
                    continue

                normalized_src = normalize_image_url(src)
                normalized_key = image_key(normalized_src)
                if normalized_src and normalized_key not in seen_src:
                    seen_src.add(normalized_key)
                    add_image_url(content["images"], normalized_src)

            print(f"DEBUG: Found {len(content['images'])} images")

            # Final validation: If we found a login wall or nothing meaningful, it's an error
            if is_noise_caption(content["text"]):
                content["text"] = ""

            if (is_login_wall and not content["text"] and not content["images"] and not content["video"]) or (not content["text"] and not content["images"] and not content["video"]):
                if is_login_wall:
                    content["error"] = "Private Post: This content is not public or is blocked by Facebook's bot-protection."
                else:
                    content["error"] = "Content not found: The post may be empty or blocked."

            await browser.close()
    except Exception as e:
        print(f"DEBUG: Critical error: {e}")
        content["error"] = str(e)

    return content
