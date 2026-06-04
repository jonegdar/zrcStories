import asyncio
from playwright.async_api import async_playwright
import yt_dlp
import unicodedata
import re


def normalize_unicode_text(text: str) -> str:
    """
    Convert mathematical alphanumeric symbols and other Unicode variants to ASCII.
    Facebook sometimes uses styled Unicode characters that need to be normalized.
    """
    if not text:
        return text
    
    result = []
    for char in text:
        code = ord(char)
        
        # Check if char is in mathematical alphanumeric symbols block (U+1D400-U+1D7FF)
        if 0x1D400 <= code <= 0x1D7FF:
            # Try to map back to ASCII
            # Bold uppercase A-Z: U+1D400-U+1D419
            if 0x1D400 <= code <= 0x1D419:
                result.append(chr(ord('A') + (code - 0x1D400)))
            # Bold lowercase a-z: U+1D41A-U+1D433
            elif 0x1D41A <= code <= 0x1D433:
                result.append(chr(ord('a') + (code - 0x1D41A)))
            # Italic uppercase A-Z: U+1D434-U+1D44D
            elif 0x1D434 <= code <= 0x1D44D:
                result.append(chr(ord('A') + (code - 0x1D434)))
            # Italic lowercase a-z: U+1D44E-U+1D467
            elif 0x1D44E <= code <= 0x1D467:
                result.append(chr(ord('a') + (code - 0x1D44E)))
            # Bold italic uppercase A-Z: U+1D468-U+1D481
            elif 0x1D468 <= code <= 0x1D481:
                result.append(chr(ord('A') + (code - 0x1D468)))
            # Bold italic lowercase a-z: U+1D482-U+1D49B
            elif 0x1D482 <= code <= 0x1D49B:
                result.append(chr(ord('a') + (code - 0x1D482)))
            # Script uppercase A-Z: U+1D49C-U+1D4B5
            elif 0x1D49C <= code <= 0x1D4B5:
                result.append(chr(ord('A') + (code - 0x1D49C)))
            # Script lowercase a-z: U+1D4B6-U+1D4CF
            elif 0x1D4B6 <= code <= 0x1D4CF:
                result.append(chr(ord('a') + (code - 0x1D4B6)))
            # Fraktur uppercase A-Z: U+1D504-U+1D51D
            elif 0x1D504 <= code <= 0x1D51D:
                result.append(chr(ord('A') + (code - 0x1D504)))
            # Fraktur lowercase a-z: U+1D51E-U+1D537
            elif 0x1D51E <= code <= 0x1D537:
                result.append(chr(ord('a') + (code - 0x1D51E)))
            # Double-struck uppercase A-Z: U+1D538-U+1D551
            elif 0x1D538 <= code <= 0x1D551:
                result.append(chr(ord('A') + (code - 0x1D538)))
            # Double-struck lowercase a-z: U+1D552-U+1D56B
            elif 0x1D552 <= code <= 0x1D56B:
                result.append(chr(ord('a') + (code - 0x1D552)))
            # Sans-serif uppercase A-Z: U+1D5A0-U+1D5B9
            elif 0x1D5A0 <= code <= 0x1D5B9:
                result.append(chr(ord('A') + (code - 0x1D5A0)))
            # Sans-serif lowercase a-z: U+1D5BA-U+1D5D3
            elif 0x1D5BA <= code <= 0x1D5D3:
                result.append(chr(ord('a') + (code - 0x1D5BA)))
            # Sans-serif bold uppercase A-Z: U+1D5D4-U+1D5ED
            elif 0x1D5D4 <= code <= 0x1D5ED:
                result.append(chr(ord('A') + (code - 0x1D5D4)))
            # Sans-serif bold lowercase a-z: U+1D5EE-U+1D607
            elif 0x1D5EE <= code <= 0x1D607:
                result.append(chr(ord('a') + (code - 0x1D5EE)))
            # Sans-serif italic uppercase A-Z: U+1D608-U+1D621
            elif 0x1D608 <= code <= 0x1D621:
                result.append(chr(ord('A') + (code - 0x1D608)))
            # Sans-serif italic lowercase a-z: U+1D622-U+1D63B
            elif 0x1D622 <= code <= 0x1D63B:
                result.append(chr(ord('a') + (code - 0x1D622)))
            # Sans-serif bold italic uppercase A-Z: U+1D63C-U+1D655
            elif 0x1D63C <= code <= 0x1D655:
                result.append(chr(ord('A') + (code - 0x1D63C)))
            # Sans-serif bold italic lowercase a-z: U+1D656-U+1D66F
            elif 0x1D656 <= code <= 0x1D66F:
                result.append(chr(ord('a') + (code - 0x1D656)))
            # Monospace uppercase A-Z: U+1D670-U+1D689
            elif 0x1D670 <= code <= 0x1D689:
                result.append(chr(ord('A') + (code - 0x1D670)))
            # Monospace lowercase a-z: U+1D68A-U+1D6A3
            elif 0x1D68A <= code <= 0x1D6A3:
                result.append(chr(ord('a') + (code - 0x1D68A)))
            # Bold digits 0-9: U+1D7CE-U+1D7D7
            elif 0x1D7CE <= code <= 0x1D7D7:
                result.append(chr(ord('0') + (code - 0x1D7CE)))
            # Italic digits 0-9: U+1D7D8-U+1D7E1
            elif 0x1D7D8 <= code <= 0x1D7E1:
                result.append(chr(ord('0') + (code - 0x1D7D8)))
            # Bold italic digits 0-9: U+1D7E2-U+1D7EB
            elif 0x1D7E2 <= code <= 0x1D7EB:
                result.append(chr(ord('0') + (code - 0x1D7E2)))
            # Sans-serif digits 0-9: U+1D7F6-U+1D7FF
            elif 0x1D7F6 <= code <= 0x1D7FF:
                result.append(chr(ord('0') + (code - 0x1D7F6)))
            # Script uppercase A-Z (cursive): U+1D49C-U+1D4B5
            elif 0x1D49C <= code <= 0x1D4B5:
                result.append(chr(ord('A') + (code - 0x1D49C)))
            # Script lowercase a-z (cursive): U+1D4B6-U+1D4CF
            elif 0x1D4B6 <= code <= 0x1D4CF:
                result.append(chr(ord('a') + (code - 0x1D4B6)))
            # Fractur uppercase A-Z: U+1D504-U+1D51D
            elif 0x1D504 <= code <= 0x1D51D:
                result.append(chr(ord('A') + (code - 0x1D504)))
            # Fractur lowercase a-z: U+1D51E-U+1D537
            elif 0x1D51E <= code <= 0x1D537:
                result.append(chr(ord('a') + (code - 0x1D51E)))
            else:
                # Unknown mathematical symbol or not in our ranges - keep as-is
                result.append(char)
        else:
            # Regular character, keep as-is
            result.append(char)
    
    return ''.join(result)


