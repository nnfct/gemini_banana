from fastapi import APIRouter, HTTPException, Query
import httpx
import base64
from urllib.parse import urlparse

router = APIRouter(prefix="/api/proxy", tags=["Proxy"])


@router.get("/image")
def proxy_image(url: str = Query(..., description="Absolute http(s) image URL")):
    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"}:
        raise HTTPException(status_code=400, detail="Only http(s) URLs are allowed")

    try:
        # Reasonable timeout and size control
        with httpx.Client(timeout=15.0, follow_redirects=True) as client:
            resp = client.get(url)
            resp.raise_for_status()
            content_type = resp.headers.get("content-type", "application/octet-stream").split(";")[0].strip().lower()
            if not content_type.startswith("image/"):
                # Try to guess from URL extension; otherwise block
                raise HTTPException(status_code=415, detail=f"URL is not an image (Content-Type: {content_type})")

            raw = resp.content
            b64 = base64.b64encode(raw).decode("ascii")
            return {"base64": b64, "mimeType": content_type}
    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"Fetch failed: {str(e)}")

