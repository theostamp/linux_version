from __future__ import annotations

import base64
from dataclasses import dataclass
from datetime import timedelta
from io import BytesIO
from pathlib import Path
from typing import Optional

import qrcode
from django.core.management.base import BaseCommand, CommandError
from django.conf import settings
from django.utils import timezone
from django_tenants.utils import schema_context


@dataclass(frozen=True)
class BuildingInfo:
    id: int
    name: str
    address: str
    city: str
    postal_code: str


class Command(BaseCommand):
    help = "Generate PDF outreach letters (with QR) for the Automated Ad Portal."

    def add_arguments(self, parser):
        parser.add_argument("--schema", required=True, help="Tenant schema name (e.g. demo)")
        parser.add_argument("--building-id", type=int, default=None, help="Specific building id within the tenant schema")
        parser.add_argument(
            "--all-buildings",
            action="store_true",
            help="Generate for all buildings within the schema (overrides --building-id)",
        )
        parser.add_argument("--expires-days", type=int, default=60, help="Token expiration window (days)")
        parser.add_argument(
            "--output-dir",
            default="media/ad_outreach",
            help="Output directory (relative to backend/). Default: media/ad_outreach",
        )
        parser.add_argument(
            "--domain",
            default=None,
            help="Override domain (e.g. demo.newconcierge.app). If not provided, uses primary tenants.Domain.",
        )
        parser.add_argument("--utm_source", default="letter", help="UTM source")
        parser.add_argument("--utm_medium", default="qr", help="UTM medium")
        parser.add_argument("--utm_campaign", default="local_ads", help="UTM campaign")

    def _resolve_domain(self, *, schema: str, override_domain: Optional[str]) -> str:
        if override_domain:
            return override_domain

        with schema_context("public"):
            from tenants.models import Domain

            d = Domain.objects.filter(tenant__schema_name=schema).order_by("-is_primary", "id").first()
            if not d or not getattr(d, "domain", None):
                raise CommandError(
                    "Could not resolve domain from tenants.Domain. Provide --domain explicitly."
                )
            return d.domain

    def _fetch_buildings(self, *, schema: str, building_id: Optional[int], all_buildings: bool) -> list[BuildingInfo]:
        with schema_context(schema):
            from buildings.models import Building

            qs = Building.objects.all().order_by("id")
            if not all_buildings:
                if building_id is None:
                    raise CommandError("Provide --building-id or --all-buildings")
                qs = qs.filter(id=building_id)

            buildings: list[BuildingInfo] = []
            for b in qs:
                buildings.append(
                    BuildingInfo(
                        id=b.id,
                        name=b.name,
                        address=b.address,
                        city=b.city,
                        postal_code=b.postal_code,
                    )
                )
            if not buildings:
                raise CommandError("No buildings found for given filters.")
            return buildings

    def _build_qr_png_base64(self, url: str) -> str:
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_M,
            box_size=10,
            border=2,
        )
        qr.add_data(url)
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")
        buf = BytesIO()
        img.save(buf, format="PNG")
        return base64.b64encode(buf.getvalue()).decode("ascii")

    def _render_pdf(self, *, html: str) -> bytes:
        try:
            from weasyprint import HTML, CSS
        except Exception as e:
            raise CommandError(f"WeasyPrint not available: {e}")

        return HTML(string=html).write_pdf(
            stylesheets=[
                CSS(
                    string="""
@page { size: A4; margin: 16mm; }
body { font-family: Arial, sans-serif; color: #0f172a; }
.box { border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; }
"""
                )
            ]
        )

    def handle(self, *args, **options):
        schema: str = options["schema"]
        building_id: Optional[int] = options.get("building_id")
        all_buildings: bool = bool(options.get("all_buildings"))
        expires_days: int = int(options.get("expires_days") or 60)
        output_dir: str = options.get("output_dir") or "media/ad_outreach"
        override_domain: Optional[str] = options.get("domain")

        utm_source = options.get("utm_source") or "letter"
        utm_medium = options.get("utm_medium") or "qr"
        utm_campaign = options.get("utm_campaign") or "local_ads"

        domain = self._resolve_domain(schema=schema, override_domain=override_domain)
        buildings = self._fetch_buildings(schema=schema, building_id=building_id, all_buildings=all_buildings)

        out_base = Path(getattr(settings, "BASE_DIR", Path.cwd())) / "backend" / output_dir
        out_base.mkdir(parents=True, exist_ok=True)

        from ad_portal.models import AdLandingToken

        created = 0
        for b in buildings:
            with schema_context("public"):
                token = AdLandingToken.objects.create(
                    tenant_schema=schema,
                    building_id=b.id,
                    campaign_source="letter",
                    utm_source=utm_source,
                    utm_medium=utm_medium,
                    utm_campaign=utm_campaign,
                    expires_at=timezone.now() + timedelta(days=expires_days),
                )

            landing_url = f"https://{domain}/advertise/{token.token}?utm_source={utm_source}&utm_medium={utm_medium}&utm_campaign={utm_campaign}"
            qr_b64 = self._build_qr_png_base64(landing_url)

            html = f"""
<div style="display:flex; flex-direction:column; gap: 14px;">
  <div class="box">
    <div style="display:flex; justify-content:space-between; align-items:flex-start; gap: 16px;">
      <div style="flex: 1;">
        <div style="font-size: 20px; font-weight: 700; margin-bottom: 6px;">Διαφήμιση στο κτίριο σας</div>
        <div style="color:#475569; font-size: 13px; line-height: 1.4;">
          Σκανάρετε το QR για να δείτε το κτίριο στον χάρτη, τον ανταγωνισμό κοντά σας και να ενεργοποιήσετε
          <strong>1 μήνα δωρεάν δοκιμή</strong>.
        </div>
        <div style="margin-top: 10px; font-size: 12px; color:#64748b;">
          Κτίριο: <strong>{b.name}</strong><br/>
          Διεύθυνση: {b.address}, {b.city} {b.postal_code}
        </div>
      </div>
      <div style="width: 180px; text-align:center;">
        <img src="data:image/png;base64,{qr_b64}" style="width: 180px; height: 180px;" />
        <div style="margin-top: 6px; font-size: 11px; color:#64748b;">Scan για ενεργοποίηση</div>
      </div>
    </div>
  </div>

  <div class="box">
    <div style="font-size: 14px; font-weight: 700; margin-bottom: 6px;">Πακέτα</div>
    <ul style="margin: 0; padding-left: 18px; color:#334155; font-size: 12.5px; line-height: 1.6;">
      <li><strong>News Ticker</strong> (κυλιόμενη μπάρα)</li>
      <li><strong>Banner</strong> (sidebar κάρτα)</li>
      <li><strong>Whole Page</strong> (διακριτικό interstitial)</li>
    </ul>
    <div style="margin-top: 10px; font-size: 11px; color:#64748b;">
      Link: {landing_url}
    </div>
  </div>
</div>
"""

            pdf_bytes = self._render_pdf(html=html)
            safe_name = "".join(ch for ch in b.name.lower().replace(" ", "-") if ch.isalnum() or ch in "-_") or f"building-{b.id}"
            out_path = out_base / schema / f"{safe_name}-building-{b.id}-ad-letter.pdf"
            out_path.parent.mkdir(parents=True, exist_ok=True)
            out_path.write_bytes(pdf_bytes)
            created += 1

            self.stdout.write(self.style.SUCCESS(f"Created: {out_path}"))

        self.stdout.write(self.style.SUCCESS(f"Done. Generated {created} PDF(s) for schema={schema}"))


