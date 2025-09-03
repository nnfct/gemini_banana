from datetime import datetime
import os
import httpx
from fastapi import APIRouter, HTTPException
from ..models import VirtualTryOnRequest, VirtualTryOnResponse
from ..services.gemini_image_service import gemini_image_service


router = APIRouter(prefix="/api/generate", tags=["VirtualTryOn"])


@router.get("/status")
def status():
    proxy_target = os.getenv("GENERATE_PROXY_TARGET")
    return {
        "available": True,
        "pythonGemini": {
            "available": gemini_image_service.available(),
            "model": os.getenv("GEMINI_MODEL", "gemini-2.5-flash-image-preview"),
        },
        "proxy": {
            "target": proxy_target,
            "enabled": bool(proxy_target),
        },
        "config": {
            "timeout": int(os.getenv("GEMINI_TIMEOUT_MS", "30000")),
            "maxRetries": int(os.getenv("GEMINI_MAX_RETRIES", "3")),
        },
    }


@router.post("")
def generate(req: VirtualTryOnRequest) -> VirtualTryOnResponse:
    # Option A: Use native Python Gemini service if available
    if gemini_image_service.available():
        try:
            result = gemini_image_service.generate_virtual_try_on_image(
                person=req.person.model_dump(),
                clothing_items=(req.clothingItems.model_dump() if req.clothingItems else {}),
            )
            if not result:
                raise HTTPException(status_code=502, detail="Gemini response contained no image")
            return VirtualTryOnResponse(
                generatedImage=result,
                requestId=f"req_{int(datetime.utcnow().timestamp())}",
                timestamp=datetime.utcnow().isoformat() + "Z",
            )
        except HTTPException:
            raise
        except Exception as e:
            # fall through to proxy or placeholder
            print(f"[generate] Python Gemini error: {e}")

    # Option B: Proxy to existing Node backend if configured (recommended during migration)
    proxy_target = os.getenv("GENERATE_PROXY_TARGET")
    if proxy_target:
        try:
            url = proxy_target.rstrip("/") + "/api/generate"
            resp = httpx.post(url, json=req.model_dump(), timeout=60)
            resp.raise_for_status()
            data = resp.json()
            if not data.get("generatedImage"):
                raise HTTPException(status_code=502, detail="Proxy responded without generatedImage")
            return VirtualTryOnResponse(
                generatedImage=data["generatedImage"],
                requestId=data.get("requestId"),
                timestamp=data.get("timestamp") or datetime.utcnow().isoformat() + "Z",
            )
        except httpx.HTTPError as e:
            raise HTTPException(status_code=502, detail=f"Proxy error: {str(e)}")

    # Option C: Stub fallback
    placeholder = (
        "data:image/png;base64,"
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAAWgmWQ0AAAAASUVORK5CYII="
    )
    return VirtualTryOnResponse(
        generatedImage=placeholder,
        requestId=f"req_{int(datetime.utcnow().timestamp())}",
        timestamp=datetime.utcnow().isoformat() + "Z",
    )
