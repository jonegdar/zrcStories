import asyncio
import httpx
from bs4 import BeautifulSoup
import yt_dlp
import unicodedata
import json
import re
from typing import Optional, Tuple, List, Dict, Any

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
                    # Some URLs are nested under keys like 'url' or 'src'
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
    """
    Performs a HEAD request to verify the URL is accessible and not a login redirect.
    """
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
            # Fallback to GET if HEAD is not supported
            resp = await client.get(url, follow_redirects=True, timeout=5.0)
            if resp.status_code >= 400:
                return False
            if "login" in str(resp.url).lower() or "checkpoint" in str(resp.url).lower():
                return False
            return True
        except Exception:
            return False

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

    async with httpx.AsyncClient(follow_redirects=True, timeout=15.0) as client:
        # Inner function to perform the multi-identity crawl
        async def perform_crawl(current_identities):
            all_images = set()
            best_text = ""

            for identity in current_identities:
                name = identity["name"]
                headers = identity["headers"]
                try:
                    response = await client.get(url, headers=headers)
                    final_url = str(response.url)
                    if response.status_code != 200 or "login" in final_url.lower() or "checkpoint" in final_url.lower():
                        continue

                    html = response.text
                    soup = BeautifulSoup(html, 'html.parser')
                    candidates = []

                    # 1. JSON-LD
                    json_ld_scripts = soup.find_all("script", type="application/ld+json")
                    for script in json_ld_scripts:
                        try:
                            data = json.loads(script.string)
                            if isinstance(data, list):
                                for item in data:
                                    if "articleBody" in item: candidates.append(item["articleBody"])
                                    if "description" in item: candidates.append(item["description"])
                            elif isinstance(data, dict):
                                candidates.append(data.get("articleBody") or data.get("description", ""))
                        except Exception:
                            continue

                    # 2. OG Description
                    og_desc = soup.find("meta", property="og:description")
                    if og_desc and og_desc.get("content"):
                        candidates.append(og_desc.get("content").strip())

                    # 3. dir="auto" divs
                    for div in soup.find_all("div", {"dir": "auto"}):
                        text = div.get_text().strip()
                        if text:
                            candidates.append(text)

                    # 4. Solution C/3: Script Blob Parsing & Deep State Harvesting
                    all_scripts = soup.find_all("script")
                    for script in all_scripts:
                        if script.string:
                            # Try to find JSON objects in JS variables
                            json_match = re.search(r'(\{.*?\});', script.string)
                            if json_match:
                                try:
                                    blob_data = json.loads(json_match.group(1))
                                    # Recover text
                                    found_text = find_text_in_json(blob_data, ["message", "caption", "text", "articleBody"])
                                    if found_text:
                                        candidates.append(found_text)
                                    # Recover media from state
                                    found_urls = find_urls_in_json(blob_data, ["media", "images", "urls", "attachments"])
                                    for u in found_urls:
                                        all_images.add(upscale_fb_image_url(u))
                                except Exception:
                                    continue

                    current_best_text = ""
                    for c in candidates:
                        if c and len(c) > len(current_best_text) and "Loading..." not in c:
                            current_best_text = c

                    if current_best_text:
                        normalized = normalize_unicode_text(current_best_text)
                        if len(normalized) > len(best_text):
                            best_text = normalized

                    # --- HTML MEDIA EXTRACTION ---
                    og_image = soup.find("meta", property="og:image")
                    if og_image and og_image.get("content"):
                        img_url = og_image.get("content").strip()
                        if img_url:
                            all_images.add(upscale_fb_image_url(img_url))

                    all_imgs = soup.find_all("img")
                    for img in all_imgs:
                        src = img.get("src") or img.get("data-src") or img.get("srcset")
                        if not src:
                            continue
                        if "," in src:
                            src = src.split(",")[-1].split(" ")[0].strip()
                        if any(domain in src for domain in ["scontent", "fbcdn"]):
                            if not any(bad in src.lower() for bad in ["static.facebook.com", "emoji", "z-m-static", "static-assets"]):
                                all_images.add(upscale_fb_image_url(src))

                except Exception as e:
                    print(f"DEBUG: {name} error: {e}")
                    continue

            return best_text, all_images

        # Initial attempt
        best_text, images_set = await perform_crawl(IDENTITIES)

        # Solution 1: Stability Loop (Auto-Retry on Suspicious Results)
        # If text is very short and few images were found, try one more time with jitter.
        if (len(best_text) < 20 and len(images_set) < 1):
            print("DEBUG: Suspicious result detected. Performing stability retry...")
            await asyncio.sleep(2) # Jitter

            # Shuffle identities for the retry
            import random
            shuffled_identities = list(IDENTITIES)
            random.shuffle(shuffled_identities)

            retry_text, retry_images = await perform_crawl(shuffled_identities)

            # Take the better of the two
            if len(retry_text) > len(best_text):
                best_text = retry_text
            if len(retry_images) > len(images_set):
                images_set = retry_images

        # Solution 5: Quality Guard (Verify accessible URLs)
        verified_images = []
        for img_url in images_set:
            if await is_url_accessible(client, img_url):
                verified_images.append(img_url)

        content["text"] = best_text
        content["images"] = verified_images

    if not content["text"] and not content["images"] and not content["video"]:
        content["error"] = "Content not found: Facebook is blocking the request or the post is private."

    return content
