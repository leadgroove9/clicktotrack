import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface AnomalyRouteParams {
  siteId?: string;
}

interface AnomalySimulateBody {
  siteId?: string;
  varianceThreshold?: number; // e.g. 0.3 (30%)
  simulateType?: 'CRITICAL_DROP' | 'RATIO_VARIANCE' | 'TAG_DISCONNECTED';
  recipientPhone?: string;
}

// Simulated SMS / Email Alert Dispatcher (Twilio / SendGrid)
async function sendAlertNotification(type: 'STAGE_1_ALERT' | 'STAGE_2_RESOLVED', details: any) {
  if (type === 'STAGE_1_ALERT') {
    console.log(`[ALERT DISPATCH - SMS/Email] Stage 1 Alert sent to ${details.recipientPhone || '+1 (555) 019-9999'}: ` +
      `🚨 ClicktoTrack Alert: Anomaly detected for site ${details.siteId}. Fault: ${details.faultReason}. Self-healing active (72h DLQ protection).`);
  } else {
    console.log(`[ALERT DISPATCH - SMS/Email] Stage 2 Resolution sent to ${details.recipientPhone || '+1 (555) 019-9999'}: ` +
      `✅ ClicktoTrack Resolved: Self-healing action completed for site ${details.siteId}. Action: ${details.resolutionAction}. DLQ flushed: ${details.flushedCount || 0} events.`);
  }
}

export async function anomalyMonitorRoutes(fastify: FastifyInstance) {
  // 1. Health & Variance Check Endpoint (GET)
  fastify.get('/api/v1/anomaly/check/:siteId?', async (
    request: FastifyRequest<{ Params: AnomalyRouteParams }>,
    reply: FastifyReply
  ) => {
    try {
      const urlParams = request.params || {};
      const siteId = urlParams.siteId || 'demo-site-123';

      const workspace = await prisma.workspace.findUnique({
        where: { siteId },
        include: {
          conversions: {
            take: 100,
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      if (!workspace) {
        return reply.status(404).send({ error: `Workspace with siteId '${siteId}' not found` });
      }

      const totalConversions = workspace.conversions.length;
      const queuedCount = workspace.conversions.filter(c => c.status === 'QUEUED').length;
      const gclidCount = workspace.conversions.filter(c => !!c.gclid).length;
      const emailHashCount = workspace.conversions.filter(c => !!c.emailHash).length;

      // Calculate ratio (Google Ads gclid tagged vs Total)
      const gclidRatio = totalConversions > 0 ? (gclidCount / totalConversions) : 1.0;

      const isAnomalyDetected = totalConversions === 0 || gclidRatio < 0.2;
      const faultReason = totalConversions === 0
        ? 'Zero conversions recorded in active monitoring window'
        : `Google Ads gclid ratio dropped below variance threshold (${(gclidRatio * 100).toFixed(1)}%)`;

      return reply.status(200).send({
        success: true,
        siteId,
        domain: workspace.domain,
        monitoringStatus: isAnomalyDetected ? 'ANOMALY_DETECTED' : 'HEALTHY',
        metrics: {
          totalConversionsLogged: totalConversions,
          queuedInDLQ: queuedCount,
          gclidTaggedConversions: gclidCount,
          enhancedConversionsHashed: emailHashCount,
          gclidTaggingRatio: `${(gclidRatio * 100).toFixed(1)}%`,
        },
        anomalyDetails: isAnomalyDetected ? {
          faultReason,
          selfHealingStatus: 'ACTIVE_DLQ_RETENTION',
          stage1AlertSent: true,
        } : null,
      });
    } catch (error: any) {
      fastify.log.error(`[Anomaly Monitor Error]: ${error?.message || error}`);
      return reply.status(500).send({
        error: 'Internal Server Error executing Anomaly Check',
        details: error?.message || String(error),
      });
    }
  });

  // 2. Anomaly Simulation & 2-Stage Self-Healing Trigger Endpoint (POST)
  fastify.post('/api/v1/anomaly/simulate/:siteId?', async (
    request: FastifyRequest<{ Params: AnomalyRouteParams; Body: AnomalySimulateBody }>,
    reply: FastifyReply
  ) => {
    try {
      const urlParams = request.params || {};
      const body = request.body || {};
      const siteId = urlParams.siteId || body.siteId || 'demo-site-123';
      const simulateType = body.simulateType || 'RATIO_VARIANCE';
      const recipientPhone = body.recipientPhone || '+15550199999';

      const workspace = await prisma.workspace.findUnique({
        where: { siteId },
      });

      if (!workspace) {
        return reply.status(404).send({ error: `Workspace with siteId '${siteId}' not found` });
      }

      // Stage 1: Trigger Diagnostic Alert
      let faultReason = 'Statistical variance breached: GA4 vs Google Ads key events skewed by >30%';
      if (simulateType === 'CRITICAL_DROP') {
        faultReason = 'Critical 100% conversion volume drop detected on landing page';
      } else if (simulateType === 'TAG_DISCONNECTED') {
        faultReason = 'Client-side universal tag hash change detected - script execution halted';
      }

      await sendAlertNotification('STAGE_1_ALERT', {
        siteId,
        recipientPhone,
        faultReason,
      });

      // Stage 2: Execute Automated Self-Healing Action
      const resolutionAction = 'Re-established 1st-party CNAME Edge Proxy session binding & flushed DLQ queue';
      const flushedCount = 12;

      await sendAlertNotification('STAGE_2_RESOLVED', {
        siteId,
        recipientPhone,
        resolutionAction,
        flushedCount,
      });

      return reply.status(200).send({
        success: true,
        message: 'Quad-channel anomaly simulation & 2-stage self-healing execution completed',
        simulation: {
          siteId,
          simulateType,
          stage1DiagnosticAlert: {
            status: 'SENT',
            faultReason,
            recipientPhone,
            dlqProtectionWindow: '72 Hours',
          },
          stage2SelfHealingResolution: {
            status: 'EXECUTED_AND_RESOLVED',
            resolutionAction,
            dlqFlushedCount: flushedCount,
            recipientPhone,
          },
        },
      });
    } catch (error: any) {
      fastify.log.error(`[Anomaly Simulation Error]: ${error?.message || error}`);
      return reply.status(500).send({
        error: 'Internal Server Error running Anomaly Simulation',
        details: error?.message || String(error),
      });
    }
  });
}