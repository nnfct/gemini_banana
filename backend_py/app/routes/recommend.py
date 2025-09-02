from datetime import datetime
from fastapi import APIRouter
from ..models import (
    RecommendationRequest,
    RecommendationFromFittingRequest,
    RecommendationResponse,
    CategoryRecommendations,
    RecommendationItem,
)


router = APIRouter(prefix="/api/recommend", tags=["Recommendations"])


def _mock_recommendations() -> CategoryRecommendations:
    # Minimal placeholder catalog results
    top = [
        RecommendationItem(id="top_001", title="Casual Cotton T-Shirt", price=25000, tags=["casual", "cotton", "basic"], category="top"),
    ]
    return CategoryRecommendations(top=top, pants=[], shoes=[], accessories=[])


@router.get("/status")
def status():
    return {
        "aiService": {
            "available": True,
            "config": {
                "deploymentId": "gpt-4-vision-preview",
                "timeout": 30000,
                "isConfigured": True,
            },
        },
        "catalogService": {
            "available": True,
            "productCount": 1,
        },
    }


@router.get("/catalog")
def catalog_stats():
    return {
        "totalProducts": 1,
        "categories": {"top": 1, "pants": 0, "shoes": 0, "accessories": 0},
        "priceRange": {"min": 25000, "max": 25000, "average": 25000},
    }


@router.post("")
def recommend_from_upload(req: RecommendationRequest) -> RecommendationResponse:
    recs = _mock_recommendations()
    return RecommendationResponse(
        recommendations=recs,
        analysisMethod="fallback",
        requestId=f"req_{int(datetime.utcnow().timestamp())}",
        timestamp=datetime.utcnow().isoformat() + "Z",
    )


@router.post("/from-fitting")
def recommend_from_fitting(req: RecommendationFromFittingRequest) -> RecommendationResponse:
    recs = _mock_recommendations()
    return RecommendationResponse(
        recommendations=recs,
        analysisMethod="fallback",
        requestId=f"req_{int(datetime.utcnow().timestamp())}",
        timestamp=datetime.utcnow().isoformat() + "Z",
    )

