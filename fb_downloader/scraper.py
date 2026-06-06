import asyncio
from playwright.async_api import async_playwright
import yt_dlp
import unicodedata
import re

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
                    "--disable-web-security",
                    "--disable-features=IsolateOrigins,site-per-process",
                ]
            )
            # Mimic a mobile device more closely for mbasic
            context = await browser.new_context(
                user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
                viewport={'width': 375, 'height': 667},
                extra_http_headers={
                    "Accept-Language": "en-US,en;q=0.9",
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3",
                    "Referer": "https://www.google.com/",
                    "DNT": "1",
                }
            )

            await context.add_init_script("""
                Object.defineProperty(navigator, 'webdriver', { get: () => false });
            """)

            page = await context.new_page()

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

                    # Solution #3: Validate Share Link Resolution
                    if "login" in resolved_url or "home.php" in resolved_url:
                        print(f"DEBUG: Share link resolution redirected to login/home: {resolved_url}")
                        # We don't raise an error here yet, as the main extraction loop
                        # will handle the login wall detection.
                    else:
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

            # --- IMPROVED EXTRACTION LOGIC (Problem #3) ---

            # 1. Smart Wait: Instead of a fixed sleep, wait for the body to have content
            try:
                await page.wait_for_function(
                    "() => document.body.innerText.length > 200 || document.querySelector('input[type=\"password\"]')",
                    timeout=5000
                )
            except Exception:
                print("DEBUG: Smart wait timed out, proceeding with current state.")

            current_url = page.url
            if "login" in current_url or "/login.php" in current_url:
                print("DEBUG: mbasic redirected to login. Attempting content extraction anyway...")

            print("DEBUG: Extracting content from mbasic layout...")

            # HARD CHECK: Is this a login wall or an error page?
            is_login_wall = await page.query_selector('input[type="password"]')

            # Solution #2: Broaden Login/Error Detection
            page_text = await page.inner_text('body')
            page_text_lower = page_text.lower()
            error_markers = [
                "log in to facebook",
                "log into facebook",
                "create a new account",
                "something went wrong",
                "page not found",
                "the link you followed may be broken"
            ]
            is_error_page = any(marker in page_text_lower for marker in error_markers)

            if is_login_wall or is_error_page:
                print(f"DEBUG: Login wall or error page detected. (Login: {is_login_wall}, Error: {is_error_page})")

            # 2. Multi-Stage Text Extraction
            best_text = ""

            # Stage A: Try to find content in common mbasic post containers
            post_selectors = ['div[dir="auto"]', 'div.content', 'div[id*="post"]']
            for selector in post_selectors:
                elements = await page.query_selector_all(selector)
                for el in elements:
                    txt = await el.inner_text()
                    if txt and len(txt) > len(best_text):
                        clean_txt = txt.replace('Loading...', '').replace('Cancel', '').strip()
                        if len(clean_txt) > len(best_text):
                            markers = ["Log Into Facebook", "Create a new account", "Home", "Profile"]
                            if not any(marker in clean_txt for marker in markers):
                                best_text = clean_txt

            # Stage B: Fallback to Meta tags (Facebook often puts the caption in og:description)
            if not best_text or len(best_text) < 20:
                try:
                    meta_desc = await page.get_attribute('meta[property="og:description"]', 'content')
                    if meta_desc and len(meta_desc) > len(best_text):
                        best_text = meta_desc
                except Exception:
                    pass

            # Stage C: Final Fallback - the "Largest Block" Heuristic (refined)
            if not best_text or len(best_text) < 20:
                text_elements = await page.query_selector_all('div')
                for el in text_elements:
                    txt = await el.inner_text()
                    if not txt: continue
                    clean_txt = txt.replace('Loading...', '').replace('Cancel', '').strip()
                    if len(clean_txt) > len(best_text):
                        markers = ["Log Into Facebook", "Create a new account", "Home", "Profile", "Search", "Settings"]
                        is_likely_content = len(clean_txt) > 100 or not any(marker in clean_txt for marker in markers)
                        if is_likely_content and len(clean_txt) > 5:
                            best_text = clean_txt

            if best_text:
                lines = best_text.split('\\n')
                ui_noise = ['like', 'comment', 'share', 'reply', 'loading', 'cancel', 'wait']
                filtered_lines = [
                    l for l in lines
                    if l.strip() and not any(noise in l.strip().lower() for noise in ui_noise)
                ]
                final_text = normalize_unicode_text('\\n'.join(filtered_lines).strip())
                if any(noise in final_text.lower() for noise in ['loading...', 'please wait']):
                    content["text"] = ""
                else:
                    content["text"] = final_text
                print(f"DEBUG: Text extracted ({len(content['text'])} chars)")

            # 3. Robust Image Extraction
            images = await page.query_selector_all('img')
            seen_src = set()
            for img in images:
                src = await img.get_attribute('src')
                if not src or src in seen_src:
                    continue
                if any(domain in src for domain in ['scontent', 'fbcdn']):
                    if not any(bad in src.lower() for bad in ['static.facebook.com', 'emoji', 'z-m-static', 'static-assets']):
                        seen_src.add(src)
                        content["images"].append(src)
            print(f"DEBUG: Found {len(content['images'])} images")

            # Final validation: If we found a login wall or nothing meaningful, it's an error
            if is_login_wall or is_error_page or (not content["text"] and not content["images"] and not content["video"]):
                if is_login_wall or is_error_page:
                    if is_error_page and not is_login_wall:
                        content["error"] = "The link you followed may be broken or the post is no longer available."
                    else:
                        content["error"] = "Private Post: This content is not public or is blocked by Facebook's bot-protection."
                else:
                    content["error"] = "Content not found: The post may be empty or blocked."

            await browser.close()
    except Exception as e:
        print(f"DEBUG: Critical error: {e}")
        content["error"] = str(e)

    return content
