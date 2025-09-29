#!/usr/bin/env python
import os
import sys
import django

sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from maintenance.models import PaymentInstallment, PaymentReceipt
from financial.models import Expense

with schema_context('demo'):
    print("=== PAYMENT INSTALLMENTS ===")
    installments = PaymentInstallment.objects.all().order_by('due_date')
    for inst in installments:
        print(f"ID: {inst.id}")
        print(f"  Type: {inst.installment_type}")
        print(f"  Amount: €{inst.amount}")
        print(f"  Due Date: {inst.due_date}")
        print(f"  Status: {inst.status}")
        print(f"  Description: {inst.description}")
        
        # Check if linked to receipt/expense
        if hasattr(inst, 'receipt') and inst.receipt:
            receipt = inst.receipt
            print(f"  Receipt ID: {receipt.id}")
            if receipt.linked_expense:
                print(f"  Linked Expense ID: {receipt.linked_expense.id}")
                print(f"  Expense Title: {receipt.linked_expense.title}")
                print(f"  Expense Date: {receipt.linked_expense.date}")
            else:
                print(f"  No linked expense")
        else:
            print(f"  No receipt found")
        print()
    
    print("=== RECENT EXPENSES ===")
    recent_expenses = Expense.objects.all().order_by('-created_at')[:5]
    for exp in recent_expenses:
        print(f"ID: {exp.id}")
        print(f"  Title: {exp.title}")
        print(f"  Amount: €{exp.amount}")
        print(f"  Date: {exp.date}")
        print(f"  Category: {exp.category}")
        print(f"  Created: {exp.created_at}")
        print()
        
    print("=== PAYMENT RECEIPTS ===")
    receipts = PaymentReceipt.objects.all()
    for receipt in receipts:
        print(f"ID: {receipt.id}")
        print(f"  Type: {receipt.receipt_type}")
        print(f"  Amount: €{receipt.amount}")
        print(f"  Payment Date: {receipt.payment_date}")
        print(f"  Installment ID: {receipt.installment.id if receipt.installment else 'None'}")
        print(f"  Linked Expense ID: {receipt.linked_expense.id if receipt.linked_expense else 'None'}")
        print()