from __future__ import annotations

import json
import os
from typing import Dict, List, Optional
import httpx

try:
    from openai import OpenAI  # type: ignore
except Exception:
    OpenAI = None  # type: ignore


class LLMRanker:
    def __init__(self) -> None:
        self.endpoint = os.getenv("AZURE_OPENAI_ENDPOINT")
        self.api_key = os.getenv("AZURE_OPENAI_KEY")
        self.deployment_id = os.getenv("AZURE_OPENAI_DEPLOYMENT_ID", "gpt-4o")
        self.api_version = os.getenv("AZURE_OPENAI_API_VERSION", "2024-02-15-preview")
        self.max_tokens = int(os.getenv("LLM_RERANK_MAX_TOKENS", "400"))
        self.temperature = float(os.getenv("LLM_RERANK_TEMPERATURE", "0.2"))

        self.client: Optional[OpenAI] = None
        self._http_fallback: bool = False
        if self.endpoint and self.api_key:
            if OpenAI is not None:
                try:
                    # Azure OpenAI compatible client
                    self.client = OpenAI(
                        api_key=self.api_key,
                        base_url=f"{self.endpoint}/openai/deployments/{self.deployment_id}",
                        default_query={"api-version": self.api_version},
                        default_headers={"api-key": self.api_key},
                    )
                except Exception:
                    self.client = None
                    self._http_fallback = True
            else:
                self._http_fallback = True

    def available(self) -> bool:
        return (self.client is not None) or self._http_fallback

    def rerank(self, analysis: Dict, candidates: Dict[str, List[Dict]], top_k: int = 3) -> Optional[Dict[str, List[str]]]:
        """
        Ask LLM to choose top_k item ids per category.
        candidates[category] = [{id,title,tags,price}, ...]
        Returns dict of category -> list of ids selected by LLM, or None on failure.
        """
        if not self.available():
            return None

        def fmt_items(items: List[Dict]) -> str:
            # Keep it short, but expose color/fit to the LLM explicitly
            COLOR_WORDS = {
                # EN
                "black", "white", "gray", "grey", "navy", "blue", "light blue", "sky",
                "red", "pink", "purple", "violet", "green", "olive", "khaki",
                "yellow", "beige", "brown", "cream", "ivory", "orange",
                # KO
                "블랙", "화이트", "회색", "그레이", "네이비", "파랑", "블루", "라이트 블루", "하늘", "하늘색",
                "빨강", "레드", "핑크", "보라", "퍼플", "초록", "그린", "올리브", "카키",
                "노랑", "옐로", "베이지", "브라운", "갈색", "크림", "아이보리", "오렌지", "주황",
            }
            FIT_WORDS = {
                # EN
                "slim", "regular", "relaxed", "oversized", "loose", "wide", "tapered",
                "straight", "bootcut", "flare", "baggy", "skinny",
                # KO
                "슬림", "레귤러", "릴렉스", "릴렉스드", "오버사이즈", "루즈", "와이드", "테이퍼드",
                "스트레이트", "부츠컷", "플레어", "배기", "스키니",
            }
            rows = []
            for it in items[: 20]:
                tags = list(it.get("tags") or [])
                colors = [t for t in tags if t and t.lower() in COLOR_WORDS]
                fit = [t for t in tags if t and t.lower() in FIT_WORDS]
                rows.append({
                    "id": str(it.get("id")),
                    "title": (it.get("title", "") or "")[:120],
                    "price": int(it.get("price", 0)),
                    "colors": colors[:3],
                    "fit": fit[:3],
                    "tags": tags[:8],
                })
            return json.dumps(rows, ensure_ascii=False)

        prompt = (
            "You are a fashion recommendation assistant. Prioritize COLOR and SHAPE/FIT matching.\n"
            "Ranking rules (in order):\n"
            "1) Color match: prefer items whose colors overlap with analysis.colors or analysis.dominantColors.\n"
            "2) Shape/Fit: prefer items whose fit (e.g., slim/straight/wide/oversized/etc.) matches the analysis.\n"
            "3) Style/Category: align with detected styles/categories; avoid obviously mismatched categories.\n"
            "4) If tie: prefer reasonable price and diversity across items.\n\n"
            "Return ONLY JSON with keys top, pants, shoes, accessories. Each value is a list of item id strings (max {k})."
        ).format(k=top_k)
        style_json = json.dumps(analysis or {}, ensure_ascii=False)
        cats_payload = {
            cat: fmt_items(items) for cat, items in candidates.items()
        }

        content = [
            {"type": "text", "text": prompt},
            {"type": "text", "text": f"STYLE_ANALYSIS:\n{style_json}"},
        ]
        for cat, payload in cats_payload.items():
            content.append({"type": "text", "text": f"CANDIDATES_{cat.upper()}:\n{payload}"})

        try:
            if self.client is not None:
                resp = self.client.chat.completions.create(
                    model=self.deployment_id,
                    messages=[{"role": "user", "content": content}],
                    temperature=self.temperature,
                    max_tokens=self.max_tokens,
                )
                text = resp.choices[0].message.content or ""
            else:
                # HTTP fallback to Azure Chat Completions
                url = f"{self.endpoint}/openai/deployments/{self.deployment_id}/chat/completions"
                params = {"api-version": self.api_version}
                headers = {"api-key": self.api_key or "", "content-type": "application/json"}
                payload = {"messages": [{"role": "user", "content": content}], "temperature": self.temperature, "max_tokens": self.max_tokens}
                with httpx.Client(timeout=30.0) as client:
                    r = client.post(url, params=params, headers=headers, json=payload)
                    r.raise_for_status()
                    data_http = r.json()
                    text = (data_http.get("choices") or [{}])[0].get("message", {}).get("content", "")

            json_part = (text if text.strip().startswith("{") else (text.split("```json")[-1].split("```")[0] if "```" in text else text)).strip()
            data = json.loads(json_part)
            # normalize ids to strings
            out = {}
            for cat in ("top", "pants", "shoes", "accessories"):
                ids = data.get(cat) or []
                out[cat] = [str(x) for x in ids][:top_k]
            return out
        except Exception as e:
            print("[LLMRanker] rerank failed:", e)
            return None


llm_ranker = LLMRanker()