async def extract_fb_content(url: str):
    """
    Extracts text, images, and video from a public Facebook post.
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
    if "facebook.com" not in url:
        content["error"] = "Invalid URL: Please provide a valid Facebook link."
        return content

    try:
        # 1. Extract Video using yt-dlp
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

        # 2. Extract Text and Images using Playwright
        print("DEBUG: Launching Playwright browser...")
        async with async_playwright() as p:
            browser = await p.chromium.launch(
                headless=True,
                args=["--disable-blink-features=AutomationControlled"]
            )
            context = await browser.new_context(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            )
            page = await context.new_page()
            
            print(f"DEBUG: Navigating to {url}...")
            try:
                await page.goto(url, wait_until="networkidle", timeout=60000)
            except Exception as e:
                print(f"DEBUG: Navigation timeout or error: {e}")
                await page.goto(url, wait_until="domcontentloaded")
            
            # Wait a bit for JS to execute
            await asyncio.sleep(5)
            
            current_url = page.url
            print(f"DEBUG: Final URL after navigation: {current_url}")
            
            # Removed early login check to prioritize content extraction

            # Find the main post container (Facebook's post structure)
            print("DEBUG: Searching for main post container...")
            post_container = await page.query_selector(
                'div[data-ad-comet-type="feed"][role="article"],'
                'div[role="article"],'
                'div[data-testid="post_container"]'
            )
            if not post_container:
                print("DEBUG: No post container found, trying generic main content...")
                post_container = await page.query_selector('div[role="main"]')
            
            if post_container:
                print("DEBUG: Post container found. Extracting text...")
                # Extract text from the post (not comments)
                text = await post_container.evaluate("""
                    el => {
                        // Find the post text section (usually before images)
                        // Look for divs with dir="auto" that contain substantial text (not just likes/comments)
                        const textCandidates = el.querySelectorAll('div[dir="auto"]');
                        
                        for (let elem of textCandidates) {
                            const text = elem.innerText.trim();
                            // Skip empty, very short, or likely metadata/comment text
                            if (text.length > 20 && !text.match(/^(Like|Comment|Share|replied|tagged|added|with|commented on|reacted)/i)) {
                                return text;
                            }
                        }
                        
                        // Fallback: try to get all text content from post
                        const allText = el.innerText.trim();
                        return allText.length > 20 ? allText : '';
                    }
                """)
                
                if text and len(text) > 10:
                    content["text"] = normalize_unicode_text(text)
                    print(f"DEBUG: Text found: {content['text'][:100]}...")
                else:
                    print("DEBUG: No substantial text found in post container")

            # Extract images from post container
            print("DEBUG: Searching for images...")
            try:
                if post_container:
                    # Get images within the post container specifically
                    images = await post_container.query_selector_all('img')
                else:
                    images = await page.query_selector_all('img')
                
                print(f"DEBUG: Found {len(images)} img elements on page")
                
                for i, img in enumerate(images):
                    src = await img.get_attribute('src')
                    alt = await img.get_attribute('alt') or ""
                    rect = await img.bounding_box()
                    
                    # Detailed filtering
                    if not src:
                        print(f"DEBUG: Image {i} has no src")
                        continue
                    
                    # Skip if not from Facebook CDN
                    if not ('scontent' in src or 'fbcdn' in src or 'fbcdn-photos' in src):
                        print(f"DEBUG: Image {i} not from Facebook CDN: {src[:50]}")
                        continue
                    
                    # Skip static assets and emojis
                    if 'static.facebook.com' in src or 'emoji' in src.lower():
                        print(f"DEBUG: Image {i} is static/emoji")
                        continue
                    
                    # Check dimensions (skip small avatars/icons)
                    if not rect:
                        print(f"DEBUG: Image {i} has no bounding box")
                        continue
                    
                    width = rect.get('width', 0)
                    height = rect.get('height', 0)
                    print(f"DEBUG: Image {i} dimensions: {width}x{height}, alt: {alt[:30]}")
                    
                    if width < 80 or height < 80:
                        print(f"DEBUG: Image {i} too small ({width}x{height}), skipping")
                        continue
                    
                    # Skip profile/avatar images (often square and small-ish)
                    if width == height and width < 150:
                        print(f"DEBUG: Image {i} is likely avatar (square {width}x{height})")
                        continue
                    
                    # If we got here, it's likely a real post image
                    print(f"DEBUG: Image {i} accepted: {width}x{height}")
                    content["images"].append(src)
                
                print(f"DEBUG: Final accepted images: {len(content['images'])}")
            except Exception as e:
                print(f"DEBUG: Image extraction error: {e}")

            # ONLY if no text AND no images were found, check for login redirect
            if not content["text"] and not content["images"]:
                if "facebook.com/login" in current_url or await page.query_selector('input[name="email"]'):
                    print("DEBUG: No content found AND login redirect detected. Post is private.")
                    content["error"] = "Private Post: This content is not public and cannot be downloaded."
                else:
                    print("DEBUG: No content found, but no login redirect. Post might be empty or layout changed.")
                    content["error"] = "Content not found: The post may be empty or the layout has changed."

            await browser.close()

    except Exception as e:
        print(f"DEBUG: Critical error during extraction: {e}")
        content["error"] = str(e)

    print(f"DEBUG: Extraction complete. Result: {content}")
    return content

    return content
