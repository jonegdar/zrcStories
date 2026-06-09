import asyncio
import httpx
from bs4 import BeautifulSoup
import yt_dlp
import unicodedata
import json
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

IDENTITIES = [
    {
        "name": "Googlebot",
        "headers": {
            "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            "Referer": "https://www.google.com/",
        }
    },
    {
        "name": "Bingbot",
        "headers": {
            "User-Agent": "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            "Referer": "https://www.bing.com/",
        }
    },
    {
        "name": "Mobile-iPhone",
        "headers": {
            "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            "Referer": "https://www.google.com/",
        }
    }
]

async def extract_fb_content(url: str):
    """
    Extracts content from a Facebook post using an Identity Rotation strategy.
    Prioritizes full content extraction via JSON-LD and Meta tags.
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

    # 1. Video Extraction via yt-dlp
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

    # 2. Identity Rotation Extraction
    async with httpx.AsyncClient(follow_redirects=True, timeout=15.0) as client:
        for identity in IDENTITIES:
            name = identity["name"]
            headers = identity["headers"]
            print(f"DEBUG: Attempting extraction with identity: {name}")

            try:
                response = await client.get(url, headers=headers)
                final_url = str(response.url)

                if response.status_code != 200:
                    print(f"DEBUG: {name} failed with status {response.status_code}")
                    continue

                if "login" in final_url.lower() or "checkpoint" in final_url.lower():
                    print(f"DEBUG: {name} was redirected to login/checkpoint: {final_url}")
                    continue

                html = response.text
                soup = BeautifulSoup(html, 'html.parser')

                # --- FULL CONTENT EXTRACTION ---
                candidates = []

                # 1. JSON-LD Extraction
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

                # 2. OpenGraph Description
                og_desc = soup.find("meta", property="og:description")
                if og_desc and og_desc.get("content"):
                    candidates.append(og_desc.get("content").strip())

                # 3. Deep Scan for Caption Containers
                # Facebook often puts the caption in divs with dir="auto"
                for div in soup.find_all("div", {"dir": "auto"}):
                    text = div.get_text().strip()
                    if text:
                        candidates.append(text)

                # Pick the best candidate (longest text that isn't just a UI fragment)
                best_text = ""
                for c in candidates:
                    if not c: continue
                    # Filter out very short candidates or common UI noise
                    if len(c) > len(best_text) and "Loading..." not in c:
                        best_text = c

                if best_text:
                    content["text"] = normalize_unicode_text(best_text)

                # --- ALL MEDIA EXTRACTION ---
                images = []
                og_image = soup.find("meta", property="og:image")
                if og_image and og_image.get("content"):
                    img_url = og_image.get("content").strip()
                    if img_url:
                        images.append(img_url)

                all_imgs = soup.find_all("img")
                for img in all_imgs:
                    src = img.get("src") or img.get("data-src") or img.get("srcset")
                    if not src:
                        continue

                    if any(domain in src for domain in ["scontent", "fbcdn"]):
                        if not any(bad in src.lower() for bad in ["static.facebook.com", "emoji", "z-m-static", "static-assets"]):
                            if src not in images:
                                images.append(src)

                if content["text"] or images:
                    print(f"DEBUG: {name} SUCCESS! Text: {len(content['text'])} chars, Images: {len(images)}")
                    content["images"] = images
                    return content
                else:
                    print(f"DEBUG: {name} returned 200 but found no content (Shadow-Blocked)")

            except Exception as e:
                print(f"DEBUG: {name} encountered error: {e}")
                continue

    # Final Validation
    if not content["text"] and not content["images"] and not content["video"]:
        content["error"] = "Content not found: Facebook is blocking the request or the post is private."

    return content
