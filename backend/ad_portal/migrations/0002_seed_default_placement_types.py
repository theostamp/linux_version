from django.db import migrations


def seed_default_placements(apps, schema_editor):
    AdPlacementType = apps.get_model("ad_portal", "AdPlacementType")

    defaults = [
        {
            "code": "ticker",
            "display_name": "News Ticker",
            "description": "Κυλιόμενη μπάρα στο κάτω μέρος της οθόνης.",
            "monthly_price_eur": "15.00",
            "max_slots_per_building": 6,
            "is_active": True,
        },
        {
            "code": "banner",
            "display_name": "Sidebar Banner",
            "description": "Banner/κάρτα στο sidebar με rotation.",
            "monthly_price_eur": "30.00",
            "max_slots_per_building": 3,
            "is_active": True,
        },
        {
            "code": "interstitial",
            "display_name": "Whole Page (Interstitial)",
            "description": "Διακριτική full-page προβολή σε χαμηλή συχνότητα.",
            "monthly_price_eur": "50.00",
            "max_slots_per_building": 1,
            "is_active": True,
        },
    ]

    for row in defaults:
        AdPlacementType.objects.update_or_create(code=row["code"], defaults=row)


def unseed_default_placements(apps, schema_editor):
    AdPlacementType = apps.get_model("ad_portal", "AdPlacementType")
    AdPlacementType.objects.filter(code__in=["ticker", "banner", "interstitial"]).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("ad_portal", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(seed_default_placements, reverse_code=unseed_default_placements),
    ]


