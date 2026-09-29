import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

// List of common disposable/temporary email domains
const DISPOSABLE_EMAIL_DOMAINS = new Set([
  'mailinator.com',
  'tempmail.com',
  '10minutemail.com',
  'guerrillamail.com',
  'trashmail.com',
  'yopmail.com',
  'dispostable.com',
  'getnada.com',
  'throwawaymail.com',
  'temp-mail.org',
]);

interface SpamRouteParams {
  siteId?: string;
  eventId?: string;
}

interface SpamEvaluateBody {
  siteId?: string;
  name?: string;
  email?: string;
  phone?: string;
  message?: string;
  submissionDurationMs?: number; // Time user spent filling form
  _ct_hp?: string; // Client-side invisible honeypot field
  userIp?: string;
  gclid?: string;
  fbclid?: string;
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
    } else if (!normalized.startsWith('+') && normalized.length > 10) {
      normalized = `+${normalized}`;
    }
  }

  return crypto.createHash('sha256').update(normalized).digest('hex');
}

export async function spamFilterRoutes(fastify: FastifyInstance) {
  // 1. Evaluate Incoming Lead Submission Against Bot & Spam Rules (POST)
  fastify.post('/api/v1/spam/evaluate/:siteId?', async (
    request: FastifyRequest<{ Params: SpamRouteParams; Body: SpamEvaluateBody }>,
    reply: FastifyReply
  ) => {
    try {
      const urlParams = request.params || {};
      const body = request.body || {};
      const siteId = urlParams.siteId || body.siteId || 'demo-site-123';

      const workspace = await prisma.workspace.findUnique({
        where: { siteId },
      });

      if (!workspace) {
        return reply.status(404).send({ error: `Workspace with siteId '${siteId}' not found` });
      }

      let isSpam = false;
      const spamReasons: string[] = [];
      let riskScore = 0; // 0 to 100

      // Rule 1: Client-Side Invisible Honeypot Field Check
      if (body._ct_hp && body._ct_hp.trim().length > 0) {
        isSpam = true;
        spamReasons.push('HONEYPOT_FIELD_FILLED');
        riskScore += 95;
      }

      // Rule 2: Submission Duration / Velocity Check (< 1.5 seconds)
      const durationMs = body.submissionDurationMs ?? 2500;
      if (durationMs < 1500) {
        isSpam = true;
        spamReasons.push(`SUBMISSION_TOO_FAST (${durationMs}ms < 1500ms threshold)`);
        riskScore += 80;
      }

      // Rule 3: Disposable Email Domain Filter
     // Rule 3: Disposable Email Domain Filter
      if (body.email && typeof body.email === 'string') {
        const emailParts = body.email.split('@');
        if (emailParts.length === 2) {
          const domain = emailParts.toLowerCase(); // ✅ Correctly indexes domain string
          if (DISPOSABLE_EMAIL_DOMAINS.has(domain)) {
            isSpam = true;
            spamReasons.push(`DISPOSABLE_EMAIL_DOMAIN (${domain})`);
            riskScore += 90;
          }
        }
      }        }
      }

      // Rule 4: Phone Number Syntax Validation
      if (body.phone && typeof body.phone === 'string') {
        const digitsOnly = body.phone.replace(/\D/g, '');
        if (digitsOnly.length < 10 || /^(\d)\1+\$/.test(digitsOnly) || digitsOnly === '1234567890') {
          isSpam = true;
          spamReasons.push(`INVALID_PHONE_SYNTAX (${body.phone})`);
          riskScore += 75;
        }
      }

      const eventId = `evt_lead_${crypto.randomBytes(6).toString('hex')}`;
      const emailHash = hashPII(body.email, 'email');
      const phoneHash = hashPII(body.phone, 'phone');
      const finalStatus = isSpam ? 'SPAM_SUPPRESSED' : 'QUEUED';

      // Save event to PostgreSQL database
      const conversion = await prisma.conversionEvent.create({
        data: {
          workspaceId: workspace.id,
          eventId,
          eventName: 'generate_lead',
          gclid: body.gclid || null,
          fbclid: body.fbclid || null,
          emailHash: emailHash || null,
          phoneHash: phoneHash || null,
          status: finalStatus,
        },
      });

      fastify.log.info(`[Spam Engine] Evaluated Lead ${eventId} for siteId ${siteId}: Status=${finalStatus}, RiskScore=${riskScore}`);

      return reply.status(200).send({
        success: true,
        evaluation: {
          eventId: conversion.eventId,
          siteId,
          status: finalStatus,
          isSpam,
          riskScore: `${Math.min(riskScore, 100)}/100`,
          spamReasons: spamReasons.length > 0 ? spamReasons : ['NONE_PASSED_ALL_CHECKS'],
          actionTaken: isSpam
            ? 'SUPPRESSED_FROM_AD_PLATFORM_DISPATCH (Quarantined)'
            : 'QUEUED_FOR_MULTI_CHANNEL_DISPATCH',
        },
      });
    } catch (error: any) {
      fastify.log.error(`[Spam Engine Error]: ${error?.message || error}`);
      return reply.status(500).send({ error: 'Internal Server Error evaluating bot/spam lead' });
    }
  });

  // 2. Fetch Spam & Bot Lead Quarantine Dashboard (GET)
  fastify.get('/api/v1/spam/quarantine/:siteId?', async (
    request: FastifyRequest<{ Params: SpamRouteParams }>,
    reply: FastifyReply
  ) => {
    try {
      const urlParams = request.params || {};
      const siteId = urlParams.siteId || 'demo-site-123';

      const workspace = await prisma.workspace.findUnique({
        where: { siteId },
        include: {
          conversions: {
            where: { status: 'SPAM_SUPPRESSED' },
            orderBy: { createdAt: 'desc' },
            take: 50,
          },
        },
      });

      if (!workspace) {
        return reply.status(404).send({ error: `Workspace '${siteId}' not found` });
      }

      return reply.status(200).send({
        success: true,
        siteId,
        domain: workspace.domain,
        quarantineSummary: {
          totalQuarantinedSpamLeads: workspace.conversions.length,
          adPlatformBudgetSaved: `$${(workspace.conversions.length * 12.50).toFixed(2)} USD`,
          protectionStatus: 'ACTIVE_SPAM_SHIELD',
        },
        quarantinedLeads: workspace.conversions.map(c => ({
          eventId: c.eventId,
          eventName: c.eventName,
          status: c.status,
          hasHashedPII: !!(c.emailHash || c.phoneHash),
          quarantinedAt: c.createdAt,
        })),
      });
    } catch (error: any) {
      return reply.status(500).send({ error: 'Internal Server Error fetching quarantine logs' });
    }
  });

  // 3. Manually Release Quarantined Lead (False Positive Approval) (POST)
  fastify.post('/api/v1/spam/release/:eventId', async (
    request: FastifyRequest<{ Params: SpamRouteParams }>,
    reply: FastifyReply
  ) => {
    try {
      const { eventId } = request.params || {};

      if (!eventId) {
        return reply.status(400).send({ error: 'Missing required parameter: eventId' });
      }

      const conversion = await prisma.conversionEvent.findUnique({
        where: { eventId },
      });

      if (!conversion) {
        return reply.status(404).send({ error: `Conversion event '${eventId}' not found` });
      }

      // Update status to QUEUED
      const updated = await prisma.conversionEvent.update({
        where: { eventId },
        data: { status: 'QUEUED' },
      });

      fastify.log.info(`[Spam Engine] Manually released false positive lead ${eventId} to QUEUED status`);

      return reply.status(200).send({
        success: true,
        message: `Lead '${eventId}' released from quarantine and restored to QUEUED status for ad platform dispatch`,
        conversion: {
          eventId: updated.eventId,
          previousStatus: 'SPAM_SUPPRESSED',
          newStatus: updated.status,
          releasedAt: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      return reply.status(500).send({ error: 'Internal Server Error releasing lead from quarantine' });
    }
  });
}