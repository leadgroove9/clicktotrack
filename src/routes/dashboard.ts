import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface DashboardRouteParams {
  siteId?: string;
}

export async function dashboardRoutes(fastify: FastifyInstance) {
  fastify.get('/api/v1/dashboard/overview/:siteId?', async (
    request: FastifyRequest<{ Params: DashboardRouteParams }>,
    reply: FastifyReply
  ) => {
    try {
      const urlParams = request.params || {};
      const siteId = urlParams.siteId || 'demo-site-123';

      const workspace = await prisma.workspace.findUnique({
        where: { siteId },
        include: {
          goals: true,
          conversions: {
            take: 100,
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      if (!workspace) {
        return reply.status(404).send({ error: `Workspace with siteId '${siteId}' not found` });
      }

      const conversions = workspace.conversions;
      const totalConversions = conversions.length;

      let googleAdsCount = 0;
      let metaAdsCount = 0;
      let microsoftAdsCount = 0;
      let organicWebhookCount = 0;
      let emailHashedCount = 0;

      conversions.forEach(c => {
        if (c.gclid) googleAdsCount++;
        else if (c.fbclid) metaAdsCount++;
        else if (c.msclkid) microsoftAdsCount++;
        else organicWebhookCount++;

        if (c.emailHash) emailHashedCount++;
      });

      const gclidMatchRate = totalConversions > 0 ? (googleAdsCount / totalConversions) * 100 : 100;
      const enhancedMatchRate = totalConversions > 0 ? (emailHashedCount / totalConversions) * 100 : 100;
      const healthScore = Math.round((gclidMatchRate * 0.6) + (enhancedMatchRate * 0.4));

      return reply.status(200).send({
        success: true,
        workspace: {
          siteId: workspace.siteId,
          domain: workspace.domain,
          cnameDomain: workspace.cnameDomain || `track.${workspace.domain}`,
        },
        healthMetrics: {
          healthScore: `${healthScore}/100`,
          statusBadge: healthScore >= 80 ? 'EXCELLENT' : healthScore >= 50 ? 'DEGRADED' : 'CRITICAL',
          enhancedConversionsMatchRate: `${enhancedMatchRate.toFixed(1)}%`,
          gclidAttributionRate: `${gclidMatchRate.toFixed(1)}%`,
        },
        attributionBreakdown: {
          totalConversions,
          googleAds: { count: googleAdsCount, percentage: totalConversions > 0 ? `${((googleAdsCount / totalConversions) * 100).toFixed(1)}%` : '0%' },
          metaAds: { count: metaAdsCount, percentage: totalConversions > 0 ? `${((metaAdsCount / totalConversions) * 100).toFixed(1)}%` : '0%' },
          microsoftAds: { count: microsoftAdsCount, percentage: totalConversions > 0 ? `${((microsoftAdsCount / totalConversions) * 100).toFixed(1)}%` : '0%' },
          webhookOrDirect: { count: organicWebhookCount, percentage: totalConversions > 0 ? `${((organicWebhookCount / totalConversions) * 100).toFixed(1)}%` : '0%' },
        },
        activeGoals: workspace.goals.map(g => ({
          title: g.title,
          category: g.category,
          selectorCss: g.selectorCss,
          isNewCustomerOnly: g.isNewCustomerOnly,
        })),
        recentActivityFeed: conversions.slice(0, 10).map(c => ({
          eventId: c.eventId,
          eventName: c.eventName,
          channel: c.gclid ? 'Google Ads' : c.fbclid ? 'Meta Ads' : c.msclkid ? 'Microsoft Ads' : 'Server/Webhook',
          status: c.status,
          hasPII: !!(c.emailHash || c.phoneHash),
          timestamp: c.createdAt,
        })),
      });
    } catch (error: any) {
      fastify.log.error(`[Dashboard Error]: ${error?.message || error}`);
      return reply.status(500).send({ error: 'Internal Server Error fetching dashboard metrics' });
    }
  });
}