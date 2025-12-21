from __future__ import annotations

from datetime import timedelta
import base64
import csv
import re
import zipfile
from io import BytesIO

from django.db import connection
from django.http import HttpResponse
from django.utils import timezone
from django_tenants.utils import schema_context
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.permissions import IsUltraAdmin


class AdPlacementListView(APIView):
    """
    Ultra-admin only: list placements and pricing config (public schema).
    """

    permission_classes = [IsAuthenticated, IsUltraAdmin]

    def get(self, request):
        with schema_context("public"):
            from ad_portal.models import AdPlacementType

            rows = list(
                AdPlacementType.objects.all()
                .order_by("monthly_price_eur", "code")
                .values(
                    "code",
                    "display_name",
                    "description",
                    "monthly_price_eur",
                    "max_slots_per_building",
                    "is_active",
                    "updated_at",
                )
            )
            return Response({"placements": rows})


class AdPlacementUpdateView(APIView):
    """
    Ultra-admin only: update one placement by code.
    """

    permission_classes = [IsAuthenticated, IsUltraAdmin]

    def patch(self, request, code: str):
        allowed = {"display_name", "description", "monthly_price_eur", "max_slots_per_building", "is_active"}
        payload = {k: v for k, v in (request.data or {}).items() if k in allowed}

        with schema_context("public"):
            from ad_portal.models import AdPlacementType

            p = AdPlacementType.objects.filter(code=code).first()
            if not p:
                return Response({"error": "Not found"}, status=status.HTTP_404_NOT_FOUND)

            for k, v in payload.items():
                setattr(p, k, v)
            p.save()

            return Response(
                {
                    "code": p.code,
                    "display_name": p.display_name,
                    "description": p.description,
                    "monthly_price_eur": p.monthly_price_eur,
                    "max_slots_per_building": p.max_slots_per_building,
                    "is_active": p.is_active,
                    "updated_at": p.updated_at,
                }
            )


class AdTokenCreateView(APIView):
    """
    Ultra-admin only: create an AdLandingToken for a building.
    """

    permission_classes = [IsAuthenticated, IsUltraAdmin]

    def post(self, request):
        building_id = request.data.get("building_id")
        try:
            building_id_int = int(building_id)
        except Exception:
            return Response({"error": "building_id is required"}, status=status.HTTP_400_BAD_REQUEST)

        # Determine tenant schema from current request context
        tenant_schema = connection.schema_name
        if tenant_schema == "public":
            tenant_schema = (request.data.get("tenant_schema") or "").strip()
            if not tenant_schema:
                return Response({"error": "tenant_schema is required when called from public schema"}, status=status.HTTP_400_BAD_REQUEST)

        expires_days = int(request.data.get("expires_days") or 60)
        expires_at = timezone.now() + timedelta(days=expires_days)

        campaign_source = (request.data.get("campaign_source") or "ui").strip()
        utm_source = (request.data.get("utm_source") or "letter").strip()
        utm_medium = (request.data.get("utm_medium") or "qr").strip()
        utm_campaign = (request.data.get("utm_campaign") or "local_ads").strip()

        with schema_context("public"):
            from ad_portal.models import AdLandingToken

            token = AdLandingToken.objects.create(
                tenant_schema=tenant_schema,
                building_id=building_id_int,
                campaign_source=campaign_source,
                utm_source=utm_source,
                utm_medium=utm_medium,
                utm_campaign=utm_campaign,
                expires_at=expires_at,
                is_active=True,
            )

        # Build landing URL using the current host (tenant aware)
        host = (
            request.headers.get("X-Tenant-Host")
            or request.headers.get("x-forwarded-host")
            or request.headers.get("host")
            or ""
        ).split(":")[0]
        base = f"https://{host}" if host else "http://localhost:3000"
        landing_url = f"{base}/advertise/{token.token}?utm_source={utm_source}&utm_medium={utm_medium}&utm_campaign={utm_campaign}"

        return Response(
            {
                "token": str(token.token),
                "tenant_schema": token.tenant_schema,
                "building_id": token.building_id,
                "expires_at": token.expires_at,
                "landing_url": landing_url,
            },
            status=status.HTTP_201_CREATED,
        )


