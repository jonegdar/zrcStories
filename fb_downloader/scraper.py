import asyncio
import httpx
from bs4 import BeautifulSoup
import yt_dlp
import unicodedata
import json
import re
from typing import Optional, Tuple, List, Dict, Any
from playwright.async_api import async_playwright
from playwright_stealth import stealth_async

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

def upscale_fb_image_url(url: str) -> str:
    """
    Attempts to remove resolution markers from Facebook CDN URLs to get higher resolution images.
    """
    if not url:
        return url

    # Pattern 1: /s[width]x[height]/ -> / (Most common)
    upscaled = re.sub(r'/(s?\d+x\d+)/', '/', url)

    # Pattern 2: _s[width]x[height] at the end or before query
    if upscaled == url:
        upscaled = re.sub(r'_s\d+x\d+', '', url)

    # Pattern 3: Query parameter s=...
    if upscaled == url:
        upscaled = re.sub(r's=\d+', 's=2048', url)

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

IDENTITIES = [
    {
        "name": "Googlebot",
        "headers": {
            "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            "Referer": "https://www.google.com/",
            "Sec-Fetch-Dest": "document",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Site": "none",
            "Accept-Encoding": "gzip, deflate, br",
        }
    },
    {
        "name": "Bingbot",
        "headers": {
            "User-Agent": "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            "Referer": "https://www.bing.com/",
            "Sec-Fetch-Dest": "document",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Site": "none",
            "Accept-Encoding": "gzip, deflate, br",
        }
    },
    {
        "name": "Mobile-iPhone",
        "headers": {
            "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            "Referer": "https://www.google.com/",
            "Sec-Fetch-Dest": "document",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Site": "none",
            "Accept-Encoding": "gzip, deflate, br",
        }
    }
]

async def is_url_accessible(client, url: str) -> bool:
    if not url:
        return False
    try:
        resp = await client.head(url, follow_redirects=True, timeout=5.0)
        if resp.status_code >= 400:
            return False
        if "login" in str(resp.url).lower() or "checkpoint" in str(resp.url).lower():
            return False
        return True
    except Exception:
        try:
            resp = await client.get(url, follow_redirects=True, timeout=5.0)
            if resp.status_code >= 400:
                return False
            if "login" in str(resp.url).lower() or "checkpoint" in str(resp.url).lower():
                return False
            return True
        except Exception:
            return False

def parse_html_content(html: str):
    """
    Helper to parse HTML and extract potential text and image candidates.
    """
    soup = BeautifulSoup(html, 'html.parser')
    text_candidates = []
    image_urls = set()

    # 1. JSON-LD
    json_ld_scripts = soup.find_all("script", type="application/ld+json")
    for script in json_ld_scripts:
        try:
            data = json.loads(script.string)
            if isinstance(data, list):
                for item in data:
                    if "articleBody" in item: text_candidates.append(item["articleBody"])
                    if "description" in item: text_candidates.append(item["description"])
            elif isinstance(data, dict):
                text_candidates.append(data.get("articleBody") or data.get("description", ""))
        except Exception:
            continue

    # 2. OG Description
    og_desc = soup.find("meta", property="og:description")
    if og_desc and og_desc.get("content"):
        text_candidates.append(og_desc.get("content").strip())

    # 3. dir="auto" divs
    for div in soup.find_all("div", {"dir": "auto"}):
        text = div.get_text().strip()
        if text:
            text_candidates.append(text)

    # 4. Script Blobs
    all_scripts = soup.find_all("script")
    for script in all_scripts:
        if script.string:
            json_match = re.search(r'(\{.*?\});', script.string)
            if json_match:
                try:
                    blob_data = json.loads(json_match.group(1))
                    found_text = find_text_in_json(blob_data, ["message", "caption", "text", "articleBody"])
                    if found_text:
                        text_candidates.append(found_text)
                    found_urls = find_urls_in_json(blob_data, ["media", "images", "urls", "attachments"])
                    for u in found_urls:
                        image_urls.add(upscale_fb_image_url(u))
                except Exception:
                    continue

    # 5. Images
    og_image = soup.find("meta", property="og:image")
    if og_image and og_image.get("content"):
        img_url = og_image.get("content").strip()
        if img_url:
            image_urls.add(upscale_fb_image_url(img_url))

    all_imgs = soup.find_all("img")
    for img in all_imgs:
        src = img.get("src") or img.get("data-src") or img.get("srcset")
        if not src:
            continue
        if "," in src:
            src = src.split(",")[-1].split(" ")[0].strip()
        if any(domain in src for domain in ["scontent", "fbcdn"]):
            if not any(bad in src.lower() for bad in ["static.facebook.com", "emoji", "z-m-static", "static-assets"]):
                image_urls.add(upscale_fb_image_url(src))

    return text_candidates, image_urls

async def extract_fb_content(url: str):
    content = {
        "text": "",
        "images": [],
        "video": None,
        "error": None
    }

    if "facebook.com" not in url:
        content["error"] = "Invalid URL: Please provide a valid Facebook link."
        return content

    # Video Extraction
    try:
        ydl_opts = {'quiet': True, 'no_warnings': True, 'format': 'best'}
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            try:
                info = ydl.extract_info(url, download=False)
                if 'url' in info:
                    content["video"] = info['url']
            except Exception:
                pass
    except Exception:
        pass

    all_text_candidates = []
    all_image_urls = set()

    async with httpx.AsyncClient(follow_redirects=True, timeout=15.0) as client:
        # Max-Union Strategy: Try all identities and collect EVERYTHING
        for identity in IDENTITIES:
            try:
                response = await client.get(url, headers=identity["headers"])
                if response.status_code == 200 and "login" not in response.url.lower() and "checkpoint" not in response.url.lower():
                    texts, imgs = parse_html_content(response.text)
                    all_text_candidates.extend(texts)
                    all_image_urls.update(imgs)
            except Exception:
                continue

        # Solution 1: Real-Browser Fallback (Playwright) with Stealth
        if len(all_text_candidates) == 0 or (max([len(t) for t in all_text_candidates] + [0]) < 20 and not all_image_urls):
            try:
                async with async_playwright() as p:
                    browser = await p.chromium.launch(headless=True)
                    context = await browser.new_context(
                        user_agent=IDENTITIES[0]["headers"]["User-Agent"],
                        viewport={'width': 1280, 'height': 720}
                    )

                    # Apply stealth to the page
                    page = await context.new_page()
                    await stealth_async(page)

                    # Go to URL and wait for network to settle
                    await page.goto(url, wait_until="networkidle", timeout=30000)

                    # Extract the rendered HTML
                    html = await page.content()
                    texts, imgs = parse_html_content(html)
                    all_text_candidates.extend(texts)
                    all_image_urls.update(imgs)

                    await browser.close()
            except Exception as e:
                print(f"DEBUG: Playwright Stealth error: {e}")

        # Determine the best text from the union of all candidates
        best_text = ""
        for t in all_text_candidates:
            if t and "Loading..." not in t and len(t) > len(best_text):
                best_text = t

        content["text"] = normalize_unicode_text(best_text) if best_text else ""

        # Quality Guard: Verify all collected images
        verified_images = []
        for img_url in all_image_urls:
            if await is_url_accessible(client, img_url):
                verified_images.append(img_url)

        content["images"] = verified_images

    if not content["text"] and not content["images"] and not content["video"]:
        content["error"] = "Content not found: Facebook is blocking the request or the post is private."

    return content
