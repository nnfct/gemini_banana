from datetime import datetime
from fastapi import APIRouter
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
    # Stub: return a tiny transparent PNG data URI
    placeholder = (
        "data:image/png;base64,"
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAAWgmWQ0AAAAASUVORK5CYII="
    )
    return VirtualTryOnResponse(
        generatedImage=placeholder,
        requestId=f"req_{int(datetime.utcnow().timestamp())}",
        timestamp=datetime.utcnow().isoformat() + "Z",
    )

