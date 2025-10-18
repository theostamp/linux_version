import os
import sys
import django
import stripe

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "new_concierge_backend.settings")
django.setup()

from billing.models import SubscriptionPlan
from django.conf import settings
from django_tenants.utils import schema_context

stripe.api_key = settings.STRIPE_SECRET_KEY

def auto_update_stripe_price_ids():
    """Ενημερώνει αυτόματα τα SubscriptionPlan στο Django με τα Stripe Price IDs."""
    
    print("🚀 Αυτόματη Ενημέρωση Stripe Price IDs στα Django Subscription Plans")
    print("=" * 70)
    
    # Price IDs από τα Stripe events που είδαμε
    price_mappings = {
        'starter': {
            'price_id': 'price_1SJKhx09cwMpk380JiBUE9tr',
            'product_id': 'prod_TFqONEWgJk8kjs'
        },
        'professional': {
            'price_id': 'price_1SJKhX09cwMpk380Ycb2cwCC', 
            'product_id': 'prod_TFqOZOaTWPSnYb'
        },
        'enterprise': {
            'price_id': 'price_1SJKiM09cwMpk380vYIjKNf8',
            'product_id': 'prod_TFqPtCaAc9nmip'
        }
    }
    
    with schema_context('demo'):
        plans = SubscriptionPlan.objects.all()
        
        if not plans.exists():
            print("❌ Δεν βρέθηκαν Subscription Plans στο Django.")
            return
        
        for plan in plans:
            print(f"\n🔄 Επεξεργασία πλάνου: {plan.name} ({plan.plan_type})")
            
            if plan.plan_type in price_mappings:
                mapping = price_mappings[plan.plan_type]
                
                if mapping['price_id']:
                    # Χρησιμοποιούμε το price_id που έχουμε
                    plan.stripe_price_id_monthly = mapping['price_id']
                    print(f"✅ Ενημέρωση με γνωστό Price ID: {mapping['price_id']}")
                else:
                    # Αναζητούμε στο Stripe για το enterprise
                    try:
                        products = stripe.Product.list(ids=[mapping['product_id']], active=True)
                        if products.data:
                            stripe_product = products.data[0]
                            print(f"✅ Βρέθηκε Stripe Product: {stripe_product.id} - {stripe_product.name}")
                            
                            # Αναζήτηση τιμών για το προϊόν
                            prices = stripe.Price.list(product=stripe_product.id, active=True)
                            
                            for price in prices.data:
                                if price.recurring and price.recurring.interval == 'month':
                                    plan.stripe_price_id_monthly = price.id
                                    print(f"   - Βρέθηκε Monthly Price ID: {price.id} (Amount: {price.unit_amount / 100:.2f} {price.currency.upper()})")
                                    break
                        else:
                            print(f"❌ Δεν βρέθηκε ενεργό προϊόν στο Stripe για το πλάνο '{plan.name}'.")
                            continue
                    except stripe._error.StripeError as e:
                        print(f"❌ Σφάλμα Stripe κατά την επεξεργασία του πλάνου '{plan.name}': {e}")
                        continue
                
                plan.save()
                print(f"✅ Το πλάνο '{plan.name}' ενημερώθηκε με το Stripe Price ID.")
            else:
                print(f"⚠️ Δεν βρέθηκε mapping για το πλάνο '{plan.plan_type}'.")
                
    print("\n" + "=" * 70)
    print("✅ Ολοκληρώθηκε η αυτόματη ενημέρωση των Stripe Price IDs.")
    
    # Εμφάνιση αποτελεσμάτων
    print("\n📋 Τελικά Subscription Plans:")
    print("-" * 50)
    with schema_context('demo'):
        plans = SubscriptionPlan.objects.all()
        for plan in plans:
            print(f"• {plan.name}")
            print(f"  - Price: €{plan.monthly_price}/μήνα")
            print(f"  - Stripe Price ID: {plan.stripe_price_id_monthly or 'Δεν έχει οριστεί'}")

if __name__ == "__main__":
    auto_update_stripe_price_ids()
