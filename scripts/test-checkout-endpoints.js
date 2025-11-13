#!/usr/bin/env node
/**
 * Test script para verificar endpoints de checkout
 * 
 * Uso:
 *   node scripts/test-checkout-endpoints.js [baseUrl]
 * 
 * Ejemplo:
 *   node scripts/test-checkout-endpoints.js http://localhost:3000
 */

const baseUrl = process.argv[2] || 'http://localhost:3000';

async function testCreateOrder() {
  console.log('\n📦 Testing /api/checkout/create-order...');
  
  const payload = {
    items: [
      { id: 'test-product-id', qty: 1, price_cents: 12345 }
    ],
    email: 'test@example.com',
    name: 'Test User',
    shippingMethod: 'delivery'
  };

  try {
    const response = await fetch(`${baseUrl}/api/checkout/create-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Error:', data.error || `Status ${response.status}`);
      return null;
    }

    if (data.total_cents !== 12345) {
      console.error(`❌ Expected total_cents=12345, got ${data.total_cents}`);
      return null;
    }

    if (!data.order_id) {
      console.error('❌ Missing order_id in response');
      return null;
    }

    console.log('✅ create-order passed:');
    console.log(`   order_id: ${data.order_id}`);
    console.log(`   total_cents: ${data.total_cents}`);
    console.log(`   currency: ${data.currency || 'mxn'}`);

    return data.order_id;
  } catch (error) {
    console.error('❌ Request failed:', error.message);
    return null;
  }
}

async function testCreatePaymentIntent(orderId) {
  console.log('\n💳 Testing /api/stripe/create-payment-intent...');
  
  const payload = {
    order_id: orderId
  };

  try {
    const response = await fetch(`${baseUrl}/api/stripe/create-payment-intent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Error:', data.error || `Status ${response.status}`);
      return false;
    }

    if (!data.client_secret || data.client_secret.length === 0) {
      console.error('❌ Missing or empty client_secret');
      return false;
    }

    if (data.amount !== 12345) {
      console.error(`❌ Expected amount=12345, got ${data.amount}`);
      return false;
    }

    if (!data.payment_intent_id) {
      console.error('❌ Missing payment_intent_id in response');
      return false;
    }

    console.log('✅ create-payment-intent passed:');
    console.log(`   payment_intent_id: ${data.payment_intent_id}`);
    console.log(`   amount: ${data.amount}`);
    console.log(`   client_secret: ${data.client_secret.substring(0, 20)}...`);

    return true;
  } catch (error) {
    console.error('❌ Request failed:', error.message);
    return false;
  }
}

async function main() {
  console.log('🧪 Testing Checkout Endpoints');
  console.log(`   Base URL: ${baseUrl}\n`);

  const orderId = await testCreateOrder();
  
  if (!orderId) {
    console.error('\n❌ create-order test failed, skipping payment intent test');
    process.exit(1);
  }

  const paymentIntentOk = await testCreatePaymentIntent(orderId);
  
  if (!paymentIntentOk) {
    console.error('\n❌ create-payment-intent test failed');
    process.exit(1);
  }

  console.log('\n✅ All tests passed!');
  process.exit(0);
}

main().catch((error) => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});

