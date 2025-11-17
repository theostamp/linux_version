#!/bin/bash

# Script to clean up orphan expenses (expenses linked to deleted ScheduledMaintenance)
# Run this after deploying the fix

echo "🔧 Cleanup Orphan Expenses"
echo "=========================="
echo ""
echo "This script will clean up expenses that reference deleted"
echo "ScheduledMaintenance tasks (orphan expenses)."
echo ""

# First, run in dry-run mode to see what would be deleted
echo "Step 1: Running in DRY-RUN mode to preview..."
echo ""

python backend/manage.py cleanup_orphan_expenses --dry-run

echo ""
echo "=================================="
echo ""
echo "To actually delete the orphan expenses, run:"
echo "  python backend/manage.py cleanup_orphan_expenses"
echo ""
echo "To filter by specific building:"
echo "  python backend/manage.py cleanup_orphan_expenses --building=2"
echo ""

