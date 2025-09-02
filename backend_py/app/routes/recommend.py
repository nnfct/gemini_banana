from datetime import datetime
from fastapi import APIRouter
from ..models import (
    RecommendationRequest,
    RecommendationFromFittingRequest,
    RecommendationResponse,
    CategoryRecommendations,
    RecommendationItem,
)
from ..services.catalog import get_catalog_service


router = APIRouter(prefix="/api/recommend", tags=["Recommendations"])


@router.get("/status")
def status():
    stats = get_catalog_service().stats()
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
            "available": stats.get("totalProducts", 0) > 0,
            "productCount": stats.get("totalProducts", 0),
        },
    }


@router.get("/catalog")
def catalog_stats():
    return get_catalog_service().stats()


@router.post("")
def recommend_from_upload(req: RecommendationRequest) -> RecommendationResponse:
    # Build analysis keywords from request (fallback style)
    analysis = {}
    # Minimal fallback keywords
    if req.person:
        analysis["overall_style"] = ["casual", "everyday"]
    if req.clothingItems:
        for k in ("top", "pants", "shoes"):
            if getattr(req.clothingItems, k) is not None:
                analysis.setdefault(k, []).extend([k, "basic", "casual"])

    svc = get_catalog_service()
    opts = req.options or {}
    recs = svc.find_similar(
        analysis,
        max_per_category=(opts.maxPerCategory or 3) if hasattr(opts, "maxPerCategory") else 3,
        include_score=True,
        min_price=getattr(opts, "minPrice", None),
        max_price=getattr(opts, "maxPrice", None),
        exclude_tags=getattr(opts, "excludeTags", None),
    )

    # Convert lists of dicts to CategoryRecommendations model
    as_model = CategoryRecommendations(
        top=[RecommendationItem(**p) for p in recs.get("top", [])],
        pants=[RecommendationItem(**p) for p in recs.get("pants", [])],
        shoes=[RecommendationItem(**p) for p in recs.get("shoes", [])],
        accessories=[RecommendationItem(**p) for p in recs.get("accessories", [])],
    )

    return RecommendationResponse(
        recommendations=as_model,
        analysisMethod="fallback",
        requestId=f"req_{int(datetime.utcnow().timestamp())}",
        timestamp=datetime.utcnow().isoformat() + "Z",
    )


@router.post("/from-fitting")
def recommend_from_fitting(req: RecommendationFromFittingRequest) -> RecommendationResponse:
    # For fitting, seed analysis with overall style + categories
    analysis = {"overall_style": ["casual", "relaxed"], "categories": ["top", "pants", "shoes"]}
    svc = get_catalog_service()
    opts = req.options or {}
    recs = svc.find_similar(
        analysis,
        max_per_category=(opts.maxPerCategory or 3) if hasattr(opts, "maxPerCategory") else 3,
        include_score=True,
        min_price=getattr(opts, "minPrice", None),
        max_price=getattr(opts, "maxPrice", None),
        exclude_tags=getattr(opts, "excludeTags", None),
    )

    as_model = CategoryRecommendations(
        top=[RecommendationItem(**p) for p in recs.get("top", [])],
        pants=[RecommendationItem(**p) for p in recs.get("pants", [])],
        shoes=[RecommendationItem(**p) for p in recs.get("shoes", [])],
        accessories=[RecommendationItem(**p) for p in recs.get("accessories", [])],
    )

    return RecommendationResponse(
        recommendations=as_model,
        analysisMethod="fallback",
        requestId=f"req_{int(datetime.utcnow().timestamp())}",
        timestamp=datetime.utcnow().isoformat() + "Z",
    )
