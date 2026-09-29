import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

interface StripeParams {
  siteId?: string;
}

// Utility: Normalize and SHA-256 Hash PII
function hashPII(value?: string, type: 'email' | 'phone' = 'email'): string | undefined {
  if (!value) return undefined;
  let normalized = value.trim().toLowerCase();

  if (type === 'email') {
    const parts = normalized.split('@');
    if (parts.length === 2) {
      let [username, domain] = parts;
      if (domain === 'gmail.com' || domain === 'googlemail.com') {
        username = username.replace(/\./g, '');
      }
      normalized = `${username}@${domain}`;
    }
  } else if (type === 'phone') {
    normalized = normalized.replace(/\D/g, '');
    if (!normalized.startsWith('+') && normalized.length === 10) {
      normalized = `+1${normalized}`;
    }
  }

  return crypto.createHash('sha256').update(normalized).digest('hex');
}

export async function stripeWebhookRoutes(fastify: FastifyInstance) {
  fastify.post('/api/v1/webhooks/stripe/:siteId?', async (request: FastifyRequest<{ Params: StripeParams }>, reply: FastifyReply) => {
    try {
      const body: any = request.body || {};
      const urlParams = request.params || {};

      const eventType = body.type || 'checkout.session.completed';
      const object = body.data?.object || body;
      const metadata = object.metadata || {};

      const siteId = urlParams.siteId || metadata.siteId || body.siteId || 'demo-site-123';

      // 1. Verify workspace exists
      const workspace = await prisma.workspace.findUnique({
        where: { siteId },
      });

      if (!workspace) {
        fastify.log.warn(`[Stripe Webhook] Workspace siteId not found: ${siteId}`);
        return reply.status(404).send({ error: `Workspace siteId '${siteId}' not found` });
      }

      // 2. Validate Event & Status
      let isPaid = false;
      if (eventType === 'checkout.session.completed') {
        isPaid = object.payment_status === 'paid' || object.status === 'complete' || !object.payment_status;
      } else if (eventType === 'payment_intent.succeeded' || eventType === 'charge.succeeded') {
        isPaid = object.status === 'succeeded' || !object.status;
      } else {
        return reply.status(200).send({
          success: true,
          message: `Stripe event '${eventType}' received but non-payment event ignored`,
        });
      }

      if (!isPaid) {
        return reply.status(200).send({
          success: true,
          message: `Stripe payment event received but status is unpaid (${object.payment_status || object.status})`,
        });
      }

      // 3. Extract Order Details
      const txnId = object.id || object.payment_intent || object.charge || `ch_test_${Date.now()}`;
      const rawAmount = object.amount_total || object.amount_received || object.amount || 0;
      const grossAmount = (rawAmount / 100).toFixed(2);
      const currency = (object.currency || 'usd').toUpperCase();

      const rawEmail = object.customer_details?.email || object.receipt_email || object.billing_details?.email || object.customer_email || metadata.email;
      const rawPhone = object.customer_details?.phone || object.billing_details?.phone || metadata.phone;

      const gclid = metadata.gclid || body.gclid;
      const fbclid = metadata.fbclid || body.fbclid;
      const msclkid = metadata.msclkid || body.msclkid;

      // 4. Normalize & Hash PII
      const emailHash = hashPII(rawEmail, 'email');
      const phoneHash = hashPII(rawPhone, 'phone');

      // 5. Store Event in PostgreSQL
      const eventId = `evt_stripe_${txnId}`;
      const conversion = await prisma.conversionEvent.create({
        data: {
          workspaceId: workspace.id,
          eventId,
          eventName: 'purchase',
          gclid,
          fbclid,
          msclkid,
          emailHash,
          phoneHash,
          status: 'QUEUED',
        },
      });

      return reply.status(200).send({
        success: true,
        message: 'Stripe webhook processed successfully',
        eventId: conversion.eventId,
        status: conversion.status,
        details: {
          txnId,
          grossAmount,
          currency,
          eventType,
          hasEmail: !!emailHash,
          hasGclid: !!gclid,
        },
      });
    } catch (error: any) {
      fastify.log.error(`[Stripe Webhook Error]: ${error?.message || error}`);
      return reply.status(500).send({
        error: 'Internal Server Error processing Stripe webhook',
        details: error?.message || String(error),
      });
    }
  });
}