#!/bin/bash

# Script για ενημέρωση Stripe variables στο .env αρχείο

echo "🔧 Stripe Environment Configuration"
echo "=================================="

# Ελέγχος αν υπάρχει το .env αρχείο
if [ ! -f ".env" ]; then
    echo "❌ Το .env αρχείο δεν βρέθηκε!"
    exit 1
fi

echo "📋 Τρέχουσες Stripe variables:"
grep -E "STRIPE_" .env || echo "   Δεν υπάρχουν Stripe variables"

echo ""
echo "🔑 Παρακαλώ εισάγετε τα Stripe API Keys:"
echo ""

# Publishable Key
read -p "📤 Stripe Publishable Key (pk_test_...): " STRIPE_PUBLISHABLE_KEY
if [ -z "$STRIPE_PUBLISHABLE_KEY" ]; then
    echo "❌ Το Publishable Key είναι υποχρεωτικό!"
    exit 1
fi

# Secret Key
read -p "🔐 Stripe Secret Key (sk_test_...): " STRIPE_SECRET_KEY
if [ -z "$STRIPE_SECRET_KEY" ]; then
    echo "❌ Το Secret Key είναι υποχρεωτικό!"
    exit 1
fi

# Webhook Secret
read -p "🔗 Stripe Webhook Secret (whsec_...): " STRIPE_WEBHOOK_SECRET
if [ -z "$STRIPE_WEBHOOK_SECRET" ]; then
    echo "❌ Το Webhook Secret είναι υποχρεωτικό!"
    exit 1
fi

echo ""
echo "🔄 Ενημέρωση .env αρχείου..."

# Διαγραφή παλιών Stripe variables αν υπάρχουν
sed -i '/^STRIPE_/d' .env

# Προσθήκη νέων Stripe variables
cat >> .env << EOF

# Stripe Configuration
STRIPE_PUBLISHABLE_KEY=$STRIPE_PUBLISHABLE_KEY
STRIPE_SECRET_KEY=$STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET=$STRIPE_WEBHOOK_SECRET
EOF

echo "✅ Stripe variables ενημερώθηκαν επιτυχώς!"
echo ""
echo "📋 Ενημερωμένες variables:"
grep -E "STRIPE_" .env

echo ""
echo "🚀 Επόμενα βήματα:"
echo "1. Δημιουργία προϊόντων στο Stripe Dashboard"
echo "2. Εγκατάσταση Stripe CLI για webhooks"
echo "3. Test της πλήρους ροής"

