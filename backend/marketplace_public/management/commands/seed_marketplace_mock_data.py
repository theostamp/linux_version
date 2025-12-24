from __future__ import annotations

import uuid
from decimal import Decimal
from typing import Dict, Tuple

from django.core.management.base import BaseCommand
from django.db import transaction
from django_tenants.utils import schema_context

from marketplace_public.models import MarketplaceCommissionPolicy, MarketplaceProvider, MarketplaceServiceType


MOCK_TAG = "NC_MOCK"


DEFAULT_POLICY_RATES: Dict[str, Tuple[Decimal, Decimal]] = {
    MarketplaceServiceType.EMERGENCY: (Decimal("12.00"), Decimal("4.00")),
    MarketplaceServiceType.PLUMBING: (Decimal("9.00"), Decimal("3.00")),
    MarketplaceServiceType.ELECTRICAL: (Decimal("9.00"), Decimal("3.00")),
    MarketplaceServiceType.HEATING: (Decimal("8.00"), Decimal("3.00")),
    MarketplaceServiceType.CLEANING: (Decimal("10.00"), Decimal("3.00")),
    MarketplaceServiceType.SECURITY: (Decimal("8.00"), Decimal("2.00")),
    MarketplaceServiceType.ELEVATOR: (Decimal("6.00"), Decimal("2.00")),
    MarketplaceServiceType.MAINTENANCE: (Decimal("7.00"), Decimal("2.00")),
    MarketplaceServiceType.TECHNICAL: (Decimal("7.00"), Decimal("2.00")),
    MarketplaceServiceType.REPAIR: (Decimal("8.00"), Decimal("2.50")),
    MarketplaceServiceType.PAINTING: (Decimal("5.00"), Decimal("2.00")),
    MarketplaceServiceType.CARPENTRY: (Decimal("5.00"), Decimal("2.00")),
    MarketplaceServiceType.MASONRY: (Decimal("4.00"), Decimal("2.00")),
    MarketplaceServiceType.LANDSCAPING: (Decimal("6.00"), Decimal("2.00")),
    MarketplaceServiceType.OTHER: (Decimal("5.00"), Decimal("1.00")),
}


CITY_COORDS = {
    "athens": (Decimal("37.983810"), Decimal("23.727539")),
    "thessaloniki": (Decimal("40.640064"), Decimal("22.944419")),
}


def _uuid_for(service_type: str, idx: int) -> uuid.UUID:
    return uuid.uuid5(uuid.NAMESPACE_URL, f"newconcierge:{MOCK_TAG}:provider:{service_type}:{idx}")


def _stable_int(service_type: str, idx: int) -> int:
    # Deterministic across runs (unlike Python's salted hash()).
    return uuid.uuid5(uuid.NAMESPACE_URL, f"newconcierge:{MOCK_TAG}:stable:{service_type}:{idx}").int


def _email_for(service_type: str, idx: int) -> str:
    return f"mock-{service_type}-{idx}@newconcierge.local"


def _phone_for(service_type: str, idx: int) -> str:
    # Simple deterministic “Greek-looking” numbers
    base = _stable_int(service_type, idx) % 9000000
    return f"+30 210 {1000000 + base:07d}"


def _name_for(service_type_label: str, idx: int) -> str:
    if idx == 1:
        return f"{service_type_label} — GreenPro"
    if idx == 2:
        return f"{service_type_label} — CityFix"
    return f"{service_type_label} — Partner {idx}"


def _rating_for(service_type: str, idx: int) -> Decimal:
    # 3.90 .. 4.90 deterministic
    raw = (_stable_int(f"rating:{service_type}", idx) % 100) / 100
    return Decimal("3.90") + Decimal(str(raw))


