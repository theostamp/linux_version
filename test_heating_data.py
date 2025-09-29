#!/usr/bin/env python3
import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Expense
from datetime import datetime, date

with schema_context('demo'):
    print("🔍 Έλεγχος δαπανών θέρμανσης")
    print("=" * 50)

    # 1. Έλεγχος όλων των δαπανών για το 2024
    all_expenses = Expense.objects.filter(
        date__year=2024
    ).order_by('-date')

    print(f"\n📊 Συνολικές δαπάνες 2024: {all_expenses.count()}")

    if all_expenses.count() > 0:
        print("\nΤελευταίες 10 δαπάνες:")
        for expense in all_expenses[:10]:
            print(f"   - {expense.date} | {expense.title} | {expense.amount}€ | Type: {expense.expense_type} | Category: {expense.category}")

    # 2. Φιλτράρισμα για θέρμανση
    heating_keywords = ['θέρμανσ', 'θερμανσ', 'αέριο', 'πετρέλαιο', 'heating', 'gas']

    heating_expenses = Expense.objects.none()

    for keyword in heating_keywords:
        keyword_expenses = all_expenses.filter(title__icontains=keyword)
        heating_expenses = heating_expenses | keyword_expenses
        if keyword_expenses.count() > 0:
            print(f"\n🔥 Δαπάνες με '{keyword}': {keyword_expenses.count()}")

    heating_expenses = heating_expenses.distinct()
    print(f"\n🔥 Συνολικές δαπάνες θέρμανσης: {heating_expenses.count()}")

    if heating_expenses.exists():
        print("\nΔαπάνες θέρμανσης:")
        for expense in heating_expenses:
            print(f"   - {expense.date} | {expense.title} | {expense.amount}€")

    # 3. Έλεγχος για τη θερμαντική περίοδο 2024-2025
    heating_season_start = date(2024, 9, 1)
    heating_season_end = date(2025, 5, 31)

    season_expenses = all_expenses.filter(
        date__gte=heating_season_start,
        date__lte=heating_season_end
    )

    print(f"\n🏠 Δαπάνες θερμαντικής περιόδου 2024-2025: {season_expenses.count()}")

    if season_expenses.exists():
        print("\nΤελευταίες 5 δαπάνες της θερμαντικής περιόδου:")
        for expense in season_expenses[:5]:
            print(f"   - {expense.date} | {expense.title} | {expense.amount}€")

    print("\n" + "=" * 50)
    print("✅ Έλεγχος ολοκληρώθηκε")