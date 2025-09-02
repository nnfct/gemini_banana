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
from ..services.llm_ranker import llm_ranker


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

@router.get("/random")
def random_products(limit: int = 18, category: str | None = None):
    svc = get_catalog_service()
    products = svc.get_all()
    if category in {"top", "pants", "shoes", "accessories"}:
        products = [p for p in products if p.get("category") == category]

    import random
    random.shuffle(products)
    result = []
    for p in products[: min(max(limit, 1), 100)]:
        item = {
            "id": str(p.get("id")),
            "title": p.get("title") or "",
            "price": int(p.get("price") or 0),
            "imageUrl": p.get("imageUrl"),
            "productUrl": p.get("productUrl"),
            "tags": p.get("tags") or [],
            "category": p.get("category") or "top",
        }
        result.append(item)
    return result


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
    # get more candidates for potential LLM rerank
    candidate_recs = svc.find_similar(
        analysis,
        max_per_category=(opts.maxPerCategory or 3) * 4 if hasattr(opts, "maxPerCategory") else 12,
        include_score=True,
        min_price=getattr(opts, "minPrice", None),
        max_price=getattr(opts, "maxPrice", None),
        exclude_tags=getattr(opts, "excludeTags", None),
    )

    # Optional LLM rerank
    max_k = (opts.maxPerCategory or 3) if hasattr(opts, "maxPerCategory") else 3
    use_llm = getattr(opts, "useLLMRerank", False)
    if use_llm and llm_ranker.available():
        ids = llm_ranker.rerank(analysis, candidate_recs, top_k=max_k)
        if ids:
            # reorder by ids
            recs = {cat: [] for cat in candidate_recs.keys()}
            for cat in candidate_recs.keys():
                # map id->item
                idx = {str(p["id"]): p for p in candidate_recs[cat]}
                for _id in ids.get(cat, []):
                    if _id in idx:
                        recs[cat].append(idx[_id])
            # fill if not enough
            for cat in recs.keys():
                if len(recs[cat]) < max_k:
                    for p in candidate_recs[cat]:
                        if p not in recs[cat]:
                            recs[cat].append(p)
                        if len(recs[cat]) >= max_k:
                            break
        else:
            recs = {cat: (candidate_recs[cat][:max_k]) for cat in candidate_recs.keys()}
    else:
        recs = {cat: (candidate_recs[cat][:max_k]) for cat in candidate_recs.keys()}

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
    candidate_recs = svc.find_similar(
        analysis,
        max_per_category=(opts.maxPerCategory or 3) * 4 if hasattr(opts, "maxPerCategory") else 12,
        include_score=True,
        min_price=getattr(opts, "minPrice", None),
        max_price=getattr(opts, "maxPrice", None),
        exclude_tags=getattr(opts, "excludeTags", None),
    )

    max_k = (opts.maxPerCategory or 3) if hasattr(opts, "maxPerCategory") else 3
    use_llm = getattr(opts, "useLLMRerank", False)
    if use_llm and llm_ranker.available():
        ids = llm_ranker.rerank(analysis, candidate_recs, top_k=max_k)
        if ids:
            recs = {cat: [] for cat in candidate_recs.keys()}
            for cat in candidate_recs.keys():
                idx = {str(p["id"]): p for p in candidate_recs[cat]}
                for _id in ids.get(cat, []):
                    if _id in idx:
                        recs[cat].append(idx[_id])
                for p in candidate_recs[cat]:
                    if len(recs[cat]) >= max_k:
                        break
                    if p not in recs[cat]:
                        recs[cat].append(p)
        else:
            recs = {cat: (candidate_recs[cat][:max_k]) for cat in candidate_recs.keys()}
    else:
        recs = {cat: (candidate_recs[cat][:max_k]) for cat in candidate_recs.keys()}

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
