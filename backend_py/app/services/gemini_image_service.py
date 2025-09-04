from __future__ import annotations

import os
import base64
import time
from typing import Any, Dict, List, Optional


def _get_env(name: str, default: str | None = None) -> str:
    # Support both GEMINI_API_KEY and API_KEY for parity with Node code
    if name == "GEMINI_API_KEY":
        return (os.getenv("GEMINI_API_KEY") or os.getenv("API_KEY") or (default or ""))
    # Standard env with fallback to default or empty string
    return os.getenv(name) or (default or "")


class GeminiImageService:
    """
    Google Gemini image generation (virtual try-on) for Python.

    - Prefers the new `google-genai` client (`from google import genai`).
    - Falls back to legacy `google.generativeai` if available.
    - If no client is available, `available()` returns False.

    Env vars:
      GEMINI_API_KEY or API_KEY
      GEMINI_API_KEYS (optional, comma/semicolon/space-separated)
      GEMINI_MODEL (default: gemini-2.5-flash-image-preview)
      GEMINI_TIMEOUT_MS (default: 30000)
      GEMINI_MAX_RETRIES (default: 3)
      GEMINI_TEMPERATURE (default: 0.0)
    """

    def __init__(self) -> None:
        # Support multiple keys via GEMINI_API_KEYS (comma/semicolon/space-separated)
        multi = _get_env("GEMINI_API_KEYS")
        if multi:
            toks = [t.strip() for t in str(multi).replace(";", ",").replace(" ", ",").split(",") if t and t.strip()]
            self.api_keys: List[str] = toks
        else:
            single = _get_env("GEMINI_API_KEY")
            if single:
                self.api_keys = [single]
            else:
                alt = _get_env("API_KEY")
                self.api_keys = [alt] if alt else []

        # Keep the first key as current for status reporting
        self.api_key: Optional[str] = self.api_keys[0] if self.api_keys else None
        self.model: str = _get_env("GEMINI_MODEL", "gemini-2.5-flash-image-preview")  # noqa: E501
        self.timeout_ms: int = int(_get_env("GEMINI_TIMEOUT_MS", "30000") or 30000)
        self.max_retries: int = int(_get_env("GEMINI_MAX_RETRIES", "3") or 3)
        # Unified temperature: single source of truth
        self.temperature: float = float(_get_env("GEMINI_TEMPERATURE", "0.0") or 0.0)

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
        return bool(self.api_keys and (self._new_genai or self._legacy_genai))

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
        # Iterate keys with per-key retries
        for key in self.api_keys:
            for attempt in range(1, self.max_retries + 1):
                try:
                    if self._new_genai:
                        image_data_uri = self._call_new_genai(parts, key)
                    else:
                        image_data_uri = self._call_legacy_genai(parts, key)
                    return image_data_uri
                except Exception as e:  # noqa: BLE001
                    last_error = e
                    # If this looks like an invalid API key, try next key immediately
                    msg = str(e).lower()
                    if "api key not valid" in msg or "api_key_invalid" in msg or "invalid api key" in msg:
                        break  # move to next key
                    if attempt < self.max_retries:
                        time.sleep(2 ** attempt)
            # next key
        # Exhausted keys / retries
        assert last_error is not None
        raise last_error

    # ----------------------------- internal helpers --------------------------- #
    def _build_parts(self, person: Dict, clothing_items: Dict) -> List[Dict[str, Any]]:
        parts: List[Dict[str, Any]] = []

        # Combine safety + task prompt up-front for stronger adherence
        combined_text = self._safety_directives()

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

        # Add combined text (safety + task) as a single initial instruction
        combined_text += "\n\nTASK:\n" + self._prompt_text(clothing_pieces)
        parts.insert(0, {"text": combined_text})
        return parts

    def _call_new_genai(self, parts: List[Dict[str, Any]], key: str) -> Optional[str]:
        # New client: from google import genai
        # Recreate client for the provided key to allow key fallback
        self._new_client = self._new_genai.Client(api_key=key)  # type: ignore[attr-defined]

        # Convert any base64 strings to raw bytes for the new SDK
        norm_parts: List[Dict[str, Any]] = []
        for p in parts:
            if "inline_data" in p and isinstance(p["inline_data"], dict):
                mime = p["inline_data"].get("mime_type", "image/jpeg")
                data = p["inline_data"].get("data")
                if isinstance(data, str):
                    try:
                        data_bytes = base64.b64decode(data)
                    except Exception:
                        data_bytes = b""
                else:
                    data_bytes = data or b""
                norm_parts.append({"inline_data": {"data": data_bytes, "mime_type": mime}})
            else:
                # text parts or others as-is
                norm_parts.append(p)

        # The new API mirrors Node but uses snake_case fields
        resp = self._new_client.models.generate_content(
            model=self.model,
            # Align to docs: wrap parts in a user Content object
            contents=[{"role": "user", "parts": norm_parts}],
            # Prefer image output; temperature unified via self.temperature
            config={"response_modalities": ["IMAGE"], "temperature": self.temperature},
        )

        return self._extract_image_from_response(resp)

    def _call_legacy_genai(self, parts: List[Dict[str, Any]], key: str) -> Optional[str]:
        # Legacy client: import google.generativeai as genai
        # Reconfigure model per key
        self._legacy_genai.configure(api_key=key)  # type: ignore[attr-defined]
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

        try:
            resp = self._legacy_model.generate_content(  # type: ignore[assignment]
                legacy_inputs,
                generation_config={"temperature": self.temperature},
            )
        except TypeError:
            # For older SDKs without generation_config support
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
                if inline and (getattr(inline, "data", None) or (isinstance(inline, dict) and inline.get("data"))):
                    raw = inline.get("data") if isinstance(inline, dict) else getattr(inline, "data")
                    mime = inline.get("mime_type") if isinstance(inline, dict) else getattr(inline, "mime_type", "image/png")
                    if isinstance(raw, (bytes, bytearray)):
                        b64 = base64.b64encode(raw).decode("ascii")
                    else:
                        # assume already base64 string
                        b64 = str(raw)
                    return f"data:{mime};base64,{b64}"
            return None
        except Exception:
            return None

    # --------------------------- prompt helpers ------------------------------ #
    @staticmethod
    def _safety_directives() -> str:
        return "\n".join([
            "CRITICAL SAFETY AND CONSISTENCY DIRECTIVES:",
            "- The FIRST image MUST be used as the definitive source for the person's face and overall appearance.",
            "- ABSOLUTELY NO re-synthesis, redrawing, retouching, or alteration of the person's face is permitted.",
            "- The person's face, including but not limited to: facial structure, landmarks, skin texture, pores, moles, scars, facial hair (if any), hairline, eye shape, nose shape, mouth shape, and expression, MUST remain IDENTICAL and UNCHANGED.",
            "- Preserve the EXACT facial identity. NO beautification, smoothing, makeup application, or landmark adjustments.",
            "- DO NOT CHANGE THE PERSON'S FACE SHAPE OR FACIAL STRUCTURE.",
            "- Maintain the background, perspective, and lighting IDENTICALLY to the original person image.",
            "- REPLACE existing garments with the provided clothing: top replaces top layer, pants replace pants, shoes replace shoes.",
            "- Remove/ignore backgrounds from clothing product photos; segment garment only (no mannequin or logos).",
            "- Fit garments to the person's pose with correct scale/rotation/warping; align perspective and seams.",
            "- Respect occlusion: body parts (e.g., crossed arms/hands) naturally occlude garments when in front.",
            "- Ensure the ENTIRE PERSON is visible; garments must cover appropriate regions (top on torso/arms, pants on legs to ankles, shoes on feet).",
            "- Do NOT add or remove accessories or objects. No text, logos, or watermarks.",
            "- Treat the face region as STRICTLY PIXEL-LOCKED: identity-specific details MUST remain unchanged and untouched.",
            "- If any instruction conflicts with another, the preservation of the person's facial identity and the integrity of the face shape are the ABSOLUTE HIGHEST PRIORITIES.",
        ])

    @staticmethod
    def _prompt_text(clothing_pieces: List[str]) -> str:
        items = ", ".join(clothing_pieces)
        return (
            "Use the FIRST image as the base. Remove backgrounds from the clothing product photos and extract only the garments. "
            "REPLACE the person's existing garments with the provided items: top -> torso/arms, pants -> legs to ankles, shoes -> feet. "
            f"Output a single photorealistic image of the SAME person wearing: {items}. "
            "Fit garments to the person's pose with correct scale/rotation/warping; match perspective and seam alignment. "
            "Handle occlusion correctly (e.g., crossed arms remain in front of the top where appropriate). "
            "Keep lighting and shadows consistent. Preserve the face and body shape exactly. No text, logos, or watermarks."
        )


gemini_image_service = GeminiImageService()
