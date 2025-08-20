#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Final script to generate a high-quality PDF with the exact elements from the Common Expenses Sheet
using WeasyPrint for proper Greek text support and professional formatting.
"""

from weasyprint import HTML, CSS
from weasyprint.text.fonts import FontConfiguration
import os

def create_final_common_expenses_pdf():
    """Create a professional PDF with the exact elements from the Common Expenses Sheet."""
    
    # HTML content with Greek text and professional styling
    html_content = """
    <!DOCTYPE html>
    <html lang="el">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Φύλλο Κοινοχρήστων - Αύγουστος 2025</title>
        <style>
            @page {
                size: A4;
                margin: 1.5cm;
                @top-center {
                    content: "Digital Concierge App - online έκδοση κοινοχρήστων";
                    font-size: 9pt;
                    color: #666;
                    font-family: 'DejaVu Sans', Arial, sans-serif;
                }
                @bottom-center {
                    content: "Σελίδα " counter(page) " από " counter(pages);
                    font-size: 9pt;
                    color: #666;
                    font-family: 'DejaVu Sans', Arial, sans-serif;
                }
            }
            
            body {
                font-family: 'DejaVu Sans', Arial, sans-serif;
                font-size: 11pt;
                line-height: 1.3;
                color: #333;
                margin: 0;
                padding: 0;
            }
            
            .header {
                text-align: center;
                margin-bottom: 25px;
                border-bottom: 3px solid #1e40af;
                padding-bottom: 15px;
            }
            
            .brand {
                font-size: 20pt;
                font-weight: bold;
                color: #1e40af;
                margin: 5px 0;
                letter-spacing: 1px;
            }
            
            .subtitle {
                font-size: 10pt;
                color: #666;
                margin: 5px 0;
            }
            
            .main-title {
                font-size: 22pt;
                font-weight: bold;
                color: #1e40af;
                margin: 10px 0;
                text-transform: uppercase;
            }
            
            .period {
                font-size: 16pt;
                font-weight: bold;
                color: #374151;
                margin: 5px 0;
            }
            
            .info-section {
                margin: 20px 0;
            }
            
            .info-grid {
                display: table;
                width: 100%;
                border-collapse: collapse;
                margin: 15px 0;
            }
            
            .info-row {
                display: table-row;
            }
            
            .info-label {
                display: table-cell;
                width: 20%;
                padding: 10px;
                background-color: #f8fafc;
                font-weight: bold;
                border: 1px solid #e2e8f0;
                color: #374151;
                font-size: 10pt;
            }
            
            .info-value {
                display: table-cell;
                width: 80%;
                padding: 10px;
                border: 1px solid #e2e8f0;
                background-color: #ffffff;
                font-size: 11pt;
            }
            
            .section-title {
                font-size: 14pt;
                font-weight: bold;
                color: #1e40af;
                margin: 25px 0 15px 0;
                padding: 8px 0;
                border-bottom: 2px solid #1e40af;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            
            .expense-breakdown {
                margin: 20px 0;
            }
            
            .expense-table {
                width: 100%;
                border-collapse: collapse;
                margin: 10px 0;
                font-size: 10pt;
            }
            
            .expense-table th,
            .expense-table td {
                border: 1px solid #d1d5db;
                padding: 8px;
                text-align: left;
                vertical-align: middle;
            }
            
            .expense-category {
                background-color: #1e40af;
                color: white;
                font-weight: bold;
                font-size: 11pt;
                text-align: center;
            }
            
            .expense-item {
                background-color: #ffffff;
            }
            
            .expense-total {
                background-color: #f1f5f9;
                font-weight: bold;
                color: #1e293b;
            }
            
            .grand-total {
                background-color: #1e40af;
                color: white;
                font-weight: bold;
                font-size: 12pt;
                text-align: center;
            }
            
            .amount {
                text-align: right;
                font-family: 'DejaVu Sans Mono', monospace;
            }
            
            .analysis-section {
                margin: 25px 0;
            }
            
            .analysis-table {
                width: 100%;
                border-collapse: collapse;
                margin: 15px 0;
                font-size: 7pt;
            }
            
            .analysis-table th,
            .analysis-table td {
                border: 1px solid #d1d5db;
                padding: 4px 2px;
                text-align: center;
                vertical-align: middle;
            }
            
            .analysis-table th {
                background-color: #f8fafc;
                font-weight: bold;
                color: #374151;
                font-size: 7pt;
            }
            
            .analysis-table .header-row th {
                background-color: #1e40af;
                color: white;
                font-weight: bold;
            }
            
            .analysis-table .participation-header th {
                background-color: #dc2626;
                color: white;
                font-weight: bold;
            }
            
            .analysis-table .amount-header th {
                background-color: #ea580c;
                color: white;
                font-weight: bold;
            }
            
            .no-expenses-note {
                font-style: italic;
                color: #666;
                font-size: 9pt;
                margin-left: 15px;
            }
            
            .totals-row {
                background-color: #f1f5f9;
                font-weight: bold;
                color: #1e293b;
            }
            
            .apartment-number {
                font-weight: bold;
                color: #1e40af;
            }
            
            .owner-name {
                text-align: left;
                padding-left: 8px;
            }
            
            .footer-section {
                margin-top: 30px;
                padding-top: 20px;
                border-top: 2px solid #e2e8f0;
            }
            
            .footer-grid {
                display: table;
                width: 100%;
                margin: 15px 0;
            }
            
            .footer-row {
                display: table-row;
            }
            
            .footer-label {
                display: table-cell;
                width: 40%;
                font-weight: bold;
                color: #374151;
                padding: 5px 0;
            }
            
            .footer-value {
                display: table-cell;
                width: 60%;
                color: #1e293b;
                padding: 5px 0;
            }
            
            .notes {
                margin-top: 20px;
                padding: 15px;
                background-color: #fef3c7;
                border-left: 4px solid #f59e0b;
                font-style: italic;
                color: #92400e;
                font-size: 10pt;
            }
            
            .page-break {
                page-break-before: always;
            }
        </style>
    </head>
    <body>
        <div class="header">
            <div class="brand">Digital Concierge App</div>
            <div class="subtitle">online έκδοση κοινοχρήστων</div>
            <div class="main-title">Φύλλο Κοινοχρήστων</div>
            <div class="period">Αύγουστος 2025</div>
        </div>
        
        <div class="info-section">
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
        </div>
        
        <div class="expense-breakdown">
            <div class="section-title">ΑΝΑΛΥΣΗ ΔΑΠΑΝΩΝ ΠΟΛΥΚΑΤΟΙΚΙΑΣ</div>
            
            <table class="expense-table">
                <tr class="expense-category">
                    <td colspan="2">Α. ΚΟΙΝΟΧΡΗΣΤΑ</td>
                </tr>
                <tr class="expense-item">
                    <td>1. Ηλεκτρική ενέργεια</td>
                    <td class="amount">1,250.00€</td>
                </tr>
                <tr class="expense-item">
                    <td>2. Νερό</td>
                    <td class="amount">450.00€</td>
                </tr>
                <tr class="expense-item">
                    <td>3. Καθαρισμός</td>
                    <td class="amount">300.00€</td>
                </tr>
                <tr class="expense-total">
                    <td>ΣΥΝΟΛΟ</td>
                    <td class="amount">2,000.00€</td>
                </tr>
                
                <tr class="expense-category">
                    <td colspan="2">Β.  ΑΝΕΛΚΥΣΤΗΡΑΣ</td>
                </tr>
                <tr class="expense-item">
                    <td>1. Συντήρηση ανελκυστήρα</td>
                    <td class="amount">180.00€</td>
                </tr>
                <tr class="expense-item">
                    <td>2. Ηλεκτρική ενέργεια ανελκυστήρα</td>
                    <td class="amount">120.00€</td>
                </tr>
                <tr class="expense-total">
                    <td>ΣΥΝΟΛΟ</td>
                    <td class="amount">300.00€</td>
                </tr>
                
                <tr class="expense-category">
                    <td colspan="2">Γ. ΘΕΡΜΑΝΣΗ</td>
                </tr>
                <tr class="expense-item">
                    <td>1. Πετρέλαιο θέρμανσης</td>
                    <td class="amount">2,500.00€</td>
                </tr>
                <tr class="expense-item">
                    <td>2. Συντήρηση λέβητα</td>
                    <td class="amount">200.00€</td>
                </tr>
                <tr class="expense-total">
                    <td>ΣΥΝΟΛΟ</td>
                    <td class="amount">2,700.00€</td>
                </tr>
                
                <tr class="expense-category">
                    <td colspan="2">Δ. ΛΟΙΠΑ ΕΞΟΔΑ</td>
                </tr>
                <tr class="expense-item">
                    <td>1. Ασφάλεια</td>
                    <td class="amount">150.00€</td>
                </tr>
                <tr class="expense-item">
                    <td>2. Διαχείριση</td>
                    <td class="amount">400.00€</td>
                </tr>
                <tr class="expense-total">
                    <td>ΣΥΝΟΛΟ</td>
                    <td class="amount">550.00€</td>
                </tr>
                
                <tr class="expense-category">
                    <td colspan="2">Ε. ΕΞΟΔΑ ΣΥΝΙΔΙΟΚΤΗΣΙΑΣ</td>
                </tr>
                <tr class="expense-item">
                    <td>1. Ειδικές δαπάνες</td>
                    <td class="amount">0.00€</td>
                </tr>
                <tr class="expense-total">
                    <td>ΣΥΝΟΛΟ</td>
                    <td class="amount">0.00€</td>
                </tr>
                
                <tr class="grand-total">
                    <td>ΣΥΝΟΛΟ ΔΑΠΑΝΩΝ</td>
                    <td class="amount">5,550.00€</td>
                </tr>
            </table>
        </div>
        
        <div class="analysis-section">
            <div class="section-title">
                ΑΝΑΛΥΣΗ ΚΑΤΑ ΔΙΑΜΕΡΙΣΜΑΤΑ
                <span class="no-expenses-note"> </span>
            </div>
            
            <table class="analysis-table">
                <tr class="header-row">
                    <th rowspan="3">ΑΡΙΘΜΟΣ<br>ΔΙΑΜΕΡΙΣΜΑΤΟΣ</th>
                    <th rowspan="3">ΟΝΟΜΑΤΕΠΩΝΥΜΟ</th>
                    <th colspan="3">ΘΕΡΜΑΝΣΗ</th>
                    <th colspan="6">ΧΙΛΙΟΣΤΑ ΣΥΜΜΕΤΟΧΗΣ</th>
                    <th colspan="8">ΔΑΠΑΝΕΣ</th>
                    <th rowspan="3">ΣΤΡΟΓΓ.</th>
                    <th rowspan="3">ΠΛΗΡΩΤΕΟ<br>ΠΟΣΟ</th>
                    <th rowspan="3">A/A</th>
                </tr>
                <tr class="participation-header">
                    <th>ei</th>
                    <th>fi</th>
                    <th>ΘΕΡΜΙΔΕΣ</th>
                    <th>ΚΟΙΝΟΧΡΗΣΤΑ</th>
                    <th>ΑΝΕΛΚ/ΡΑΣ</th>
                    <th>ΘΕΡΜΑΝΣΗ</th>
                    <th>ΛΟΙΠΑ ΕΞΟΔΑ</th>
                    <th>ΕΞΟΔΑ<br>ΣΥΝΙΔΙΟΚΤΗΣ</th>
                    <th>ΕΠΙΠΛΕΟΝ<br>ΔΑΠΑΝΕΣ</th>
                    <th colspan="6">ΠΟΣΟ ΠΟΥ ΑΝΑΛΟΓΕΙ</th>
                </tr>
                <tr class="amount-header">
                    <th></th>
                    <th></th>
                    <th></th>
                    <th></th>
                    <th></th>
                    <th></th>
                    <th></th>
                    <th></th>
                    <th></th>
                    <th>ΚΟΙΝΟΧΡΗΣΤΑ</th>
                    <th>ΑΝΕΛΚ/ΡΑΣ</th>
                    <th>ΘΕΡΜΑΝΣΗ</th>
                    <th>ΛΟΙΠΑ ΕΞΟΔΑ</th>
                    <th>ΕΞΟΔΑ<br>ΣΥΝΙΔΙΟΚΤΗΣ</th>
                    <th>ΕΠΙΠΛΕΟΝ<br>ΔΑΠΑΝΕΣ</th>
                </tr>
                <tr>
                    <td class="apartment-number">Α1</td>
                    <td class="owner-name">Γεώργιος Παπαδόπουλος</td>
                    <td>0.150</td>
                    <td>0.25</td>
                    <td>1250</td>
                    <td>85.50</td>
                    <td>25.50</td>
                    <td>85.50</td>
                    <td>25.50</td>
                    <td>0.00</td>
                    <td>0.00</td>
                    <td>171.00€</td>
                    <td>51.00€</td>
                    <td>171.00€</td>
                    <td>51.00€</td>
                    <td>0.00€</td>
                    <td>0.00€</td>
                    <td>0.00€</td>
                    <td>444.00€</td>
                    <td>1</td>
                </tr>
                <tr>
                    <td class="apartment-number">Α2</td>
                    <td class="owner-name">Μαρία Κωνσταντίνου</td>
                    <td>0.120</td>
                    <td>0.20</td>
                    <td>1000</td>
                    <td>68.40</td>
                    <td>20.40</td>
                    <td>68.40</td>
                    <td>20.40</td>
                    <td>0.00</td>
                    <td>0.00</td>
                    <td>136.80€</td>
                    <td>40.80€</td>
                    <td>136.80€</td>
                    <td>40.80€</td>
                    <td>0.00€</td>
                    <td>0.00€</td>
                    <td>0.00€</td>
                    <td>355.20€</td>
                    <td>2</td>
                </tr>
                <tr>
                    <td class="apartment-number">Α3</td>
                    <td class="owner-name">Νικόλαος Αλεξίου</td>
                    <td>0.180</td>
                    <td>0.30</td>
                    <td>1500</td>
                    <td>102.60</td>
                    <td>30.60</td>
                    <td>102.60</td>
                    <td>30.60</td>
                    <td>0.00</td>
                    <td>0.00</td>
                    <td>205.20€</td>
                    <td>61.20€</td>
                    <td>205.20€</td>
                    <td>61.20€</td>
                    <td>0.00€</td>
                    <td>0.00€</td>
                    <td>0.00€</td>
                    <td>532.80€</td>
                    <td>3</td>
                </tr>
                <tr class="totals-row">
                    <td><strong>ΣΥΝΟΛΑ</strong></td>
                    <td></td>
                    <td>0.450</td>
                    <td>0.75</td>
                    <td>3750</td>
                    <td>256.50</td>
                    <td>76.50</td>
                    <td>256.50</td>
                    <td>76.50</td>
                    <td>0.00</td>
                    <td>0.00</td>
                    <td>513.00€</td>
                    <td>153.00€</td>
                    <td>513.00€</td>
                    <td>153.00€</td>
                    <td>0.00€</td>
                    <td>0.01€</td>
                    <td>0.00€</td>
                    <td>1,332.00€</td>
                    <td></td>
                </tr>
            </table>
        </div>
        
        <div class="footer-section">
            <div class="notes">
                <strong>ΠΑΡΑΤΗΡΗΣΕΙΣ:</strong> ΕΙΣΠΡΑΞΗ ΚΟΙΝΟΧΡΗΣΤΩΝ: ΔΕΥΤΕΡΑ & ΤΕΤΑΡΤΗ ΑΠΟΓΕΥΜΑ
            </div>
            
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
        </div>
    </body>
    </html>
    """
    
    # Create PDF with proper font configuration
    font_config = FontConfiguration()
    html = HTML(string=html_content)
    css = CSS(string='', font_config=font_config)
    
    # Generate the PDF
    html.write_pdf(
        "φυλλο_κοινοχρηστων_Αύγουστος_2025_2025-08-15.pdf",
        stylesheets=[css],
        font_config=font_config
    )
    
    print("✅ PDF created successfully: φυλλο_κοινοχρηστων_Αύγουστος_2025_2025-08-15.pdf")
    print("📄 The PDF contains all the exact elements from the Common Expenses Sheet:")
    print("   • Header with Digital Concierge App branding")
    print("   • Building information grid")
    print("   • Complete expense breakdown by category")
    print("   • Detailed apartment analysis table")
    print("   • Footer with issue date and totals")
    print("   • Professional formatting with Greek text support")

if __name__ == "__main__":
    create_final_common_expenses_pdf()

