#!/bin/bash

# Script για ενημέρωση .env με το webhook secret

WEBHOOK_SECRET="whsec_2b8988099271afc1aa07a56fbae06a2c6c7a05d6acbe51ca4152cb145c556502"

echo "🔧 Ενημέρωση .env με Webhook Secret"
echo "=================================="

# Ελέγχος αν υπάρχει το .env αρχείο
if [ ! -f ".env" ]; then
    echo "❌ Το .env αρχείο δεν βρέθηκε!"
    exit 1
fi

echo "📋 Τρέχουσες Stripe variables:"
grep -E "STRIPE_" .env || echo "   Δεν υπάρχουν Stripe variables"

echo ""
echo "🔄 Ενημέρωση .env αρχείου..."

# Διαγραφή παλιών Stripe variables αν υπάρχουν
sed -i '/^STRIPE_/d' .env

# Προσθήκη νέων Stripe variables (με placeholder values)
cat >> .env << EOF

# Stripe Configuration
STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
STRIPE_WEBHOOK_SECRET=$WEBHOOK_SECRET
EOF

echo "✅ Webhook Secret ενημερώθηκε επιτυχώς!"
echo ""
echo "📋 Ενημερωμένες variables:"
grep -E "STRIPE_" .env

echo ""
echo "🎯 Επόμενα βήματα:"
echo "1. Πήγαινε στο Stripe Dashboard (dashboard.stripe.com)"
echo "2. Βεβαιώσου ότι είσαι σε Test Mode"
echo "3. Πήγαινε στο Developers > API keys"
echo "4. Αντιγράψε το Publishable key (pk_test_...)"
echo "5. Κάνε κλικ στο 'Reveal test key' και αντιγράψε το Secret key (sk_test_...)"
echo "6. Ενημέρωσε το .env αρχείο με τα πραγματικά keys"
echo ""
echo "💡 Μπορείς να ενημερώσεις το .env αρχείο με:"
echo "   nano .env"
echo "   ή"
echo "   ./update_stripe_env.sh"

