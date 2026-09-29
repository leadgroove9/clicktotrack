import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

interface PayPalIPNParams {
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

// Parse PayPal custom string (e.g. "gclid=123&session_id=456" or "gclid_123_session_456")
function parseCustomField(customStr?: string): Record<string, string> {
  const result: Record<string, string> = {};
  if (!customStr) return result;

  if (customStr.includes('=')) {
    const pairs = customStr.split('&');
    for (const pair of pairs) {
      const [k, v] = pair.split('=');
      if (k && v) result[k.trim()] = decodeURIComponent(v.trim());
    }
  } else {
    const parts = customStr.split('_');
    for (let i = 0; i < parts.length - 1; i += 2) {
      result[parts[i]] = parts[i + 1];
    }
  }

  return result;
}

export async function paypalWebhookRoutes(fastify: FastifyInstance) {
  fastify.post('/api/v1/webhooks/paypal/:siteId?', async (request: FastifyRequest<{ Params: PayPalIPNParams }>, reply: FastifyReply) => {
    try {
      const body: any = request.body || {};
      const urlParams = request.params || {};

      const siteId = urlParams.siteId || body.siteId || body.custom_site_id || 'demo-site-123';

      // 1. Verify workspace exists
      const workspace = await prisma.workspace.findUnique({
        where: { siteId },
      });

      if (!workspace) {
        fastify.log.warn(`[PayPal IPN] Workspace siteId not found: ${siteId}`);
        return reply.status(404).send({ error: `Workspace siteId '${siteId}' not found` });
      }

      // 2. Read PayPal IPN parameters
      const paymentStatus = body.payment_status || body.status || 'Completed';
      const txnId = body.txn_id || body.transaction_id || `PAYPAL_${Date.now()}`;
      const grossAmount = body.mc_gross || body.amount || body.gross || '0.00';
      const currency = body.mc_currency || body.currency || 'USD';
      const rawEmail = body.payer_email || body.email;
      const rawPhone = body.contact_phone || body.phone;
      const customData = parseCustomField(body.custom);

      // Extract click IDs from custom field or direct payload
      const gclid = body.gclid || customData.gclid || customData.gclid_id;
      const fbclid = body.fbclid || customData.fbclid;
      const msclkid = body.msclkid || customData.msclkid;

      fastify.log.info(`[PayPal IPN] Received IPN for siteId: ${siteId}, txn_id: ${txnId}, status: ${paymentStatus}, amount: ${currency} ${grossAmount}`);

      if (paymentStatus !== 'Completed' && paymentStatus !== 'Processed') {
        return reply.status(200).send({
          success: true,
          message: `IPN received but ignored (payment_status is '${paymentStatus}')`,
        });
      }

      // 3. Normalize & SHA-256 Hash PII
      const emailHash = hashPII(rawEmail, 'email');
      const phoneHash = hashPII(rawPhone, 'phone');

      // 4. Generate unique event ID
      const eventId = `evt_pp_${txnId}`;

      // 5. Store Purchase Event in PostgreSQL Queue
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

      fastify.log.info(`[PayPal IPN] Purchase conversion queued in PostgreSQL: ${conversion.eventId}`);

      return reply.status(200).send({
        success: true,
        message: 'PayPal IPN processed successfully',
        eventId: conversion.eventId,
        status: conversion.status,
        details: {
          txnId,
          grossAmount,
          currency,
          hasEmail: !!emailHash,
          hasGclid: !!gclid,
        },
      });
    } catch (error: any) {
      fastify.log.error(`[PayPal IPN Error]: ${error?.message || error}`);
      return reply.status(500).send({
        error: 'Internal Server Error processing PayPal IPN',
        details: error?.message || String(error),
      });
    }
  });
}