#!/usr/bin/env python
import os
import sys

# Create a simple test PDF using reportlab
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4

def create_test_pdf():
    """Create a simple test PDF invoice"""

    filename = '/tmp/test_invoice.pdf'
    c = canvas.Canvas(filename, pagesize=A4)

    # Title
    c.setFont("Helvetica-Bold", 20)
    c.drawString(50, 750, "INVOICE #2025-001")

    # Date
    c.setFont("Helvetica", 12)
    c.drawString(50, 720, "Date: 15/09/2025")

    # Customer info
    c.drawString(50, 680, "Customer: John Doe")
    c.drawString(50, 660, "Address: 123 Main Street, Athens, Greece")

    # Table header
    c.setFont("Helvetica-Bold", 12)
    c.drawString(50, 600, "Item")
    c.drawString(250, 600, "Quantity")
    c.drawString(350, 600, "Price")
    c.drawString(450, 600, "Total")

    # Table data
    c.setFont("Helvetica", 12)
    c.drawString(50, 580, "Service Fee")
    c.drawString(250, 580, "1")
    c.drawString(350, 580, "€100.00")
    c.drawString(450, 580, "€100.00")

    c.drawString(50, 560, "Tax (24%)")
    c.drawString(450, 560, "€24.00")

    # Total
    c.setFont("Helvetica-Bold", 14)
    c.drawString(50, 520, "TOTAL:")
    c.drawString(450, 520, "€124.00")

    # Save
    c.save()

    print(f"✓ Test PDF created: {filename}")

    # Check file
    if os.path.exists(filename):
        size = os.path.getsize(filename)
        print(f"  Size: {size} bytes")

    return filename

if __name__ == "__main__":
    create_test_pdf()