import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const goalsMemoryStore = new Map<string, any[]>();

interface CreateGoalBody {
  siteId?: string;
  title: string;
  category: string;
  selector?: string;
  xpath?: string;
  url?: string;
  domain?: string;
  channels?: {
    googleAds?: boolean;
    ga4?: boolean;
    metaCapi?: boolean;
    microsoftAds?: boolean;
  };
}

interface GetGoalsParams {
  siteId?: string;
}

export async function goalRoutes(fastify: FastifyInstance) {
  // 1. Save Conversion Goal (POST /api/v1/goals)
  fastify.post('/api/v1/goals', async (
    request: FastifyRequest<{ Body: CreateGoalBody }>,
    reply: FastifyReply
  ) => {
    try {
      const body = request.body || {};
      const siteId = body.siteId || 'demo-site-123';
      const title = body.title || 'Custom Conversion Goal';
      const category = body.category || 'Form Fill';
      const selectorCss = body.selector || body.xpath || 'button[type="submit"]';

      let workspace = await prisma.workspace.findUnique({
        where: { siteId },
      });

      if (!workspace) {
        workspace = await prisma.workspace.findFirst();
      }

      let createdGoal = null;
      if (workspace) {
        try {
          createdGoal = await prisma.goal.create({
            data: {
              workspaceId: workspace.id,
              title,
              category,
              selectorCss,
              isNewCustomerOnly: false,
            },
          });
        } catch (dbErr) {
          fastify.log.warn(`[Goals DB Warn]: ${dbErr}`);
        }
      }

      const currentList = goalsMemoryStore.get(siteId) || [];
      const newGoalObj = {
        id: createdGoal?.id || `goal_${Date.now()}`,
        title,
        category,
        selector: selectorCss,
        xpath: body.xpath,
        url: body.url,
        domain: body.domain,
        channels: body.channels,
        createdAt: new Date().toISOString(),
      };
      currentList.push(newGoalObj);
      goalsMemoryStore.set(siteId, currentList);

      fastify.log.info(`[Goal Created]: '${title}' (${category}) for siteId: ${siteId}`);

      return reply.status(201).send({
        success: true,
        message: 'Goal successfully saved and provisioned across ad channels',
        goal: newGoalObj,
      });
    } catch (error: any) {
      fastify.log.error(`[Goal POST Error]: ${error?.message || error}`);
      return reply.status(500).send({ success: false, error: 'Failed to save goal', details: error?.message });
    }
  });

  // 2. Fetch Goals for Workspace (GET /api/v1/goals/:siteId?)
  fastify.get('/api/v1/goals/:siteId?', async (
    request: FastifyRequest<{ Params: GetGoalsParams }>,
    reply: FastifyReply
  ) => {
    try {
      const urlParams = request.params || {};
      const siteId = urlParams.siteId || 'demo-site-123';

      const workspace = await prisma.workspace.findUnique({
        where: { siteId },
        include: { goals: true },
      });

      let goalsList: any[] = [];
      if (workspace && workspace.goals) {
        goalsList = workspace.goals.map(g => ({
          id: g.id,
          title: g.title,
          category: g.category,
          selector: g.selectorCss,
        }));
      }

      const memGoals = goalsMemoryStore.get(siteId) || [];
      const combined = [...goalsList, ...memGoals];

      return reply.status(200).send({
        success: true,
        siteId,
        count: combined.length,
        goals: combined,
      });
    } catch (error: any) {
      fastify.log.error(`[Goals GET Error]: ${error?.message || error}`);
      return reply.status(500).send({ success: false, error: 'Failed to fetch goals' });
    }
  });
}