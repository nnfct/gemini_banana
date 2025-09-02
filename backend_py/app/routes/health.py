from fastapi import APIRouter
from datetime import datetime
from ..settings import settings


router = APIRouter()


@router.get("/health")
def health():
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "environment": settings.NODE_ENV,
        "version": "1.0.0",
    }

