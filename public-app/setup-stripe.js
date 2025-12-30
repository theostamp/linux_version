// Stripe Setup Script
// Run with: node setup-stripe.js

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function createStripeProducts() {
  console.log('🚀 Creating Stripe products and prices...');

  try {
    // Create Web Plan (per apartment)
    const webProduct = await stripe.products.create({
      name: 'Concierge Web (per apartment)',
      description: 'Full web management platform without kiosk hardware.',
    });

    const webPrice = await stripe.prices.create({
      product: webProduct.id,
      unit_amount: 100, // €1.00 per apartment
      currency: 'eur',
      recurring: { interval: 'month' },
    });

    console.log('✅ Web Plan created:');
    console.log(`   Product ID: ${webProduct.id}`);
    console.log(`   Price ID: ${webPrice.id}`);

    // Create Premium Plan (per apartment)
    const premiumProduct = await stripe.products.create({
      name: 'Concierge Premium (per apartment)',
      description: 'Kiosk + AI + Archive with per-apartment billing.',
    });

    const premiumPrice = await stripe.prices.create({
      product: premiumProduct.id,
      unit_amount: 180, // €1.80 per apartment
      currency: 'eur',
      recurring: { interval: 'month' },
    });

    console.log('✅ Premium Plan created:');
    console.log(`   Product ID: ${premiumProduct.id}`);
    console.log(`   Price ID: ${premiumPrice.id}`);

    // Create Premium + IoT Plan (per apartment)
    const premiumIotProduct = await stripe.products.create({
      name: 'Concierge Premium + IoT (per apartment)',
      description: 'Premium + Smart Heating with per-apartment billing.',
    });

    const premiumIotPrice = await stripe.prices.create({
      product: premiumIotProduct.id,
      unit_amount: 230, // €2.30 per apartment
      currency: 'eur',
      recurring: { interval: 'month' },
    });

    console.log('✅ Premium + IoT Plan created:');
    console.log(`   Product ID: ${premiumIotProduct.id}`);
    console.log(`   Price ID: ${premiumIotPrice.id}`);

    console.log('\n📝 Update your checkout plan mapping with these Price IDs:');
    console.log(`   Web: ${webPrice.id}`);
    console.log(`   Premium: ${premiumPrice.id}`);
    console.log(`   Premium + IoT: ${premiumIotPrice.id}`);

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
