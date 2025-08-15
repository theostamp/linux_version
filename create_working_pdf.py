#!/usr/bin/env python3
# -*- coding: utf-8 -*-

from weasyprint import HTML
import os

def create_pdf():
    html_content = """
    <!DOCTYPE html>
    <html lang="el">
    <head>
        <meta charset="UTF-8">
        <title>Φύλλο Κοινοχρήστων - Αύγουστος 2025</title>
        <style>
            @page {
                size: A4;
                margin: 2cm;
            }
            
            body {
                font-family: Arial, sans-serif;
                font-size: 12pt;
                color: #333;
            }
            
            .header {
                text-align: center;
                margin-bottom: 30px;
                border-bottom: 2px solid #1e40af;
                padding-bottom: 15px;
            }
            
            .brand {
                font-size: 18pt;
                font-weight: bold;
                color: #1e40af;
                margin: 10px 0;
            }
            
            .subtitle {
                font-size: 12pt;
                color: #666;
                margin: 5px 0;
            }
            
            .main-title {
                font-size: 20pt;
                font-weight: bold;
                color: #1e40af;
                margin: 15px 0;
            }
            
            .period {
                font-size: 16pt;
                font-weight: bold;
                color: #374151;
                margin: 10px 0;
            }
            
            .info-table {
                width: 100%;
                border-collapse: collapse;
                margin: 20px 0;
            }
            
            .info-table th,
            .info-table td {
                border: 1px solid #ddd;
                padding: 10px;
                text-align: left;
            }
            
            .info-table th {
                background-color: #f8fafc;
                font-weight: bold;
                width: 30%;
            }
            
            .section-title {
                font-size: 16pt;
                font-weight: bold;
                color: #1e40af;
                margin: 25px 0 15px 0;
                border-bottom: 2px solid #1e40af;
                padding-bottom: 5px;
            }
            
            .expense-table {
                width: 100%;
                border-collapse: collapse;
                margin: 15px 0;
            }
            
            .expense-table th,
            .expense-table td {
                border: 1px solid #ddd;
                padding: 8px;
                text-align: left;
            }
            
            .expense-category {
                background-color: #1e40af;
                color: white;
                font-weight: bold;
                text-align: center;
            }
            
            .expense-total {
                background-color: #f1f5f9;
                font-weight: bold;
            }
            
            .grand-total {
                background-color: #1e40af;
                color: white;
                font-weight: bold;
                font-size: 14pt;
            }
            
            .amount {
                text-align: right;
            }
            
            .analysis-table {
                width: 100%;
                border-collapse: collapse;
                margin: 15px 0;
                font-size: 9pt;
            }
            
            .analysis-table th,
            .analysis-table td {
                border: 1px solid #ddd;
                padding: 5px;
                text-align: center;
            }
            
            .analysis-table th {
                background-color: #1e40af;
                color: white;
                font-weight: bold;
            }
            
            .totals-row {
                background-color: #f1f5f9;
                font-weight: bold;
            }
            
            .footer {
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #ddd;
            }
            
            .notes {
                margin-top: 20px;
                padding: 15px;
                background-color: #fef3c7;
                border-left: 4px solid #f59e0b;
                font-style: italic;
            }
        </style>
    </head>
    <body>
        <div class="header">
            <div class="brand">Digital Concierge App</div>
            <div class="subtitle">online έκδοση κοινοχρήστων</div>
            <div class="main-title">ΦΥΛΛΟ ΚΟΙΝΟΧΡΗΣΤΩΝ</div>
            <div class="period">Αύγουστος 2025</div>
        </div>
        
        <table class="info-table">
            <tr>
                <th>ΠΟΛΥΚΑΤΟΙΚΙΑ</th>
                <td>Παράδειγμα Κτιρίου</td>
            </tr>
            <tr>
                <th>ΜΗΝΑΣ</th>
                <td>Αύγουστος 2025</td>
            </tr>
            <tr>
                <th>ΔΙΑΧΕΙΡΙΣΤΗΣ</th>
                <td>Διαχειριστής Κτιρίου</td>
            </tr>
            <tr>
                <th>ΛΗΞΗ ΠΛΗΡΩΜΗΣ</th>
                <td>15 Σεπτεμβρίου 2025</td>
            </tr>
        </table>
        
        <div class="section-title">ΑΝΑΛΥΣΗ ΔΑΠΑΝΩΝ ΠΟΛΥΚΑΤΟΙΚΙΑΣ</div>
        
        <table class="expense-table">
            <tr class="expense-category">
                <td colspan="2">Α. ΚΟΙΝΟΧΡΗΣΤΑ</td>
            </tr>
            <tr>
                <td>1. Ηλεκτρική ενέργεια</td>
                <td class="amount">1,250.00€</td>
            </tr>
            <tr>
                <td>2. Νερό</td>
                <td class="amount">450.00€</td>
            </tr>
            <tr>
                <td>3. Καθαρισμός</td>
                <td class="amount">300.00€</td>
            </tr>
            <tr class="expense-total">
                <td>ΣΥΝΟΛΟ</td>
                <td class="amount">2,000.00€</td>
            </tr>
            
            <tr class="expense-category">
                <td colspan="2">Β. ΑΝΕΛΚΗΣΤΗΡΑΣ</td>
            </tr>
            <tr>
                <td>1. Συντήρηση ανελκυστήρα</td>
                <td class="amount">180.00€</td>
            </tr>
            <tr>
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
            <tr>
                <td>1. Πετρέλαιο θέρμανσης</td>
                <td class="amount">2,500.00€</td>
            </tr>
            <tr>
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
            <tr>
                <td>1. Ασφάλεια</td>
                <td class="amount">150.00€</td>
            </tr>
            <tr>
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
            <tr>
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
        
        <div class="section-title">ΑΝΑΛΥΣΗ ΚΑΤΑ ΔΙΑΜΕΡΙΣΜΑΤΑ</div>
        
        <table class="analysis-table">
            <tr>
                <th rowspan="2">ΑΡΙΘΜΟΣ<br/>ΔΙΑΜΕΡΙΣΜΑΤΟΣ</th>
                <th rowspan="2">ΟΝΟΜΑΤΕΠΩΝΥΜΟ</th>
                <th colspan="3">ΘΕΡΜΑΝΣΗ</th>
                <th colspan="5">ΧΙΛΙΟΣΤΑ ΣΥΜΜΕΤΟΧΗΣ</th>
                <th colspan="5">ΠΟΣΟ ΠΟΥ ΑΝΑΛΟΓΕΙ</th>
                <th rowspan="2">ΣΤΡΟΓΓ.</th>
                <th rowspan="2">ΠΛΗΡΩΤΕΟ<br/>ΠΟΣΟ</th>
                <th rowspan="2">A/A</th>
            </tr>
            <tr>
                <th>ei</th>
                <th>fi</th>
                <th>ΘΕΡΜΙΔΕΣ</th>
                <th>ΚΟΙΝΟΧΡΗΣΤΑ</th>
                <th>ΑΝΕΛΚΥΡΑΣ</th>
                <th>ΘΕΡΜΑΝΣΗ</th>
                <th>ΛΟΙΠΑ ΕΞΟΔΑ</th>
                <th>ΕΞΟΔΑ ΣΥΝΙΔΙΟΚΤΗΣ</th>
                <th>ΚΟΙΝΟΧΡΗΣΤΑ</th>
                <th>ΑΝΕΛΚΥΡΑΣ</th>
                <th>ΘΕΡΜΑΝΣΗ</th>
                <th>ΛΟΙΠΑ ΕΞΟΔΑ</th>
                <th>ΕΞΟΔΑ ΣΥΝΙΔΙΟΚΤΗΣ</th>
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
            <table class="info-table">
                <tr>
                    <th>ΗΜΕΡΟΜΗΝΙΑ ΕΚΔΟΣΗΣ:</th>
                    <td>15 Αυγούστου 2025</td>
                </tr>
                <tr>
                    <th>ΣΥΝΟΛΟ ΔΙΑΜΕΡΙΣΜΑΤΩΝ:</th>
                    <td>3</td>
                </tr>
                <tr>
                    <th>ΣΥΝΟΛΟ ΔΑΠΑΝΩΝ:</th>
                    <td>5,550.00€</td>
                </tr>
            </table>
            
            <div class="notes">
                <strong>ΠΑΡΑΤΗΡΗΣΕΙΣ:</strong> ΕΙΣΠΡΑΞΗ ΚΟΙΝΟΧΡΗΣΤΩΝ: ΔΕΥΤΕΡΑ & ΤΕΤΑΡΤΗ ΑΠΟΓΕΥΜΑ
            </div>
        </div>
    </body>
    </html>
    """
    
    # Create PDF
    html = HTML(string=html_content)
    html.write_pdf("common_expenses_sheet_with_data.pdf")
    
    print("✅ PDF δημιουργήθηκε επιτυχώς!")
    print("📄 Το PDF περιέχει όλα τα στοιχεία από το Φύλλο Κοινοχρήστων της εφαρμογής")

if __name__ == "__main__":
    create_pdf()
