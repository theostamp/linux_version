#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script to generate a PDF with the exact elements from the Common Expenses Sheet
using WeasyPrint for proper Greek text support.
"""

from weasyprint import HTML, CSS
from weasyprint.text.fonts import FontConfiguration
import os

def create_common_expenses_pdf():
    """Create a PDF with the exact elements from the Common Expenses Sheet."""
    
    # HTML content with Greek text
    html_content = """
    <!DOCTYPE html>
    <html lang="el">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Φύλλο Κοινοχρήστων</title>
        <style>
            @page {
                size: A4;
                margin: 2cm;
                @top-center {
                    content: "Digital Concierge App - online έκδοση κοινοχρήστων";
                    font-size: 10pt;
                    color: #666;
                }
            }
            
            body {
                font-family: 'DejaVu Sans', Arial, sans-serif;
                font-size: 12pt;
                line-height: 1.4;
                color: #333;
            }
            
            .header {
                text-align: center;
                margin-bottom: 30px;
            }
            
            .title {
                font-size: 24pt;
                font-weight: bold;
                color: #1e40af;
                margin: 10px 0;
            }
            
            .subtitle {
                font-size: 18pt;
                font-weight: bold;
                color: #374151;
                margin: 10px 0;
            }
            
            .info-grid {
                display: table;
                width: 100%;
                margin: 20px 0;
                border-collapse: collapse;
            }
            
            .info-row {
                display: table-row;
            }
            
            .info-label {
                display: table-cell;
                width: 30%;
                padding: 8px;
                background-color: #f3f4f6;
                font-weight: bold;
                border: 1px solid #ddd;
            }
            
            .info-value {
                display: table-cell;
                width: 70%;
                padding: 8px;
                border: 1px solid #ddd;
            }
            
            .section-title {
                font-size: 16pt;
                font-weight: bold;
                color: #374151;
                margin: 20px 0 10px 0;
                border-bottom: 2px solid #1e40af;
                padding-bottom: 5px;
            }
            
            .expense-table {
                width: 100%;
                border-collapse: collapse;
                margin: 10px 0;
            }
            
            .expense-table th,
            .expense-table td {
                border: 1px solid #ddd;
                padding: 6px;
                text-align: left;
            }
            
            .expense-table th {
                background-color: #1e40af;
                color: white;
                font-weight: bold;
            }
            
            .expense-category {
                background-color: #1e40af;
                color: white;
                font-weight: bold;
            }
            
            .expense-total {
                background-color: #f3f4f6;
                font-weight: bold;
            }
            
            .grand-total {
                background-color: #1e40af;
                color: white;
                font-weight: bold;
                font-size: 14pt;
            }
            
            .analysis-table {
                width: 100%;
                border-collapse: collapse;
                margin: 20px 0;
                font-size: 8pt;
            }
            
            .analysis-table th,
            .analysis-table td {
                border: 1px solid #ddd;
                padding: 4px;
                text-align: center;
                vertical-align: middle;
            }
            
            .analysis-table th {
                background-color: #f3f4f6;
                font-weight: bold;
            }
            
            .totals-row {
                background-color: #f3f4f6;
                font-weight: bold;
            }
            
            .footer {
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #ddd;
            }
            
            .footer-grid {
                display: table;
                width: 100%;
            }
            
            .footer-row {
                display: table-row;
            }
            
            .footer-label {
                display: table-cell;
                width: 50%;
                font-weight: bold;
            }
            
            .footer-value {
                display: table-cell;
                width: 50%;
            }
            
            .notes {
                margin-top: 20px;
                font-style: italic;
                color: #666;
            }
        </style>
    </head>
    <body>
        <div class="header">
            <div class="title">Digital Concierge App</div>
            <div style="color: #666; font-size: 12pt;">online έκδοση κοινοχρήστων</div>
            <div class="title">Φύλλο Κοινοχρήστων</div>
            <div class="subtitle">Αύγουστος 2025</div>
        </div>
        
        <div class="info-grid">
            <div class="info-row">
                <div class="info-label">ΠΟΛΥΚΑΤΟΙΚΙΑ</div>
                <div class="info-value">Παράδειγμα Κτιρίου</div>
            </div>
            <div class="info-row">
                <div class="info-label">ΜΗΝΑΣ</div>
                <div class="info-value">Αύγουστος 2025</div>
            </div>
            <div class="info-row">
                <div class="info-label">ΔΙΑΧΕΙΡΙΣΤΗΣ</div>
                <div class="info-value">Διαχειριστής Κτιρίου</div>
            </div>
            <div class="info-row">
                <div class="info-label">ΛΗΞΗ ΠΛΗΡΩΜΗΣ</div>
                <div class="info-value">15 Σεπτεμβρίου 2025</div>
            </div>
        </div>
        
        <div class="section-title">ΑΝΑΛΥΣΗ ΔΑΠΑΝΩΝ ΠΟΛΥΚΑΤΟΙΚΙΑΣ</div>
        
        <table class="expense-table">
            <tr class="expense-category">
                <td colspan="2">Α. ΚΟΙΝΟΧΡΗΣΤΑ</td>
            </tr>
            <tr>
                <td>1. Ηλεκτρική ενέργεια</td>
                <td style="text-align: right;">1,250.00€</td>
            </tr>
            <tr>
                <td>2. Νερό</td>
                <td style="text-align: right;">450.00€</td>
            </tr>
            <tr>
                <td>3. Καθαρισμός</td>
                <td style="text-align: right;">300.00€</td>
            </tr>
            <tr class="expense-total">
                <td>ΣΥΝΟΛΟ</td>
                <td style="text-align: right;">2,000.00€</td>
            </tr>
            
            <tr class="expense-category">
                <td colspan="2">Β.  ΑΝΕΛΚΥΣΤΗΡΑΣ</td>
            </tr>
            <tr>
                <td>1. Συντήρηση ανελκυστήρα</td>
                <td style="text-align: right;">180.00€</td>
            </tr>
            <tr>
                <td>2. Ηλεκτρική ενέργεια ανελκυστήρα</td>
                <td style="text-align: right;">120.00€</td>
            </tr>
            <tr class="expense-total">
                <td>ΣΥΝΟΛΟ</td>
                <td style="text-align: right;">300.00€</td>
            </tr>
            
            <tr class="expense-category">
                <td colspan="2">Γ. ΘΕΡΜΑΝΣΗ</td>
            </tr>
            <tr>
                <td>1. Πετρέλαιο θέρμανσης</td>
                <td style="text-align: right;">2,500.00€</td>
            </tr>
            <tr>
                <td>2. Συντήρηση λέβητα</td>
                <td style="text-align: right;">200.00€</td>
            </tr>
            <tr class="expense-total">
                <td>ΣΥΝΟΛΟ</td>
                <td style="text-align: right;">2,700.00€</td>
            </tr>
            
            <tr class="expense-category">
                <td colspan="2">Δ. ΛΟΙΠΑ ΕΞΟΔΑ</td>
            </tr>
            <tr>
                <td>1. Ασφάλεια</td>
                <td style="text-align: right;">150.00€</td>
            </tr>
            <tr>
                <td>2. Διαχείριση</td>
                <td style="text-align: right;">400.00€</td>
            </tr>
            <tr class="expense-total">
                <td>ΣΥΝΟΛΟ</td>
                <td style="text-align: right;">550.00€</td>
            </tr>
            
            <tr class="expense-category">
                <td colspan="2">Ε. ΕΞΟΔΑ ΣΥΝΙΔΙΟΚΤΗΣΙΑΣ</td>
            </tr>
            <tr>
                <td>1. Ειδικές δαπάνες</td>
                <td style="text-align: right;">0.00€</td>
            </tr>
            <tr class="expense-total">
                <td>ΣΥΝΟΛΟ</td>
                <td style="text-align: right;">0.00€</td>
            </tr>
            
            <tr class="grand-total">
                <td>ΣΥΝΟΛΟ ΔΑΠΑΝΩΝ</td>
                <td style="text-align: right;">5,550.00€</td>
            </tr>
        </table>
        
        <div class="section-title">ΑΝΑΛΥΣΗ ΚΑΤΑ ΔΙΑΜΕΡΙΣΜΑΤΑ</div>
        
        <table class="analysis-table">
            <tr>
                <th rowspan="2">ΑΡΙΘΜΟΣ<br>ΔΙΑΜΕΡΙΣΜΑΤΟΣ</th>
                <th rowspan="2">ΟΝΟΜΑΤΕΠΩΝΥΜΟ</th>
                <th colspan="3">ΘΕΡΜΑΝΣΗ</th>
                <th colspan="5">ΧΙΛΙΟΣΤΑ ΣΥΜΜΕΤΟΧΗΣ</th>
                <th colspan="5">ΠΟΣΟ ΠΟΥ ΑΝΑΛΟΓΕΙ</th>
                <th rowspan="2">ΣΤΡΟΓΓ.</th>
                <th rowspan="2">ΠΛΗΡΩΤΕΟ<br>ΠΟΣΟ</th>
                <th rowspan="2">A/A</th>
            </tr>
            <tr>
                <th>ei</th>
                <th>fi</th>
                <th>ΘΕΡΜΙΔΕΣ</th>
                <th>ΚΟΙΝΟΧΡΗΣΤΑ</th>
                <th>ΑΝΕΛΚ/ΡΑΣ</th>
                <th>ΘΕΡΜΑΝΣΗ</th>
                <th>ΛΟΙΠΑ ΕΞΟΔΑ</th>
                <th>ΕΞΟΔΑ<br>ΣΥΝΙΔΙΟΚΤΗΣ</th>
                <th>ΚΟΙΝΟΧΡΗΣΤΑ</th>
                <th>ΑΝΕΛΚ/ΡΑΣ</th>
                <th>ΘΕΡΜΑΝΣΗ</th>
                <th>ΛΟΙΠΑ ΕΞΟΔΑ</th>
                <th>ΕΞΟΔΑ<br>ΣΥΝΙΔΙΟΚΤΗΣ</th>
            </tr>
            <tr>
                <td>Α1</td>
                <td>Γεώργιος Παπαδόπουλος</td>
                <td>0.150</td>
                <td>0.25</td>
                <td>1250</td>
                <td>85.50</td>
                <td>25.50</td>
                <td>85.50</td>
                <td>25.50</td>
                <td>0.00</td>
                <td>171.00€</td>
                <td>51.00€</td>
                <td>171.00€</td>
                <td>51.00€</td>
                <td>0.00€</td>
                <td>0.00€</td>
                <td>444.00€</td>
                <td>1</td>
            </tr>
            <tr>
                <td>Α2</td>
                <td>Μαρία Κωνσταντίνου</td>
                <td>0.120</td>
                <td>0.20</td>
                <td>1000</td>
                <td>68.40</td>
                <td>20.40</td>
                <td>68.40</td>
                <td>20.40</td>
                <td>0.00</td>
                <td>136.80€</td>
                <td>40.80€</td>
                <td>136.80€</td>
                <td>40.80€</td>
                <td>0.00€</td>
                <td>0.00€</td>
                <td>355.20€</td>
                <td>2</td>
            </tr>
            <tr>
                <td>Α3</td>
                <td>Νικόλαος Αλεξίου</td>
                <td>0.180</td>
                <td>0.30</td>
                <td>1500</td>
                <td>102.60</td>
                <td>30.60</td>
                <td>102.60</td>
                <td>30.60</td>
                <td>0.00</td>
                <td>205.20€</td>
                <td>61.20€</td>
                <td>205.20€</td>
                <td>61.20€</td>
                <td>0.00€</td>
                <td>0.00€</td>
                <td>532.80€</td>
                <td>3</td>
            </tr>
            <tr class="totals-row">
                <td>ΣΥΝΟΛΑ</td>
                <td></td>
                <td>0.450</td>
                <td>0.75</td>
                <td>3750</td>
                <td>256.50</td>
                <td>76.50</td>
                <td>256.50</td>
                <td>76.50</td>
                <td>0.00</td>
                <td>513.00€</td>
                <td>153.00€</td>
                <td>513.00€</td>
                <td>153.00€</td>
                <td>0.00€</td>
                <td>0.01€</td>
                <td>1,332.00€</td>
                <td></td>
            </tr>
        </table>
        
        <div class="footer">
            <div class="footer-grid">
                <div class="footer-row">
                    <div class="footer-label">ΗΜΕΡΟΜΗΝΙΑ ΕΚΔΟΣΗΣ:</div>
                    <div class="footer-value">15 Αυγούστου 2025</div>
                </div>
                <div class="footer-row">
                    <div class="footer-label">ΣΥΝΟΛΟ ΔΙΑΜΕΡΙΣΜΑΤΩΝ:</div>
                    <div class="footer-value">3</div>
                </div>
                <div class="footer-row">
                    <div class="footer-label">ΣΥΝΟΛΟ ΔΑΠΑΝΩΝ:</div>
                    <div class="footer-value">5,550.00€</div>
                </div>
            </div>
            
            <div class="notes">
                ΠΑΡΑΤΗΡΗΣΕΙΣ: ΕΙΣΠΡΑΞΗ ΚΟΙΝΟΧΡΗΣΤΩΝ: ΔΕΥΤΕΡΑ & ΤΕΤΑΡΤΗ ΑΠΟΓΕΥΜΑ
            </div>
        </div>
    </body>
    </html>
    """
    
    # Create PDF
    font_config = FontConfiguration()
    html = HTML(string=html_content)
    css = CSS(string='', font_config=font_config)
    
    html.write_pdf(
        "φυλλο_κοινοχρηστων_Αύγουστος_2025_2025-08-15.pdf",
        stylesheets=[css],
        font_config=font_config
    )
    
    print("PDF created successfully: φυλλο_κοινοχρηστων_Αύγουστος_2025_2025-08-15.pdf")

if __name__ == "__main__":
    create_common_expenses_pdf()

