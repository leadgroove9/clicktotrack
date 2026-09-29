import { paypalWebhookRoutes } from './routes/paypal';
import { stripeWebhookRoutes } from './routes/stripe';

// Register routes
server.register(paypalWebhookRoutes);
server.register(stripeWebhookRoutes);