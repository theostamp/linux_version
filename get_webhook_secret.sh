#!/bin/bash

echo "🔗 Stripe Webhook Secret Setup"
echo "=============================="
echo ""

echo "📋 Για να πάρεις το Webhook Secret (whsec_...):"
echo ""
echo "1. 🔑 Πρώτα κάνε login στο Stripe CLI:"
echo "   ./stripe-cli login"
echo ""
echo "2. 🌐 Θα σου δώσει ένα pairing code και URL"
echo "   - Πήγαινε στο URL που θα σου δώσει"
echo "   - Εισάγετε το pairing code"
echo ""
echo "3. 🔗 Μετά από το login, τρέξε:"
echo "   ./stripe-cli listen --forward-to http://localhost:8000/api/billing/webhooks/stripe/"
echo ""
echo "4. 📝 Το webhook secret θα εμφανιστεί στην αρχή της εντολής"
echo "   Θα δεις κάτι σαν:"
echo "   > Ready! Your webhook signing secret is whsec_1234567890abcdef..."
echo ""
echo "5. 📋 Αντιγράψε το whsec_... και ενημέρωσε το .env αρχείο"
echo ""
echo "💡 Tip: Κράτα το terminal ανοιχτό για να λειτουργούν τα webhooks"
echo ""

# Ελέγχος αν το Stripe CLI είναι έτοιμο
if [ -f "./stripe-cli" ]; then
    echo "✅ Stripe CLI είναι έτοιμο"
    echo "🚀 Έτοιμος για login!"
    echo ""
    echo "🎯 Επόμενο βήμα:"
    echo "   ./stripe-cli login"
else
    echo "❌ Stripe CLI δεν βρέθηκε"
    echo "   Τρέξε πρώτα: wget -O stripe-cli.tar.gz https://github.com/stripe/stripe-cli/releases/download/v1.31.0/stripe_1.31.0_linux_x86_64.tar.gz"
    echo "   Μετά: tar -xzf stripe-cli.tar.gz && mv stripe ./stripe-cli && chmod +x ./stripe-cli"
fi
