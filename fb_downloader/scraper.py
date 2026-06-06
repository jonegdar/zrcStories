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
    
    # Comprehensive mapping of mathematical alphanumeric symbols to ASCII
    result = []
    
    for char in text:
        code = ord(char)
        
        # Mathematical Alphanumeric Symbols block (U+1D400-U+1D7FF)
        if 0x1D400 <= code <= 0x1D7FF:
            mapped = None
            
            # Bold uppercase A-Z (U+1D400-U+1D419)
            if 0x1D400 <= code <= 0x1D419:
                mapped = chr(ord('A') + (code - 0x1D400))
            # Bold lowercase a-z (U+1D41A-U+1D433)
            elif 0x1D41A <= code <= 0x1D433:
                mapped = chr(ord('a') + (code - 0x1D41A))
            # Bold digits 0-9 (U+1D7CE-U+1D7D7)
            elif 0x1D7CE <= code <= 0x1D7D7:
                mapped = chr(ord('0') + (code - 0x1D7CE))
            # Italic uppercase A-Z (U+1D434-U+1D44D)
            elif 0x1D434 <= code <= 0x1D44D:
                mapped = chr(ord('A') + (code - 0x1D434))
            # Italic lowercase a-z (U+1D44E-U+1D467)
            elif 0x1D44E <= code <= 0x1D467:
                mapped = chr(ord('a') + (code - 0x1D44E))
            # Italic digits 0-9 (U+1D7D8-U+1D7E1)
            elif 0x1D7D8 <= code <= 0x1D7E1:
                mapped = chr(ord('0') + (code - 0x1D7D8))
            # Bold italic uppercase A-Z (U+1D468-U+1D481)
            elif 0x1D468 <= code <= 0x1D481:
                mapped = chr(ord('A') + (code - 0x1D468))
            # Bold italic lowercase a-z (U+1D482-U+1D49B)
            elif 0x1D482 <= code <= 0x1D49B:
                mapped = chr(ord('a') + (code - 0x1D482))
            # Script uppercase A-Z (U+1D49C-U+1D4B5) 
            elif 0x1D49C <= code <= 0x1D4B5:
                mapped = chr(ord('A') + (code - 0x1D49C))
            # Script lowercase a-z (U+1D4B6-U+1D4CF)
            elif 0x1D4B6 <= code <= 0x1D4CF:
                mapped = chr(ord('a') + (code - 0x1D4B6))
            # Bold Script uppercase A-Z (U+1D4D0-U+1D4E9)
            elif 0x1D4D0 <= code <= 0x1D4E9:
                mapped = chr(ord('A') + (code - 0x1D4D0))
            # Bold Script lowercase a-z (U+1D4EA-U+1D503)
            elif 0x1D4EA <= code <= 0x1D503:
                mapped = chr(ord('a') + (code - 0x1D4EA))
            # Fraktur uppercase A-Z (U+1D504-U+1D51D)
            elif 0x1D504 <= code <= 0x1D51D:
                mapped = chr(ord('A') + (code - 0x1D504))
            # Fraktur lowercase a-z (U+1D51E-U+1D537)
            elif 0x1D51E <= code <= 0x1D537:
                mapped = chr(ord('a') + (code - 0x1D51E))
            # Double-struck uppercase A-Z (U+1D538-U+1D551)
            elif 0x1D538 <= code <= 0x1D551:
                mapped = chr(ord('A') + (code - 0x1D538))
            # Double-struck lowercase a-z (U+1D552-U+1D56B)
            elif 0x1D552 <= code <= 0x1D56B:
                mapped = chr(ord('a') + (code - 0x1D552))
            # Sans-serif uppercase A-Z (U+1D5A0-U+1D5B9)
            elif 0x1D5A0 <= code <= 0x1D5B9:
                mapped = chr(ord('A') + (code - 0x1D5A0))
            # Sans-serif lowercase a-z (U+1D5BA-U+1D5D3)
            elif 0x1D5BA <= code <= 0x1D5D3:
                mapped = chr(ord('a') + (code - 0x1D5BA))
            # Sans-serif bold uppercase A-Z (U+1D5D4-U+1D5ED)
            elif 0x1D5D4 <= code <= 0x1D5ED:
                mapped = chr(ord('A') + (code - 0x1D5D4))
            # Sans-serif bold lowercase a-z (U+1D5EE-U+1D607)
            elif 0x1D5EE <= code <= 0x1D607:
                mapped = chr(ord('a') + (code - 0x1D5EE))
            # Sans-serif italic uppercase A-Z (U+1D608-U+1D621)
            elif 0x1D608 <= code <= 0x1D621:
                mapped = chr(ord('A') + (code - 0x1D608))
            # Sans-serif italic lowercase a-z (U+1D622-U+1D63B)
            elif 0x1D622 <= code <= 0x1D63B:
                mapped = chr(ord('a') + (code - 0x1D622))
            # Sans-serif bold italic uppercase A-Z (U+1D63C-U+1D655)
            elif 0x1D63C <= code <= 0x1D655:
                mapped = chr(ord('A') + (code - 0x1D63C))
            # Sans-serif bold italic lowercase a-z (U+1D656-U+1D66F)
            elif 0x1D656 <= code <= 0x1D66F:
                mapped = chr(ord('a') + (code - 0x1D656))
            # Monospace uppercase A-Z (U+1D670-U+1D689)
            elif 0x1D670 <= code <= 0x1D689:
                mapped = chr(ord('A') + (code - 0x1D670))
            # Monospace lowercase a-z (U+1D68A-U+1D6A3)
            elif 0x1D68A <= code <= 0x1D6A3:
                mapped = chr(ord('a') + (code - 0x1D68A))
            # Bold italic digits 0-9 (U+1D7E2-U+1D7EB)
            elif 0x1D7E2 <= code <= 0x1D7EB:
                mapped = chr(ord('0') + (code - 0x1D7E2))
            # Sans-serif digits 0-9 (U+1D7F6-U+1D7FF)
            elif 0x1D7F6 <= code <= 0x1D7FF:
                mapped = chr(ord('0') + (code - 0x1D7F6))
            
            if mapped:
                result.append(mapped)
            else:
                # Character is in the block but not in our ranges - keep original
                result.append(char)
        else:
            # Not a mathematical symbol - keep as-is
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
                args=[
                    "--disable-blink-features=AutomationControlled",
                    "--disable-dev-shm-usage",
                    "--no-first-run",
                    "--no-default-browser-check",
                ]
            )
            context = await browser.new_context(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            )
            
            # Add stealth JS to hide automation
            await context.add_init_script("""
                Object.defineProperty(navigator, 'webdriver', {
                    get: () => false,
                });
                Object.defineProperty(navigator, 'plugins', {
                    get: () => [1, 2, 3, 4, 5],
                });
            """)
            
            page = await context.new_page()
            
            # Check for login page FIRST
            print("DEBUG: Checking if URL redirects to login...")
            
            print(f"DEBUG: Navigating to {url}...")
            try:
                await page.goto(url, wait_until="networkidle", timeout=60000)
            except Exception as e:
                print(f"DEBUG: Navigation timeout or error: {e}")
                await page.goto(url, wait_until="domcontentloaded")
            
            # Wait for JS to execute
            await asyncio.sleep(3)
            
            current_url = page.url
            print(f"DEBUG: Final URL after navigation: {current_url}")
            
            # Check if we got redirected to login page (URL contains login)
            # We remove the immediate return here to allow the scraper to try and find content anyway,
            # as some public posts might still have 'login' in the URL or cause a temporary redirect.
            if "login" in current_url or "/login.php" in current_url:
                print("DEBUG: URL contains login markers, but proceeding to attempt extraction...")

            # Find the main post container
            print("DEBUG: Searching for post content...")
            
            # Facebook post structure: article > div > div > [post content]
            post_container = await page.query_selector('article')
            if post_container:
                print("DEBUG: Found post in article tag")
            else:
                print("DEBUG: No article tag found, trying div[role='article']...")
                post_container = await page.query_selector('div[role="article"]')
            
            if not post_container:
                print("DEBUG: Trying div[role='main']...")
                post_container = await page.query_selector('div[role="main"]')
            
            if post_container:
                # Extract text from the post container
                print("DEBUG: Extracting text from post...")
                text = await post_container.evaluate("""
                    el => {
                        // Try innerText first (returns rendered text)
                        let text = el.innerText?.trim() || '';
                        
                        // If innerText is empty or very short, try textContent
                        if (!text || text.length < 20) {
                            text = el.textContent?.trim() || '';
                        }
                        
                        // Split and take only paragraphs with substantial content
                        const lines = text.split('\\n').filter(l => l.trim().length > 0);
                        const substantialLines = [];
                        
                        for (let line of lines) {
                            // Skip action buttons
                            if (line.match(/^(Like|Love|Haha|Wow|Sad|Angry|Comment|Share|Message)$/i)) {
                                continue;
                            }
                            // Skip very short lines (likely nav/buttons)
                            if (line.length < 5) {
                                continue;
                            }
                            substantialLines.push(line);
                        }
                        
                        return substantialLines.join('\\n').trim();
                    }
                """)
                
                # Validate that we got actual post content, not login/nav text
                if text and len(text) > 10:
                    # Check if text looks like login page content
                    if "Русский" in text or "Зарегистрироваться" in text or "facebook.com/login" in text:
                        print("DEBUG: Extracted text appears to be from login page, rejecting...")
                        text = ""
                    else:
                        content["text"] = normalize_unicode_text(text)
                        print(f"DEBUG: Text extracted ({len(content['text'])} chars)")
                else:
                    print("DEBUG: No substantial text found in post")

            # Extract images
            print("DEBUG: Searching for images in post...")
            try:
                if post_container:
                    images = await post_container.query_selector_all('img')
                else:
                    images = await page.query_selector_all('img')
                
                print(f"DEBUG: Found {len(images)} img elements")
                
                seen_src = set()  # Avoid duplicates
                
                for i, img in enumerate(images):
                    src = await img.get_attribute('src')
                    alt = await img.get_attribute('alt') or ""
                    rect = await img.bounding_box()
                    
                    if not src or src in seen_src:
                        continue
                    
                    seen_src.add(src)
                    
                    # Must be from Facebook CDN
                    if not any(domain in src for domain in ['scontent', 'fbcdn', 'fbcdn-photos', 'facebook.com']):
                        print(f"DEBUG: Image {i} not from Facebook CDN")
                        continue
                    
                    # Skip static assets and tracking pixels
                    if 'static.facebook.com' in src or 'emoji' in src.lower() or src.endswith('.gif'):
                        print(f"DEBUG: Image {i} is static/emoji/tracking")
                        continue
                    
                    # Check dimensions
                    if not rect:
                        continue
                    
                    width = rect.get('width', 0)
                    height = rect.get('height', 0)
                    
                    if width < 100 or height < 100:
                        print(f"DEBUG: Image {i} too small ({width}x{height})")
                        continue
                    
                    # Skip profile pics (square, small)
                    if width == height and width < 150:
                        print(f"DEBUG: Image {i} is likely avatar")
                        continue
                    
                    print(f"DEBUG: Image {i} accepted ({width}x{height})")
                    content["images"].append(src)
                
                print(f"DEBUG: Total accepted images: {len(content['images'])}")
            except Exception as e:
                print(f"DEBUG: Image extraction error: {e}")

            # Final validation
            if not content["text"] and not content["images"] and not content["video"]:
                if "facebook.com/login" in current_url:
                    content["error"] = "Private Post: This content is not public and cannot be downloaded."
                else:
                    content["error"] = "Content not found: The post may be empty or require login to view."

            await browser.close()

    except Exception as e:
        print(f"DEBUG: Critical error during extraction: {e}")
        content["error"] = str(e)

    print(f"DEBUG: Extraction complete. Text length: {len(content['text'])}, Images: {len(content['images'])}, Video: {bool(content['video'])}")
    return content