class Command(BaseCommand):
    help = "Seed mock Marketplace providers (2+ per category) into PUBLIC schema."

    def add_arguments(self, parser):
        parser.add_argument(
            "--count-per-category",
            type=int,
            default=2,
            help="Πλήθος providers ανά κατηγορία (default: 2).",
        )
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Διαγράφει προηγούμενα mock providers (μόνο όσα έχουν tag NC_MOCK) πριν το seed.",
        )
        parser.add_argument(
            "--upsert-policies",
            action="store_true",
            help="Δημιουργεί/ενημερώνει commission policies ανά κατηγορία με default rate card.",
        )

    def handle(self, *args, **options):
        count = int(options["count_per_category"])
        reset = bool(options["reset"])
        upsert_policies = bool(options["upsert_policies"])

        if count < 2:
            raise SystemExit("--count-per-category πρέπει να είναι >= 2")

        with schema_context("public"):
            with transaction.atomic():
                if reset:
                    deleted_providers, _ = MarketplaceProvider.objects.filter(
                        short_description__contains=MOCK_TAG
                    ).delete()
                    self.stdout.write(
                        self.style.WARNING(
                            f"Reset: deleted providers={deleted_providers}"
                        )
                    )

                if upsert_policies:
                    for service_type, (base, bonus) in DEFAULT_POLICY_RATES.items():
                        MarketplaceCommissionPolicy.objects.update_or_create(
                            service_type=service_type,
                            defaults={
                                "base_commission_rate_percent": base,
                                "featured_bonus_commission_rate_percent": bonus,
                                "is_active": True,
                            },
                        )
                    self.stdout.write(self.style.SUCCESS("Commission policies upserted."))

                created = 0
                updated = 0

                for service_type, service_label in MarketplaceServiceType.choices:
                    for idx in range(1, count + 1):
                        provider_id = _uuid_for(service_type, idx)
                        city = "athens" if idx % 2 == 1 else "thessaloniki"
                        lat, lng = CITY_COORDS[city]

                        is_featured = idx == 1
                        is_verified = True

                        defaults = {
                            "name": _name_for(service_label, idx),
                            "service_type": service_type,
                            "is_active": True,
                            "show_in_marketplace": True,
                            "is_verified": is_verified,
                            "is_featured": is_featured,
                            "rating": _rating_for(service_type, idx).quantize(Decimal("0.01")),
                            "phone": _phone_for(service_type, idx),
                            "email": _email_for(service_type, idx),
                            "website": f"https://example.com/{MOCK_TAG.lower()}/{service_type}/{idx}",
                            "address": f"{city.title()} Center, {service_label}",
                            "short_description": f"{MOCK_TAG} • {service_label} συνεργάτης για demo/testing.",
                            "detailed_description": (
                                f"{MOCK_TAG} demo profile για {service_label}. "
                                "Περιλαμβάνει προσφορά, κουπόνι, portfolio και geolocation."
                            ),
                            "special_offers": "Έκπτωση 10% για χρήστες της εφαρμογής (demo).",
                            "coupon_code": f"{MOCK_TAG}-{service_type.upper()}-{idx}",
                            "coupon_description": "Demo κουπόνι (μόνο για δοκιμές).",
                            "portfolio_links": [
                                f"https://example.com/portfolio/{service_type}/{idx}",
                                f"https://example.com/reviews/{service_type}/{idx}",
                            ],
                            "latitude": lat,
                            "longitude": lng,
                            "service_radius_km": Decimal("50.00"),
                            "is_nationwide": False,
                        }

                        # Add some overrides for demo variety
                        if idx == 2:
                            defaults["default_commission_rate_percent"] = Decimal("7.50")
                        if is_featured and idx == 1 and service_type in {
                            MarketplaceServiceType.EMERGENCY,
                            MarketplaceServiceType.PLUMBING,
                        }:
                            defaults["featured_bonus_commission_rate_percent_override"] = Decimal("5.00")

                        obj, was_created = MarketplaceProvider.objects.update_or_create(
                            id=provider_id,
                            defaults=defaults,
                        )
                        if was_created:
                            created += 1
                        else:
                            updated += 1

                self.stdout.write(
                    self.style.SUCCESS(
                        f"Seed completed: created={created}, updated={updated}, per_category={count}, tag={MOCK_TAG}"
                    )
                )


