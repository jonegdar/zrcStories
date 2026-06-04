import asyncio
from playwright.async_api import async_playwright
import yt_dlp

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

            # Try multiple selectors for text
            print("DEBUG: Searching for post text...")
            text_selectors = [
                '[data-ad-preview="message"]',
                'div[role="main"]',
                'div[data-ad-comet-preview="message"]',
                'div[dir="auto"]',
                'span[dir="auto"]'
            ]
            
            for selector in text_selectors:
                element = await page.query_selector(selector)
                if element:
                    # Advanced evaluation to mirror exact visual block formatting
                    text = await element.evaluate("""
                        el => {
                            // 1. Clone to avoid mutating the live page
                            const clone = el.cloneNode(true);
                            
                            // 2. Convert image-emojis to text first
                            const imgs = clone.querySelectorAll('img');
                            imgs.forEach(img => {
                                if (img.alt && img.alt.length < 20) {
                                    const span = document.createElement('span');
                                    span.innerText = img.alt;
                                    img.parentNode.replaceChild(span, img);
                                }
                            });

                            // 3. Block-aware extraction
                            // We iterate through children to preserve paragraph breaks
                            const blocks = [];
                            const children = clone.childNodes;
                            
                            children.forEach(child => {
                                if (child.nodeType === Node.TEXT_NODE) {
                                    const txt = child.textContent.trim();
                                    if (txt) blocks.push(txt);
                                } else if (child.nodeType === Node.ELEMENT_NODE) {
                                    const txt = child.innerText.trim();
                                    if (txt) blocks.push(txt);
                                }
                            });

                            // Join blocks with double newlines to mirror the visual spacing
                            return blocks.join('\\n\\n').trim();
                        }
                    """)
                    if text and len(text) > 5:
                        content["text"] = text
                        print(f"DEBUG: Text found using selector {selector}")
                        break

            # Extract images
            print("DEBUG: Searching for images...")
            try:
                # Look for images that are likely part of the post
                images = await page.query_selector_all('img')
                for img in images:
                    src = await img.get_attribute('src')
                    if src and ('scontent' in src or 'fbcdn' in src):
                        # Avoid small icons/avatars and emojis
                        if 'static.facebook.com' not in src:
                            # Check image dimensions to filter out emojis
                            rect = await img.bounding_box()
                            if rect and rect['width'] > 50 and rect['height'] > 50:
                                content["images"].append(src)
                print(f"DEBUG: Found {len(content['images'])} images.")
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
