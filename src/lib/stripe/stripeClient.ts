// src/lib/stripe/stripeClient.ts
// Nota: este módulo NO lleva "use client" y no usa hooks

import { loadStripe } from '@stripe/stripe-js';

export const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

