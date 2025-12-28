import re
import unicodedata
from dataclasses import dataclass
from difflib import SequenceMatcher
from typing import Any, Optional

from buildings.models import Building


def _strip_accents(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value)
    return "".join(ch for ch in normalized if not unicodedata.combining(ch))


def _norm_text(value: Optional[str]) -> str:
    if not value:
        return ""
    value = _strip_accents(str(value))
    value = value.lower()
    value = re.sub(r"[^0-9a-zα-ω\s]", " ", value)
    value = re.sub(r"\s+", " ", value).strip()
    return value


def _norm_postal(value: Optional[str]) -> str:
    if not value:
        return ""
    digits = re.sub(r"\D", "", str(value))
    return digits[:10]  # be defensive; Greek postal codes are 5 digits


def _similarity(a: str, b: str) -> float:
    a = a or ""
    b = b or ""
    if not a or not b:
        return 0.0
    return SequenceMatcher(None, a, b).ratio()


@dataclass(frozen=True)
class BuildingCandidate:
    building_id: int
    building_name: str
    score: float


def suggest_building_from_invoice(parsed_data: dict[str, Any]) -> dict[str, Any]:
    """
    Best-effort building suggestion based on extracted invoice fields (service address/city/postal code).

    Returns a stable JSON-serializable shape:
      {
        "status": "matched" | "ambiguous" | "unknown",
        "confidence": float | null,
        "building_id": int | null,
        "building_name": str | null,
        "candidates": [{building_id, building_name, confidence}, ...],
        "signals": {...}
      }
    """

    service_address = _norm_text(parsed_data.get("service_address") or parsed_data.get("address"))
    service_city = _norm_text(parsed_data.get("service_city") or parsed_data.get("city"))
    service_postal_code = _norm_postal(parsed_data.get("service_postal_code") or parsed_data.get("postal_code"))

    # If we have no signals, we cannot suggest anything reliably.
    if not (service_address or service_city or service_postal_code):
        return {
            "status": "unknown",
            "confidence": None,
            "building_id": None,
            "building_name": None,
            "candidates": [],
            "signals": {
                "service_address": None,
                "service_city": None,
                "service_postal_code": None,
            },
        }

    candidates: list[BuildingCandidate] = []

    # Keep it simple and fast: score each building in the tenant schema.
    for b in Building.objects.all().only("id", "name", "address", "city", "postal_code"):
        b_addr = _norm_text(b.address)
        b_city = _norm_text(b.city)
        b_postal = _norm_postal(b.postal_code)

        address_ratio = _similarity(service_address, b_addr)
        city_ratio = _similarity(service_city, b_city) if service_city and b_city else 0.0
        postal_match = 1.0 if (service_postal_code and b_postal and service_postal_code == b_postal) else 0.0

        # Weighted score (0..1)
        score = (
            0.45 * postal_match +
            0.40 * address_ratio +
            0.15 * city_ratio
        )

        # Ignore very weak matches to reduce noise.
        if score < 0.35:
            continue

        candidates.append(
            BuildingCandidate(
                building_id=b.id,
                building_name=b.name,
                score=round(float(score), 4),
            )
        )

    candidates = sorted(candidates, key=lambda c: c.score, reverse=True)[:5]

    if not candidates:
        return {
            "status": "unknown",
            "confidence": None,
            "building_id": None,
            "building_name": None,
            "candidates": [],
            "signals": {
                "service_address": parsed_data.get("service_address"),
                "service_city": parsed_data.get("service_city"),
                "service_postal_code": parsed_data.get("service_postal_code"),
            },
        }

    top = candidates[0]
    second = candidates[1] if len(candidates) > 1 else None

    # Confidence heuristics: top score + separation from #2
    separation = (top.score - (second.score if second else 0.0)) if second else top.score
    confidence = round(min(1.0, float(top.score + 0.2 * separation)), 4)

    status = "ambiguous"
    if confidence >= 0.85 and (second is None or (top.score - second.score) >= 0.10):
        status = "matched"
    elif confidence < 0.60:
        status = "unknown"

    return {
        "status": status,
        "confidence": confidence,
        "building_id": top.building_id if status == "matched" else None,
        "building_name": top.building_name if status == "matched" else None,
        "candidates": [
            {
                "building_id": c.building_id,
                "building_name": c.building_name,
                "confidence": round(min(1.0, float(c.score)), 4),
            }
            for c in candidates
        ],
        "signals": {
            "service_address": parsed_data.get("service_address"),
            "service_city": parsed_data.get("service_city"),
            "service_postal_code": parsed_data.get("service_postal_code"),
        },
    }


