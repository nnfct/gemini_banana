from datetime import datetime
import os
import httpx
from fastapi import APIRouter, HTTPException
from ..models import VirtualTryOnRequest, VirtualTryOnResponse


router = APIRouter(prefix="/api/generate", tags=["VirtualTryOn"])


@router.get("/status")
def status():
    return {
        "available": True,
        "config": {
            "model": "gemini-2.5-flash-image-preview",
            "timeout": 30000,
            "maxRetries": 3,
            "isConfigured": True,
        },
    }


@router.post("")
def generate(req: VirtualTryOnRequest) -> VirtualTryOnResponse:
    # Option 1: Proxy to existing Node backend if configured (recommended during migration)
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

    # Option 2: Stub fallback (until native Python generation is implemented)
    placeholder = (
        "data:image/png;base64,"
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAAWgmWQ0AAAAASUVORK5CYII="
    )
    return VirtualTryOnResponse(
        generatedImage=placeholder,
        requestId=f"req_{int(datetime.utcnow().timestamp())}",
        timestamp=datetime.utcnow().isoformat() + "Z",
    )
