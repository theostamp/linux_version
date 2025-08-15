#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Simple script to generate a PDF with the exact elements from the Common Expenses Sheet
using basic FPDF without external fonts.
"""

from fpdf import FPDF

def create_common_expenses_pdf():
    """Create a PDF with the exact elements from the Common Expenses Sheet."""
    
    # Create PDF object
    pdf = FPDF()
    pdf.add_page()
    
    # Set font to support basic characters
    pdf.set_font('Arial', 'B', 16)
    
    # Header Section
    pdf.cell(0, 10, 'koinoxrista24.gr', ln=True, align='C')
    pdf.set_font('Arial', '', 10)
    pdf.cell(0, 8, 'online edition of common expenses', ln=True, align='C')
    pdf.set_font('Arial', 'B', 16)
    pdf.cell(0, 10, 'COMMON EXPENSES SHEET', ln=True, align='C')
    pdf.set_font('Arial', 'B', 14)
    pdf.cell(0, 8, 'August 2025', ln=True, align='C')
    pdf.ln(10)
    
    # Header Information Grid
    pdf.set_font('Arial', 'B', 12)
    
    # Building information table
    building_info = [
        ['BUILDING', 'Example Building'],
        ['MONTH', 'August 2025'],
        ['MANAGER', 'Building Manager'],
        ['PAYMENT DUE', '15 September 2025']
    ]
    
    for row in building_info:
        pdf.cell(50, 10, row[0], border=1)
        pdf.cell(100, 10, row[1], border=1)
        pdf.ln()
    
    pdf.ln(10)
    
    # Expense Breakdown Section
    pdf.set_font('Arial', 'B', 14)
    pdf.cell(0, 10, 'EXPENSE BREAKDOWN', ln=True)
    pdf.ln(5)
    
    # Expense categories
    expense_categories = [
        ('A. COMMON EXPENSES', ''),
        ('  1. Electricity', '1,250.00 EUR'),
        ('  2. Water', '450.00 EUR'),
        ('  3. Cleaning', '300.00 EUR'),
        ('  TOTAL', '2,000.00 EUR'),
        ('', ''),
        ('B. ELEVATOR', ''),
        ('  1. Elevator maintenance', '180.00 EUR'),
        ('  2. Elevator electricity', '120.00 EUR'),
        ('  TOTAL', '300.00 EUR'),
        ('', ''),
        ('C. HEATING', ''),
        ('  1. Heating oil', '2,500.00 EUR'),
        ('  2. Boiler maintenance', '200.00 EUR'),
        ('  TOTAL', '2,700.00 EUR'),
        ('', ''),
        ('D. OTHER EXPENSES', ''),
        ('  1. Insurance', '150.00 EUR'),
        ('  2. Management', '400.00 EUR'),
        ('  TOTAL', '550.00 EUR'),
        ('', ''),
        ('E. CO-OWNERSHIP EXPENSES', ''),
        ('  1. Special expenses', '0.00 EUR'),
        ('  TOTAL', '0.00 EUR'),
        ('', ''),
        ('TOTAL EXPENSES', '5,550.00 EUR')
    ]
    
    pdf.set_font('Arial', '', 10)
    for category, amount in expense_categories:
        if category.startswith(('A.', 'B.', 'C.', 'D.', 'E.', 'TOTAL EXPENSES')):
            pdf.set_font('Arial', 'B', 10)
        else:
            pdf.set_font('Arial', '', 10)
        
        if category == '':
            pdf.cell(0, 5, '', ln=True)
        else:
            pdf.cell(100, 6, category, border=1)
            pdf.cell(50, 6, amount, border=1, align='R')
            pdf.ln()
    
    pdf.ln(10)
    
    # Detailed Analysis Table
    pdf.set_font('Arial', 'B', 14)
    pdf.cell(0, 10, 'ANALYSIS BY APARTMENT', ln=True)
    pdf.ln(5)
    
    # Table headers
    pdf.set_font('Arial', 'B', 8)
    
    # Main header row
    headers = [
        'APARTMENT\nNUMBER', 'OWNER NAME', 
        'HEATING', '', '', 'PARTICIPATION\nMILLS', '', '', '', '', 
        'AMOUNT DUE', '', '', '', '', 'AMOUNT TO\nPAY', 'S/N'
    ]
    
    col_widths = [20, 35, 12, 12, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 12, 20, 8]
    
    for i, header in enumerate(headers):
        pdf.cell(col_widths[i], 10, header, border=1, align='C')
    pdf.ln()
    
    # Sub-header row
    sub_headers = [
        '', '', 'ei', 'fi', 'CALORIES', 'COMMON', 'ELEVATOR', 'HEATING', 
        'OTHER', 'CO-OWNER', 'COMMON', 'ELEVATOR', 'HEATING', 
        'OTHER', 'CO-OWNER', 'ROUND.', '', ''
    ]
    
    for i, header in enumerate(sub_headers):
        pdf.cell(col_widths[i], 8, header, border=1, align='C')
    pdf.ln()
    
    # Sample data rows
    pdf.set_font('Arial', '', 7)
    
    data_rows = [
        ['A1', 'George Papadopoulos', '0.150', '0.25', '1250', '85.50', '25.50', '85.50', '25.50', '0.00', '171.00', '51.00', '171.00', '51.00', '0.00', '0.00', '444.00', '1'],
        ['A2', 'Maria Konstantinou', '0.120', '0.20', '1000', '68.40', '20.40', '68.40', '20.40', '0.00', '136.80', '40.80', '136.80', '40.80', '0.00', '0.00', '355.20', '2'],
        ['A3', 'Nikolaos Alexiou', '0.180', '0.30', '1500', '102.60', '30.60', '102.60', '30.60', '0.00', '205.20', '61.20', '205.20', '61.20', '0.00', '0.00', '532.80', '3']
    ]
    
    for row in data_rows:
        for i, cell in enumerate(row):
            pdf.cell(col_widths[i], 6, cell, border=1, align='C')
        pdf.ln()
    
    # Totals row
    pdf.set_font('Arial', 'B', 7)
    totals_row = ['TOTALS', '', '0.450', '0.75', '3750', '256.50', '76.50', '256.50', '76.50', '0.00', '513.00', '153.00', '513.00', '153.00', '0.00', '0.01', '1,332.00', '']
    
    for i, cell in enumerate(totals_row):
        pdf.cell(col_widths[i], 6, cell, border=1, align='C')
    pdf.ln()
    
    pdf.ln(10)
    
    # Footer Information
    pdf.set_font('Arial', 'B', 10)
    footer_data = [
        ['ISSUE DATE:', '15 August 2025'],
        ['TOTAL APARTMENTS:', '3'],
        ['TOTAL EXPENSES:', '5,550.00 EUR']
    ]
    
    for row in footer_data:
        pdf.cell(50, 8, row[0])
        pdf.cell(50, 8, row[1])
        pdf.ln()
    
    pdf.ln(5)
    
    # Additional Notes
    pdf.set_font('Arial', '', 10)
    pdf.cell(0, 8, 'NOTES: COLLECTION OF COMMON EXPENSES: MONDAY & WEDNESDAY AFTERNOON', ln=True)
    
    # Save the PDF
    pdf.output("φυλλο_κοινοχρηστων_Αύγουστος_2025_2025-08-15.pdf")
    print("PDF created successfully: φυλλο_κοινοχρηστων_Αύγουστος_2025_2025-08-15.pdf")

if __name__ == "__main__":
    create_common_expenses_pdf()

