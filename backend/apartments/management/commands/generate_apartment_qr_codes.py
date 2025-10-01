"""
Management command to generate QR codes for apartment kiosk access.
Generates printable PDF with QR codes for each apartment.
"""
from django.core.management.base import BaseCommand
from django.conf import settings
from django_tenants.utils import schema_context
from apartments.models import Apartment
from buildings.models import Building
import qrcode
from io import BytesIO
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
import os


class Command(BaseCommand):
    help = 'Generate QR codes for apartment kiosk access'

    def add_arguments(self, parser):
        parser.add_argument(
            '--building',
            type=int,
            help='Building ID to generate QR codes for (optional, defaults to all)'
        )
        parser.add_argument(
            '--schema',
            type=str,
            default='demo',
            help='Tenant schema (default: demo)'
        )
        parser.add_argument(
            '--base-url',
            type=str,
            default='http://localhost:3000',
            help='Base URL for the application (default: http://localhost:3000)'
        )

    def handle(self, *args, **options):
        schema = options['schema']
        building_id = options.get('building')
        base_url = options['base_url']

        with schema_context(schema):
            # Get buildings
            if building_id:
                buildings = Building.objects.filter(id=building_id)
            else:
                buildings = Building.objects.all()

            if not buildings.exists():
                self.stdout.write(self.style.ERROR('No buildings found'))
                return

            for building in buildings:
                self.generate_building_qr_codes(building, base_url)

    def generate_building_qr_codes(self, building, base_url):
        """Generate QR codes PDF for a single building"""
        apartments = building.apartments.all().order_by('number')

        if not apartments.exists():
            self.stdout.write(self.style.WARNING(f'No apartments found for {building.name}'))
            return

        # Create output directory
        output_dir = '/app/media/qr_codes'
        os.makedirs(output_dir, exist_ok=True)

        # PDF filename
        building_slug = building.name.replace(' ', '_').replace('/', '_') if building.name else f'building_{building.id}'
        pdf_filename = f'{output_dir}/{building_slug}_qr_codes.pdf'

        # Create PDF
        c = canvas.Canvas(pdf_filename, pagesize=A4)
        width, height = A4

        # Title page
        c.setFont("Helvetica-Bold", 24)
        c.drawCentredString(width / 2, height - 100, f"QR Codes - {building.name or building.address}")

        c.setFont("Helvetica", 14)
        c.drawCentredString(width / 2, height - 140, "Kiosk Personal Access")
        c.drawCentredString(width / 2, height - 170, f"Total Apartments: {apartments.count()}")

        c.showPage()

        # QR codes grid: 2 columns × 4 rows per page
        qr_size = 60 * mm
        margin = 20 * mm
        spacing_x = (width - 2 * margin - 2 * qr_size) / 1
        spacing_y = (height - 2 * margin - 4 * qr_size) / 3

        x_positions = [margin, margin + qr_size + spacing_x]
        y_positions = [
            height - margin - qr_size,
            height - margin - 2 * qr_size - spacing_y,
            height - margin - 3 * qr_size - 2 * spacing_y,
            height - margin - 4 * qr_size - 3 * spacing_y,
        ]

        apartment_index = 0
        for apartment in apartments:
            # Calculate position
            col = apartment_index % 2
            row = (apartment_index // 2) % 4

            x = x_positions[col]
            y = y_positions[row]

            # Generate QR code
            qr_url = f"{base_url}/my-apartment/{apartment.kiosk_token}"
            qr = qrcode.QRCode(
                version=1,
                error_correction=qrcode.constants.ERROR_CORRECT_L,
                box_size=10,
                border=2,
            )
            qr.add_data(qr_url)
            qr.make(fit=True)

            qr_img = qr.make_image(fill_color="black", back_color="white")

            # Convert to BytesIO
            img_buffer = BytesIO()
            qr_img.save(img_buffer, format='PNG')
            img_buffer.seek(0)

            # Draw QR code
            c.drawImage(ImageReader(img_buffer), x, y, width=qr_size, height=qr_size)

            # Draw apartment label
            c.setFont("Helvetica-Bold", 16)
            c.drawCentredString(x + qr_size / 2, y - 15, f"Διαμέρισμα {apartment.number}")

            c.setFont("Helvetica", 10)
            if apartment.owner_name:
                c.drawCentredString(x + qr_size / 2, y - 30, apartment.owner_name[:25])

            # Draw border
            c.rect(x - 5, y - 35, qr_size + 10, qr_size + 40, stroke=1, fill=0)

            apartment_index += 1

            # New page every 8 apartments (2×4 grid)
            if apartment_index % 8 == 0 and apartment_index < apartments.count():
                c.showPage()

        # Save PDF
        c.save()

        self.stdout.write(self.style.SUCCESS(f'✅ Generated QR codes PDF: {pdf_filename}'))
        self.stdout.write(self.style.SUCCESS(f'   Building: {building.name or building.address}'))
        self.stdout.write(self.style.SUCCESS(f'   Apartments: {apartments.count()}'))
        self.stdout.write(f'   Download URL: /media/qr_codes/{building_slug}_qr_codes.pdf')
