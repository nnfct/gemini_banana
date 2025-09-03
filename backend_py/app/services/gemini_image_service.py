from __future__ import annotations

import os
import time
from typing import Any, Dict, List, Optional


def _get_env(name: str, default: Optional[str] = None) -> Optional[str]:
    # Support both GEMINI_API_KEY and API_KEY for parity with Node code
    if name == "GEMINI_API_KEY":
        return os.getenv("GEMINI_API_KEY") or os.getenv("API_KEY") or default
    return os.getenv(name, default)


class GeminiImageService:
    """
    Google Gemini image generation (virtual try-on) for Python.

    - Prefers the new `google-genai` client (`from google import genai`).
    - Falls back to legacy `google.generativeai` if available.
    - If no client is available, `available()` returns False.

    Env vars:
      GEMINI_API_KEY or API_KEY
      GEMINI_MODEL (default: gemini-2.5-flash-image-preview)
      GEMINI_TIMEOUT_MS (default: 30000)
      GEMINI_MAX_RETRIES (default: 3)
    """

    def __init__(self) -> None:
        self.api_key: Optional[str] = _get_env("GEMINI_API_KEY")
        self.model: str = _get_env("GEMINI_MODEL", "gemini-2.5-flash-image-preview")  # noqa: E501
        self.timeout_ms: int = int(_get_env("GEMINI_TIMEOUT_MS", "30000") or 30000)
        self.max_retries: int = int(_get_env("GEMINI_MAX_RETRIES", "3") or 3)

        self._new_client = None  # type: ignore[var-annotated]
        self._legacy_model = None  # type: ignore[var-annotated]

        # Lazy import to avoid hard dependency during setup
        self._new_genai = None
        self._legacy_genai = None
        try:
            from google import genai as _new_genai  # type: ignore
            self._new_genai = _new_genai
        except Exception:
            self._new_genai = None
        try:
            import google.generativeai as _legacy_genai  # type: ignore
            self._legacy_genai = _legacy_genai
        except Exception:
            self._legacy_genai = None

    # ------------------------------- public API ------------------------------- #
    def available(self) -> bool:
        return bool(self.api_key and (self._new_genai or self._legacy_genai))

    def generate_virtual_try_on_image(self, person: Dict, clothing_items: Dict | None = None) -> Optional[str]:
        """
        Returns a data URI (e.g., 'data:image/png;base64,....') of the generated image
        or None if generation succeeded but no image was returned.
        Raises on configuration or API errors.
        """
        if not self.available():
            raise RuntimeError("Gemini service is not available (missing API key or client library)")

        if not person or not person.get("base64") or not person.get("mimeType"):
            raise ValueError("Person image requires base64 and mimeType")

        clothing_items = clothing_items or {}
        parts = self._build_parts(person, clothing_items)

        last_error: Optional[Exception] = None
        for attempt in range(1, self.max_retries + 1):
            try:
                if self._new_genai:
                    image_data_uri = self._call_new_genai(parts)
                else:
                    image_data_uri = self._call_legacy_genai(parts)

                return image_data_uri
            except Exception as e:  # noqa: BLE001 - we want to log/propagate
                last_error = e
                # Exponential backoff
                if attempt < self.max_retries:
                    time.sleep(2 ** attempt)

        # Exhausted retries
        assert last_error is not None
        raise last_error

    # ----------------------------- internal helpers --------------------------- #
    def _build_parts(self, person: Dict, clothing_items: Dict) -> List[Dict[str, Any]]:
        parts: List[Dict[str, Any]] = []

        # Safety/consistency directives first
        parts.append({
            "text": self._safety_directives()
        })

        # Person image
        parts.append({
            "inline_data": {
                "data": person["base64"],
                "mime_type": person.get("mimeType", "image/jpeg"),
            }
        })

        clothing_pieces: List[str] = []
        for key in ("top", "pants", "shoes"):
            item = clothing_items.get(key)
            if item and item.get("base64"):
                parts.append({
                    "inline_data": {
                        "data": item["base64"],
                        "mime_type": item.get("mimeType", "image/jpeg"),
                    }
                })
                clothing_pieces.append(f"the {key}")

        if not clothing_pieces:
            raise ValueError("At least one clothing item (top/pants/shoes) is required")

        # Prompt text
        parts.append({"text": self._prompt_text(clothing_pieces)})
        return parts

    def _call_new_genai(self, parts: List[Dict[str, Any]]) -> Optional[str]:
        # New client: from google import genai
        if not self._new_client:
            self._new_client = self._new_genai.Client(api_key=self.api_key)  # type: ignore[attr-defined]

        # The new API mirrors Node: models.generate_content
        # Note: field names are snake_case in Python
        resp = self._new_client.models.generate_content(
            model=self.model,
            contents={"parts": parts},
            config={
                "response_modalities": ["IMAGE", "TEXT"],
            },
            # request options are optional; timeout handled via retries/backoff
        )

        return self._extract_image_from_response(resp)

    def _call_legacy_genai(self, parts: List[Dict[str, Any]]) -> Optional[str]:
        # Legacy client: import google.generativeai as genai
        if not self._legacy_model:
            self._legacy_genai.configure(api_key=self.api_key)  # type: ignore[attr-defined]
            self._legacy_model = self._legacy_genai.GenerativeModel(self.model)  # type: ignore[attr-defined]

        # Convert to legacy-friendly inputs: list where inline_data -> dict with mime_type, data
        legacy_inputs: List[Any] = []
        for p in parts:
            if "text" in p:
                legacy_inputs.append(p["text"])  # plain string is accepted
            elif "inline_data" in p:
                legacy_inputs.append({
                    "mime_type": p["inline_data"].get("mime_type", "image/jpeg"),
                    "data": p["inline_data"].get("data"),
                })

        resp = self._legacy_model.generate_content(legacy_inputs)
        return self._extract_image_from_response(resp)

    @staticmethod
    def _extract_image_from_response(resp: Any) -> Optional[str]:
        # Try new/legacy response shapes defensively
        try:
            candidates = getattr(resp, "candidates", None) or resp.get("candidates")  # type: ignore[union-attr]
            if not candidates:
                return None
            content = getattr(candidates[0], "content", None) or candidates[0].get("content")
            if not content:
                return None
            parts = getattr(content, "parts", None) or content.get("parts")
            if not parts:
                return None
            for part in parts:
                # New client returns dict-like objects with inline_data
                inline = getattr(part, "inline_data", None) or part.get("inline_data")
                if inline and (inline.get("data") or getattr(inline, "data", None)):
                    data = inline.get("data") if isinstance(inline, dict) else getattr(inline, "data")
                    mime = inline.get("mime_type") if isinstance(inline, dict) else getattr(inline, "mime_type", "image/png")
                    return f"data:{mime};base64,{data}"
            return None
        except Exception:
            return None

    @staticmethod
    def _safety_directives() -> str:
        return "\n".join([
            "IMPORTANT SAFETY AND CONSISTENCY DIRECTIVES:",
            "- Do NOT alter the person's face, hair, body shape, or pose.",
            "- Preserve the exact facial identity (no beautification or smoothing).",
            "- Keep background and lighting consistent with the original person image.",
            "- Only composite the clothing onto the person realistically; no extra elements.",
            "- Output must be a single photorealistic image. No text or watermarks.",
        ])

    @staticmethod
    def _prompt_text(clothing_pieces: List[str]) -> str:
        items = ", ".join(clothing_pieces)
        return (
            "Analyze the first image (the person). Realistically place the clothing items from the "
            f"subsequent images onto this person. The final output must be the exact same person wearing: {items}. "
            "Preserve facial features, hair, body shape, and pose exactly; do not alter the person. Ensure natural fit "
            "and consistent lighting/shadows. Do not add any text or annotations."
        )


gemini_image_service = GeminiImageService()

