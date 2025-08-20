#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script to generate a PDF with the exact elements from the Common Expenses Sheet
of the New Concierge application using fpdf2 for better Greek support.
"""

from fpdf import FPDF
import os

class CommonExpensesPDF(FPDF):
    def __init__(self):
        super().__init__()
        self.add_font('DejaVu', '', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', uni=True)
        self.add_font('DejaVu', 'B', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', uni=True)
    
    def header(self):
        # Header section
        self.set_font('DejaVu', 'B', 16)
        self.set_text_color(30, 64, 175)  # Blue color
        self.cell(0, 10, 'Digital Concierge App', ln=True, align='C')
        
        self.set_font('DejaVu', '', 10)
        self.set_text_color(100, 100, 100)
        self.cell(0, 8, 'online έκδοση κοινοχρήστων', ln=True, align='C')
        
        self.set_font('DejaVu', 'B', 16)
        self.set_text_color(30, 64, 175)
        self.cell(0, 10, 'Φύλλο Κοινοχρήστων', ln=True, align='C')
        
        self.set_font('DejaVu', 'B', 14)
        self.set_text_color(55, 65, 81)
        self.cell(0, 8, 'Αύγουστος 2025', ln=True, align='C')
        self.ln(10)

def create_common_expenses_pdf():
    """Create a PDF with the exact elements from the Common Expenses Sheet."""
    
    # Create PDF object
    pdf = CommonExpensesPDF()
    pdf.add_page()
    
    # Header Information Grid
    pdf.set_font('DejaVu', 'B', 12)
    pdf.set_fill_color(243, 244, 246)  # Light gray background
    
    # Building information table
    building_info = [
        ['ΠΟΛΥΚΑΤΟΙΚΙΑ', 'Παράδειγμα Κτιρίου'],
        ['ΜΗΝΑΣ', 'Αύγουστος 2025'],
        ['ΔΙΑΧΕΙΡΙΣΤΗΣ', 'Διαχειριστής Κτιρίου'],
        ['ΛΗΞΗ ΠΛΗΡΩΜΗΣ', '15 Σεπτεμβρίου 2025']
    ]
    
    for row in building_info:
        pdf.cell(50, 10, row[0], border=1, fill=True)
        pdf.cell(100, 10, row[1], border=1)
        pdf.ln()
    
    pdf.ln(10)
    
    # Expense Breakdown Section
    pdf.set_font('DejaVu', 'B', 14)
    pdf.set_text_color(55, 65, 81)
    pdf.cell(0, 10, 'ΑΝΑΛΥΣΗ ΔΑΠΑΝΩΝ ΠΟΛΥΚΑΤΟΙΚΙΑΣ', ln=True)
    pdf.ln(5)
    
    # Expense categories
    expense_categories = [
        ('Α. ΚΟΙΝΟΧΡΗΣΤΑ', ''),
        ('  1. Ηλεκτρική ενέργεια', '1,250.00€'),
        ('  2. Νερό', '450.00€'),
        ('  3. Καθαρισμός', '300.00€'),
        ('  ΣΥΝΟΛΟ', '2,000.00€'),
        ('', ''),
        ('Β.  ΑΝΕΛΚΥΣΤΗΡΑΣ', ''),
        ('  1. Συντήρηση ανελκυστήρα', '180.00€'),
        ('  2. Ηλεκτρική ενέργεια ανελκυστήρα', '120.00€'),
        ('  ΣΥΝΟΛΟ', '300.00€'),
        ('', ''),
        ('Γ. ΘΕΡΜΑΝΣΗ', ''),
        ('  1. Πετρέλαιο θέρμανσης', '2,500.00€'),
        ('  2. Συντήρηση λέβητα', '200.00€'),
        ('  ΣΥΝΟΛΟ', '2,700.00€'),
        ('', ''),
        ('Δ. ΛΟΙΠΑ ΕΞΟΔΑ', ''),
        ('  1. Ασφάλεια', '150.00€'),
        ('  2. Διαχείριση', '400.00€'),
        ('  ΣΥΝΟΛΟ', '550.00€'),
        ('', ''),
        ('Ε. ΕΞΟΔΑ ΣΥΝΙΔΙΟΚΤΗΣΙΑΣ', ''),
        ('  1. Ειδικές δαπάνες', '0.00€'),
        ('  ΣΥΝΟΛΟ', '0.00€'),
        ('', ''),
        ('ΣΥΝΟΛΟ ΔΑΠΑΝΩΝ', '5,550.00€')
    ]
    
    pdf.set_font('DejaVu', '', 10)
    for category, amount in expense_categories:
        if category.startswith(('Α.', 'Β.', 'Γ.', 'Δ.', 'Ε.', 'ΣΥΝΟΛΟ ΔΑΠΑΝΩΝ')):
            pdf.set_font('DejaVu', 'B', 10)
            pdf.set_fill_color(30, 64, 175)  # Blue background
            pdf.set_text_color(255, 255, 255)  # White text
        else:
            pdf.set_font('DejaVu', '', 10)
            pdf.set_fill_color(255, 255, 255)  # White background
            pdf.set_text_color(0, 0, 0)  # Black text
        
        if category == '':
            pdf.cell(0, 5, '', ln=True)
        else:
            pdf.cell(100, 6, category, border=1, fill=True)
            pdf.cell(50, 6, amount, border=1, fill=True, align='R')
            pdf.ln()
    
    pdf.ln(10)
    
    # Detailed Analysis Table
    pdf.set_font('DejaVu', 'B', 14)
    pdf.set_text_color(55, 65, 81)
    pdf.cell(0, 10, 'ΑΝΑΛΥΣΗ ΚΑΤΑ ΔΙΑΜΕΡΙΣΜΑΤΑ', ln=True)
    pdf.ln(5)
    
    # Table headers
    pdf.set_font('DejaVu', 'B', 8)
    pdf.set_fill_color(243, 244, 246)
    
    # Main header row
    headers = [
        'ΑΡΙΘΜΟΣ\nΔΙΑΜΕΡΙΣΜΑΤΟΣ', 'ΟΝΟΜΑΤΕΠΩΝΥΜΟ', 
        'ΘΕΡΜΑΝΣΗ', '', '', 'ΧΙΛΙΟΣΤΑ\nΣΥΜΜΕΤΟΧΗΣ', '', '', '', '', 
        'ΠΟΣΟ ΠΟΥ\nΑΝΑΛΟΓΕΙ', '', '', '', '', 'ΠΛΗΡΩΤΕΟ\nΠΟΣΟ', 'A/A'
    ]
    
    col_widths = [20, 35, 12, 12, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 12, 20, 8]
    
    for i, header in enumerate(headers):
        pdf.cell(col_widths[i], 10, header, border=1, fill=True, align='C')
    pdf.ln()
    
    # Sub-header row
    sub_headers = [
        '', '', 'ei', 'fi', 'ΘΕΡΜΙΔΕΣ', 'ΚΟΙΝΟΧΡΗΣΤΑ', 'ΑΝΕΛΚ/ΡΑΣ', 'ΘΕΡΜΑΝΣΗ', 
        'ΛΟΙΠΑ ΕΞΟΔΑ', 'ΕΞΟΔΑ\nΣΥΝΙΔΙΟΚΤΗΣ', 'ΚΟΙΝΟΧΡΗΣΤΑ', 'ΑΝΕΛΚ/ΡΑΣ', 'ΘΕΡΜΑΝΣΗ', 
        'ΛΟΙΠΑ ΕΞΟΔΑ', 'ΕΞΟΔΑ\nΣΥΝΙΔΙΟΚΤΗΣ', 'ΣΤΡΟΓΓ.', '', ''
    ]
    
    for i, header in enumerate(sub_headers):
        pdf.cell(col_widths[i], 8, header, border=1, fill=True, align='C')
    pdf.ln()
    
    # Sample data rows
    pdf.set_font('DejaVu', '', 7)
    pdf.set_fill_color(255, 255, 255)
    
    data_rows = [
        ['Α1', 'Γεώργιος Παπαδόπουλος', '0.150', '0.25', '1250', '85.50', '25.50', '85.50', '25.50', '0.00', '171.00€', '51.00€', '171.00€', '51.00€', '0.00€', '0.00€', '444.00€', '1'],
        ['Α2', 'Μαρία Κωνσταντίνου', '0.120', '0.20', '1000', '68.40', '20.40', '68.40', '20.40', '0.00', '136.80€', '40.80€', '136.80€', '40.80€', '0.00€', '0.00€', '355.20€', '2'],
        ['Α3', 'Νικόλαος Αλεξίου', '0.180', '0.30', '1500', '102.60', '30.60', '102.60', '30.60', '0.00', '205.20€', '61.20€', '205.20€', '61.20€', '0.00€', '0.00€', '532.80€', '3']
    ]
    
    for row in data_rows:
        for i, cell in enumerate(row):
            pdf.cell(col_widths[i], 6, cell, border=1, align='C')
        pdf.ln()
    
    # Totals row
    pdf.set_font('DejaVu', 'B', 7)
    pdf.set_fill_color(243, 244, 246)
    totals_row = ['ΣΥΝΟΛΑ', '', '0.450', '0.75', '3750', '256.50', '76.50', '256.50', '76.50', '0.00', '513.00€', '153.00€', '513.00€', '153.00€', '0.00€', '0.01€', '1,332.00€', '']
    
    for i, cell in enumerate(totals_row):
        pdf.cell(col_widths[i], 6, cell, border=1, fill=True, align='C')
    pdf.ln()
    
    pdf.ln(10)
    
    # Footer Information
    pdf.set_font('DejaVu', 'B', 10)
    footer_data = [
        ['ΗΜΕΡΟΜΗΝΙΑ ΕΚΔΟΣΗΣ:', '15 Αυγούστου 2025'],
        ['ΣΥΝΟΛΟ ΔΙΑΜΕΡΙΣΜΑΤΩΝ:', '3'],
        ['ΣΥΝΟΛΟ ΔΑΠΑΝΩΝ:', '5,550.00€']
    ]
    
    for row in footer_data:
        pdf.cell(50, 8, row[0])
        pdf.cell(50, 8, row[1])
        pdf.ln()
    
    pdf.ln(5)
    
    # Additional Notes
    pdf.set_font('DejaVu', '', 10)
    pdf.cell(0, 8, 'ΠΑΡΑΤΗΡΗΣΕΙΣ: ΕΙΣΠΡΑΞΗ ΚΟΙΝΟΧΡΗΣΤΩΝ: ΔΕΥΤΕΡΑ & ΤΕΤΑΡΤΗ ΑΠΟΓΕΥΜΑ', ln=True)
    
    # Save the PDF
    pdf.output("φυλλο_κοινοχρηστων_Αύγουστος_2025_2025-08-15.pdf")
    print("PDF created successfully: φυλλο_κοινοχρηστων_Αύγουστος_2025_2025-08-15.pdf")

if __name__ == "__main__":
    create_common_expenses_pdf()

