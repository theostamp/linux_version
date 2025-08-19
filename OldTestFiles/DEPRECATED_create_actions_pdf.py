#!/usr/bin/env python3
# -*- coding: utf-8 -*-

from weasyprint import HTML
import os

def create_actions_pdf():
    html_content = """
    <!DOCTYPE html>
    <html lang="el">
    <head>
        <meta charset="UTF-8">
        <title>Ενέργειες Κοινοχρήστων - 10 Διαμερίσματα</title>
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
            
            .apartment-count {
                font-size: 14pt;
                font-weight: bold;
                color: #374151;
                margin: 10px 0;
            }
            
            .actions-section {
                margin: 20px 0;
                padding: 15px;
                background-color: #f8fafc;
                border-left: 4px solid #1e40af;
            }
            
            .action-title {
                font-size: 16pt;
                font-weight: bold;
                color: #1e40af;
                margin-bottom: 10px;
            }
            
            .action-description {
                font-size: 12pt;
                color: #666;
                margin-bottom: 15px;
            }
            
            .tools-section {
                margin: 20px 0;
            }
            
            .tools-title {
                font-size: 14pt;
                font-weight: bold;
                color: #374151;
                margin-bottom: 10px;
                border-bottom: 1px solid #e2e8f0;
                padding-bottom: 5px;
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
                font-size: 8pt;
            }
            
            .analysis-table th,
            .analysis-table td {
                border: 1px solid #ddd;
                padding: 4px;
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
            
            .action-box {
                background-color: #ecfdf5;
                border: 1px solid #10b981;
                border-radius: 8px;
                padding: 15px;
                margin: 15px 0;
            }
            
            .action-box .title {
                font-weight: bold;
                color: #065f46;
                margin-bottom: 8px;
            }
            
            .action-box .description {
                color: #047857;
                font-size: 11pt;
            }
        </style>
    </head>
    <body>
        <div class="header">
            <div class="brand">Digital Concierge App</div>
            <div class="subtitle">online έκδοση κοινοχρήστων</div>
            <div class="main-title">ΕΝΕΡΓΕΙΕΣ ΚΟΙΝΟΧΡΗΣΤΩΝ</div>
            <div class="apartment-count">10 Διαμερίσματα</div>
        </div>
        
        <div class="actions-section">
            <div class="action-title">Έκδοση Κοινοχρήστων</div>
            <div class="action-description">Τελική έκδοση και αποστολή</div>
            
            <div class="tools-title">Εργαλεία Εξαγωγής & Προβολής</div>
            
            <div class="action-box">
                <div class="title">Εξαγωγή PDF</div>
                <div class="description">Πλήρες αρχείο με όλα τα στοιχεία κοινοχρήστων</div>
            </div>
        </div>
        
        <table class="info-table">
            <tr>
                <th>ΠΟΛΥΚΑΤΟΙΚΙΑ</th>
                <td>Κτίριο 10 Διαμερισμάτων</td>
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
            <tr>
                <th>ΑΡΙΘΜΟΣ ΔΙΑΜΕΡΙΣΜΑΤΩΝ</th>
                <td>10</td>
            </tr>
        </table>
        
        <div class="section-title">ΑΝΑΛΥΣΗ ΔΑΠΑΝΩΝ ΠΟΛΥΚΑΤΟΙΚΙΑΣ</div>
        
        <table class="expense-table">
            <tr class="expense-category">
                <td colspan="2">Α. ΚΟΙΝΟΧΡΗΣΤΑ</td>
            </tr>
            <tr>
                <td>1. Ηλεκτρική ενέργεια</td>
                <td class="amount">2,850.00€</td>
            </tr>
            <tr>
                <td>2. Νερό</td>
                <td class="amount">1,120.00€</td>
            </tr>
            <tr>
                <td>3. Καθαρισμός</td>
                <td class="amount">650.00€</td>
            </tr>
            <tr>
                <td>4. Φωτισμός κοινόχρηστων χώρων</td>
                <td class="amount">180.00€</td>
            </tr>
            <tr class="expense-total">
                <td>ΣΥΝΟΛΟ</td>
                <td class="amount">4,800.00€</td>
            </tr>
            
            <tr class="expense-category">
                <td colspan="2">Β. ΑΝΕΛΚΗΣΤΗΡΑΣ</td>
            </tr>
            <tr>
                <td>1. Συντήρηση ανελκυστήρα</td>
                <td class="amount">420.00€</td>
            </tr>
            <tr>
                <td>2. Ηλεκτρική ενέργεια ανελκυστήρα</td>
                <td class="amount">280.00€</td>
            </tr>
            <tr>
                <td>3. Ετήσια επιθεώρηση</td>
                <td class="amount">150.00€</td>
            </tr>
            <tr class="expense-total">
                <td>ΣΥΝΟΛΟ</td>
                <td class="amount">850.00€</td>
            </tr>
            
            <tr class="expense-category">
                <td colspan="2">Γ. ΘΕΡΜΑΝΣΗ</td>
            </tr>
            <tr>
                <td>1. Πετρέλαιο θέρμανσης</td>
                <td class="amount">5,200.00€</td>
            </tr>
            <tr>
                <td>2. Συντήρηση λέβητα</td>
                <td class="amount">380.00€</td>
            </tr>
            <tr>
                <td>3. Καθαρισμός καυστήρα</td>
                <td class="amount">120.00€</td>
            </tr>
            <tr class="expense-total">
                <td>ΣΥΝΟΛΟ</td>
                <td class="amount">5,700.00€</td>
            </tr>
            
            <tr class="expense-category">
                <td colspan="2">Δ. ΛΟΙΠΑ ΕΞΟΔΑ</td>
            </tr>
            <tr>
                <td>1. Ασφάλεια πολυκατοικίας</td>
                <td class="amount">350.00€</td>
            </tr>
            <tr>
                <td>2. Διαχείριση κτιρίου</td>
                <td class="amount">800.00€</td>
            </tr>
            <tr>
                <td>3. Συντήρηση κήπου</td>
                <td class="amount">250.00€</td>
            </tr>
            <tr>
                <td>4. Επισκευές κοινόχρηστων</td>
                <td class="amount">400.00€</td>
            </tr>
            <tr class="expense-total">
                <td>ΣΥΝΟΛΟ</td>
                <td class="amount">1,800.00€</td>
            </tr>
            
            <tr class="expense-category">
                <td colspan="2">Ε. ΕΞΟΔΑ ΣΥΝΙΔΙΟΚΤΗΣΙΑΣ</td>
            </tr>
            <tr>
                <td>1. Νομικά έξοδα</td>
                <td class="amount">200.00€</td>
            </tr>
            <tr>
                <td>2. Λογιστικά έξοδα</td>
                <td class="amount">150.00€</td>
            </tr>
            <tr class="expense-total">
                <td>ΣΥΝΟΛΟ</td>
                <td class="amount">350.00€</td>
            </tr>
            
            <tr class="grand-total">
                <td>ΣΥΝΟΛΟ ΔΑΠΑΝΩΝ</td>
                <td class="amount">13,500.00€</td>
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
                <td>0.120</td>
                <td>0.22</td>
                <td>1890</td>
                <td>95.0</td>
                <td>85.0</td>
                <td>95.0</td>
                <td>90.0</td>
                <td>35.0</td>
                <td>456.00€</td>
                <td>72.25€</td>
                <td>541.50€</td>
                <td>162.00€</td>
                <td>31.50€</td>
                <td>0.25€</td>
                <td>1,263.50€</td>
                <td>1</td>
            </tr>
            <tr>
                <td>Α2</td>
                <td>Μαρία Κωνσταντίνου</td>
                <td>0.110</td>
                <td>0.18</td>
                <td>1650</td>
                <td>88.0</td>
                <td>78.0</td>
                <td>88.0</td>
                <td>85.0</td>
                <td>32.0</td>
                <td>422.40€</td>
                <td>66.30€</td>
                <td>501.60€</td>
                <td>153.00€</td>
                <td>28.80€</td>
                <td>0.30€</td>
                <td>1,172.40€</td>
                <td>2</td>
            </tr>
            <tr>
                <td>Α3</td>
                <td>Νικόλαος Αλεξίου</td>
                <td>0.135</td>
                <td>0.25</td>
                <td>2150</td>
                <td>110.0</td>
                <td>98.0</td>
                <td>110.0</td>
                <td>105.0</td>
                <td>40.0</td>
                <td>528.00€</td>
                <td>83.30€</td>
                <td>627.00€</td>
                <td>189.00€</td>
                <td>36.00€</td>
                <td>0.20€</td>
                <td>1,463.50€</td>
                <td>3</td>
            </tr>
            <tr>
                <td>Β1</td>
                <td>Αννα Γεωργίου</td>
                <td>0.095</td>
                <td>0.15</td>
                <td>1320</td>
                <td>75.0</td>
                <td>68.0</td>
                <td>75.0</td>
                <td>72.0</td>
                <td>28.0</td>
                <td>360.00€</td>
                <td>57.80€</td>
                <td>427.50€</td>
                <td>129.60€</td>
                <td>25.20€</td>
                <td>0.40€</td>
                <td>1,000.50€</td>
                <td>4</td>
            </tr>
            <tr>
                <td>Β2</td>
                <td>Δημήτριος Παπάς</td>
                <td>0.115</td>
                <td>0.20</td>
                <td>1720</td>
                <td>92.0</td>
                <td>82.0</td>
                <td>92.0</td>
                <td>88.0</td>
                <td>34.0</td>
                <td>441.60€</td>
                <td>69.70€</td>
                <td>524.40€</td>
                <td>158.40€</td>
                <td>30.60€</td>
                <td>0.30€</td>
                <td>1,225.00€</td>
                <td>5</td>
            </tr>
            <tr>
                <td>Β3</td>
                <td>Ελένη Μιχαήλ</td>
                <td>0.105</td>
                <td>0.17</td>
                <td>1480</td>
                <td>83.0</td>
                <td>75.0</td>
                <td>83.0</td>
                <td>80.0</td>
                <td>30.0</td>
                <td>398.40€</td>
                <td>63.75€</td>
                <td>473.10€</td>
                <td>144.00€</td>
                <td>27.00€</td>
                <td>0.25€</td>
                <td>1,106.50€</td>
                <td>6</td>
            </tr>
            <tr>
                <td>Γ1</td>
                <td>Κωνσταντίνος Λάμπρου</td>
                <td>0.125</td>
                <td>0.23</td>
                <td>1950</td>
                <td>98.0</td>
                <td>88.0</td>
                <td>98.0</td>
                <td>94.0</td>
                <td>36.0</td>
                <td>470.40€</td>
                <td>74.80€</td>
                <td>558.60€</td>
                <td>169.20€</td>
                <td>32.40€</td>
                <td>0.20€</td>
                <td>1,305.60€</td>
                <td>7</td>
            </tr>
            <tr>
                <td>Γ2</td>
                <td>Σοφία Καραμάνη</td>
                <td>0.090</td>
                <td>0.14</td>
                <td>1250</td>
                <td>72.0</td>
                <td>65.0</td>
                <td>72.0</td>
                <td>69.0</td>
                <td>26.0</td>
                <td>345.60€</td>
                <td>55.25€</td>
                <td>410.40€</td>
                <td>124.20€</td>
                <td>23.40€</td>
                <td>0.35€</td>
                <td>959.20€</td>
                <td>8</td>
            </tr>
            <tr>
                <td>Γ3</td>
                <td>Μιχάλης Στέφανος</td>
                <td>0.100</td>
                <td>0.16</td>
                <td>1420</td>
                <td>80.0</td>
                <td>72.0</td>
                <td>80.0</td>
                <td>77.0</td>
                <td>29.0</td>
                <td>384.00€</td>
                <td>61.20€</td>
                <td>456.00€</td>
                <td>138.60€</td>
                <td>26.10€</td>
                <td>0.30€</td>
                <td>1,066.20€</td>
                <td>9</td>
            </tr>
            <tr>
                <td>Δ1</td>
                <td>Βασιλική Νικολάου</td>
                <td>0.105</td>
                <td>0.18</td>
                <td>1580</td>
                <td>85.0</td>
                <td>76.0</td>
                <td>85.0</td>
                <td>82.0</td>
                <td>31.0</td>
                <td>408.00€</td>
                <td>64.60€</td>
                <td>484.50€</td>
                <td>147.60€</td>
                <td>27.90€</td>
                <td>0.40€</td>
                <td>1,133.00€</td>
                <td>10</td>
            </tr>
            <tr class="totals-row">
                <td><strong>ΣΥΝΟΛΑ</strong></td>
                <td></td>
                <td>1.100</td>
                <td>1.88</td>
                <td>16410</td>
                <td>878.0</td>
                <td>787.0</td>
                <td>878.0</td>
                <td>842.0</td>
                <td>321.0</td>
                <td>4214.40€</td>
                <td>668.95€</td>
                <td>5004.60€</td>
                <td>1515.60€</td>
                <td>288.90€</td>
                <td>2.95€</td>
                <td>11,695.40€</td>
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
                    <td>10</td>
                </tr>
                <tr>
                    <th>ΣΥΝΟΛΟ ΔΑΠΑΝΩΝ:</th>
                    <td>13,500.00€</td>
                </tr>
                <tr>
                    <th>ΣΥΝΟΛΟ ΠΛΗΡΩΤΕΩΝ ΠΟΣΩΝ:</th>
                    <td>11,695.40€</td>
                </tr>
            </table>
            
            <div class="notes">
                <strong>ΠΑΡΑΤΗΡΗΣΕΙΣ:</strong> ΕΙΣΠΡΑΞΗ ΚΟΙΝΟΧΡΗΣΤΩΝ: ΔΕΥΤΕΡΑ & ΤΕΤΑΡΤΗ ΑΠΟΓΕΥΜΑ<br/>
                <strong>ΤΡΑΠΕΖΙΚΟΣ ΛΟΓΑΡΙΑΣΜΟΣ:</strong> GR12 3456 7890 1234 5678 90<br/>
                <strong>ΤΗΛΕΦΩΝΟ ΕΠΙΚΟΙΝΩΝΙΑΣ:</strong> 210-1234567
            </div>
        </div>
    </body>
    </html>
    """
    
    # Create PDF
    html = HTML(string=html_content)
    html.write_pdf("common_expenses_actions_10_apartments.pdf")
    
    print("✅ PDF 'Ενέργειες Κοινοχρήστων' δημιουργήθηκε επιτυχώς!")
    print("📄 Το PDF περιέχει:")
    print("   • 10 Διαμερίσματα με πλήρη στοιχεία")
    print("   • Αναλυτικές δαπάνες κατηγοριοποιημένες")
    print("   • Πλήρη πίνακα ανάλυσης κατά διαμερίσματα")
    print("   • Εργαλεία εξαγωγής και προβολής")
    print("   • Συνολικές δαπάνες: 13,500.00€")

if __name__ == "__main__":
    create_actions_pdf()
