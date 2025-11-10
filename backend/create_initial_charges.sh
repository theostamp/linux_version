#!/bin/bash

# Create Initial Monthly Charges
# This script creates Transaction-based monthly charges for all buildings

echo "=============================================="
echo "Creating Monthly Charges (Transaction-based)"
echo "=============================================="
echo ""

# Check if we're in the right directory
if [ ! -f "manage.py" ]; then
    echo "❌ Error: manage.py not found. Run this from backend/ directory"
    exit 1
fi

# Step 1: Create charges for all buildings (retroactive)
echo "Step 1: Creating retroactive charges for all buildings..."
python3 manage.py create_monthly_charges --retroactive --verbose

echo ""
echo "=============================================="
echo "✅ DONE!"
echo "=============================================="
echo ""
echo "Now check your frontend - previous_obligations should show correctly!"
echo ""
echo "To verify:"
echo "  python3 manage.py shell"
echo "  >>> from financial.models import Transaction"
echo "  >>> Transaction.objects.filter(type='management_fee_charge').count()"
echo ""

