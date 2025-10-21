// Stripe Setup Script
// Run with: node setup-stripe.js

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function createStripeProducts() {
  console.log('🚀 Creating Stripe products and prices...');

  try {
    // Create Basic Plan
    const basicProduct = await stripe.products.create({
      name: 'Basic Plan',
      description: 'Perfect for small buildings - Up to 20 apartments',
    });

    const basicPrice = await stripe.prices.create({
      product: basicProduct.id,
      unit_amount: 2900, // €29.00
      currency: 'eur',
      recurring: { interval: 'month' },
    });

    console.log('✅ Basic Plan created:');
    console.log(`   Product ID: ${basicProduct.id}`);
    console.log(`   Price ID: ${basicPrice.id}`);

    // Create Professional Plan
    const professionalProduct = await stripe.products.create({
      name: 'Professional Plan',
      description: 'Ideal for medium buildings - Up to 50 apartments',
    });

    const professionalPrice = await stripe.prices.create({
      product: professionalProduct.id,
      unit_amount: 5900, // €59.00
      currency: 'eur',
      recurring: { interval: 'month' },
    });

    console.log('✅ Professional Plan created:');
    console.log(`   Product ID: ${professionalProduct.id}`);
    console.log(`   Price ID: ${professionalPrice.id}`);

    // Create Enterprise Plan
    const enterpriseProduct = await stripe.products.create({
      name: 'Enterprise Plan',
      description: 'For large complexes - Unlimited apartments',
    });

    const enterprisePrice = await stripe.prices.create({
      product: enterpriseProduct.id,
      unit_amount: 9900, // €99.00
      currency: 'eur',
      recurring: { interval: 'month' },
    });

    console.log('✅ Enterprise Plan created:');
    console.log(`   Product ID: ${enterpriseProduct.id}`);
    console.log(`   Price ID: ${enterprisePrice.id}`);

    console.log('\n📝 Update your create-checkout-session/route.ts with these Price IDs:');
    console.log(`   Basic: ${basicPrice.id}`);
    console.log(`   Professional: ${professionalPrice.id}`);
    console.log(`   Enterprise: ${enterprisePrice.id}`);

  } catch (error) {
    console.error('❌ Error creating Stripe products:', error.message);
  }
}

// Check if STRIPE_SECRET_KEY is set
if (!process.env.STRIPE_SECRET_KEY) {
  console.error('❌ STRIPE_SECRET_KEY not found in environment variables');
  console.log('Please set your Stripe secret key in .env.local');
  process.exit(1);
}

createStripeProducts();
