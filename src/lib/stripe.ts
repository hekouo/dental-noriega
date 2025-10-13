import Stripe from "stripe";

// Sin pelear por versiones del API: deja que use la de tu cuenta
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