class AdOutreachBulkGenerateView(APIView):
    """
    Ultra-admin only:
    Upload/paste CSV (business list) and generate a ZIP with personalized PDF letters + unique QR tokens.

    CSV supported formats:
    - With headers: business_name (or name), category (optional), address (optional)
    - Without headers: col1=business_name, col2=category, col3=address
    """

    permission_classes = [IsAuthenticated, IsUltraAdmin]

    def _slug(self, value: str) -> str:
        s = (value or "").strip().lower()
        s = re.sub(r"\s+", "-", s)
        s = re.sub(r"[^a-z0-9\u0370-\u03ff\u1f00-\u1fff\-_]+", "", s)  # keep greek too
        s = re.sub(r"-{2,}", "-", s).strip("-")
        return s[:80] or "business"

    def _build_qr_png_b64(self, url: str) -> str:
        import qrcode

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

    def _render_pdf(self, *, html: str, qr_png_bytes: bytes | None = None, fallback_title: str = "") -> bytes:
        """
        Prefer WeasyPrint, fallback to ReportLab.
        """
        try:
            from weasyprint import CSS, HTML

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
        except Exception:
            # Fallback: minimal PDF via ReportLab
            from reportlab.lib.pagesizes import A4
            from reportlab.lib.units import mm
            from reportlab.lib.utils import ImageReader
            from reportlab.pdfgen import canvas

            buf = BytesIO()
            c = canvas.Canvas(buf, pagesize=A4)
            width, height = A4

            x = 18 * mm
            y = height - 22 * mm

            c.setFont("Helvetica-Bold", 14)
            c.drawString(x, y, fallback_title or "Διαφήμιση στο InfoPoint")
            y -= 10 * mm

            c.setFont("Helvetica", 10)
            for line in (re.sub(r"<[^>]+>", "", html) or "").splitlines():
                line = line.strip()
                if not line:
                    continue
                c.drawString(x, y, line[:110])
                y -= 5.5 * mm
                if y < 30 * mm:
                    break

            if qr_png_bytes:
                try:
                    img = ImageReader(BytesIO(qr_png_bytes))
                    c.drawImage(img, width - 55 * mm, height - 70 * mm, 45 * mm, 45 * mm, preserveAspectRatio=True, mask="auto")
                except Exception:
                    pass

            c.showPage()
            c.save()
            return buf.getvalue()

    def _parse_csv_rows(self, csv_text: str) -> list[dict]:
        raw = (csv_text or "").strip()
        if not raw:
            return []

        # Try DictReader first (headers)
        try:
            f = BytesIO(raw.encode("utf-8"))
            text = f.read().decode("utf-8").splitlines()
            if not text:
                return []
            sample = text[0].lower()
            has_header = "business" in sample or "name" in sample
            if has_header:
                reader = csv.DictReader(text)
                out: list[dict] = []
                for row in reader:
                    out.append({k.strip().lower(): (v or "").strip() for k, v in (row or {}).items() if k})
                return out
        except Exception:
            pass

        # Fallback: plain columns
        reader2 = csv.reader(raw.splitlines())
        out2: list[dict] = []
        for row in reader2:
            if not row:
                continue
            business_name = (row[0] or "").strip()
            if not business_name:
                continue
            out2.append(
                {
                    "business_name": business_name,
                    "category": (row[1] or "").strip() if len(row) > 1 else "",
                    "address": (row[2] or "").strip() if len(row) > 2 else "",
                }
            )
        return out2

    def post(self, request):
        building_id = request.data.get("building_id")
        try:
            building_id_int = int(building_id)
        except Exception:
            return Response({"error": "building_id is required"}, status=status.HTTP_400_BAD_REQUEST)

        # Determine tenant schema from current request context
        tenant_schema = connection.schema_name
        if tenant_schema == "public":
            tenant_schema = (request.data.get("tenant_schema") or "").strip()
            if not tenant_schema:
                return Response({"error": "tenant_schema is required when called from public schema"}, status=status.HTTP_400_BAD_REQUEST)

        expires_days = int(request.data.get("expires_days") or 60)
        expires_at = timezone.now() + timedelta(days=expires_days)

        campaign_source = (request.data.get("campaign_source") or "bulk_csv").strip()
        utm_source = (request.data.get("utm_source") or "letter").strip()
        utm_medium = (request.data.get("utm_medium") or "qr").strip()
        utm_campaign = (request.data.get("utm_campaign") or "local_ads").strip()
        radius_m = int(request.data.get("radius_m") or 300)
        radius_m = max(100, min(2000, radius_m))

        csv_text = (request.data.get("csv_text") or "").strip()
        rows = self._parse_csv_rows(csv_text)
        if not rows:
            return Response({"error": "csv_text is empty or invalid"}, status=status.HTTP_400_BAD_REQUEST)

        # Fetch building info (tenant schema)
        with schema_context(tenant_schema):
            from buildings.models import Building

            b = Building.objects.filter(id=building_id_int).first()
            if not b:
                return Response({"error": "Building not found"}, status=status.HTTP_404_NOT_FOUND)
            building_name = b.name
            building_address = f"{b.address}, {b.city} {b.postal_code}"

        # Host/base for landing URLs
        host = (
            request.headers.get("X-Tenant-Host")
            or request.headers.get("x-forwarded-host")
            or request.headers.get("host")
            or ""
        ).split(":")[0]
        base = f"https://{host}" if host else "http://localhost:3000"

        from ad_portal.models import AdLandingToken

        zip_buf = BytesIO()
        generated = 0

        with zipfile.ZipFile(zip_buf, mode="w", compression=zipfile.ZIP_DEFLATED) as zf:
            for idx, row in enumerate(rows, start=1):
                business_name = (row.get("business_name") or row.get("name") or "").strip()
                if not business_name:
                    continue
                category = (row.get("category") or row.get("utm_term") or "").strip()
                address = (row.get("address") or "").strip()

                # Token + tracking fields
                utm_content = (row.get("utm_content") or self._slug(business_name) or f"lead-{idx}").strip()[:120]
                utm_term = (category or "").strip()[:120]

                with schema_context("public"):
                    token = AdLandingToken.objects.create(
                        tenant_schema=tenant_schema,
                        building_id=building_id_int,
                        campaign_source=campaign_source,
                        utm_source=utm_source,
                        utm_medium=utm_medium,
                        utm_campaign=utm_campaign,
                        utm_content=utm_content,
                        utm_term=utm_term,
                        expires_at=expires_at,
                        is_active=True,
                    )

                landing_url = (
                    f"{base}/advertise/{token.token}"
                    f"?utm_source={utm_source}&utm_medium={utm_medium}&utm_campaign={utm_campaign}"
                    f"&utm_content={utm_content}"
                )
                if utm_term:
                    landing_url += f"&utm_term={utm_term}"
                landing_url += f"&radius_m={radius_m}"

                qr_b64 = self._build_qr_png_b64(landing_url)
                qr_png_bytes = base64.b64decode(qr_b64.encode("ascii"))

                title = f"Προς: {business_name}"
                addr_line = f"<div style='margin-top:6px; font-size: 12px; color:#64748b;'>Διεύθυνση: {address}</div>" if address else ""
                cat_line = f"<div style='margin-top:6px; font-size: 12px; color:#64748b;'>Κατηγορία: {utm_term}</div>" if utm_term else ""

                html = f"""
<div style="display:flex; flex-direction:column; gap: 14px;">
  <div class="box">
    <div style="display:flex; justify-content:space-between; align-items:flex-start; gap: 16px;">
      <div style="flex: 1;">
        <div style="font-size: 16px; font-weight: 700; margin-bottom: 6px;">{title}</div>
        {addr_line}
        {cat_line}
        <div style="margin-top: 10px; color:#475569; font-size: 13px; line-height: 1.4;">
          Σκανάρετε το QR για να δείτε το κτίριο στον χάρτη, τον ανταγωνισμό κοντά σας (ακτίνα {radius_m}μ.)
          και να ενεργοποιήσετε <strong>1 μήνα δωρεάν δοκιμή</strong> (χωρίς κάρτα).
        </div>
        <div style="margin-top: 10px; font-size: 12px; color:#64748b;">
          Κτίριο: <strong>{building_name}</strong><br/>
          Διεύθυνση κτιρίου: {building_address}
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
    <div style="margin-top: 10px; font-size: 11px; color:#64748b; word-break: break-all;">
      Link: {landing_url}
    </div>
  </div>
</div>
"""

                pdf_bytes = self._render_pdf(html=html, qr_png_bytes=qr_png_bytes, fallback_title=title)
                safe_name = self._slug(business_name)
                filename = f"{safe_name}-building-{building_id_int}-token-{str(token.token)[:8]}.pdf"
                zf.writestr(filename, pdf_bytes)
                generated += 1

        if generated == 0:
            return Response({"error": "No valid rows found in CSV"}, status=status.HTTP_400_BAD_REQUEST)

        resp = HttpResponse(zip_buf.getvalue(), content_type="application/zip")
        resp["Content-Disposition"] = f'attachment; filename="ad-outreach-building-{building_id_int}.zip"'
        resp["X-Generated-Count"] = str(generated)
        return resp


