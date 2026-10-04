import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface CreateWorkspaceBody {
  name?: string;
  domain?: string;
  phone?: string;
  gadsId?: string;
  ga4Id?: string;
  metaPixelId?: string;
  callProvider?: string;
  installMethod?: string;
}

export async function workspaceRoutes(fastify: FastifyInstance) {
  // 1. Fetch All Client Workspaces (GET /api/v1/workspaces)
  fastify.get('/api/v1/workspaces', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const workspaces = await prisma.workspace.findMany({
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          siteId: true,
          domain: true,
          cnameDomain: true,
          createdAt: true,
        },
      });

      return reply.status(200).send({
        success: true,
        count: workspaces.length,
        workspaces,
      });
    } catch (error: any) {
      fastify.log.error(`[Workspaces GET Error]: ${error?.message || error}`);
      return reply.status(500).send({ error: 'Failed to fetch client workspaces' });
    }
  });

  // 2. Create a New Client Workspace (POST /api/v1/workspaces)
  fastify.post('/api/v1/workspaces', async (
    request: FastifyRequest<{ Body: CreateWorkspaceBody }>,
    reply: FastifyReply
  ) => {
    try {
      const { name, domain, phone, gadsId, ga4Id, metaPixelId, callProvider, installMethod } = request.body || {};

      if (!domain) {
        return reply.status(400).send({ error: 'Domain is required to create a workspace' });
      }

      // Ensure default organization exists
      let org = await prisma.organization.findFirst();
      if (!org) {
        org = await prisma.organization.create({
          data: { name: 'Main Agency Organization' },
        });
      }

      // Extract hostname string cleanly using string substring
      const rawDomain = domain.trim().toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '');
      const slashPos = rawDomain.indexOf('/');
      const cleanDomain: string = slashPos !== -1 ? rawDomain.substring(0, slashPos) : rawDomain;

      // Generate siteId slug from cleanDomain (e.g. "example-com-workspace")
      const siteId: string = cleanDomain.replace(/[^a-z0-9]/g, '-') + '-workspace';
      const cnameDomain: string = 'track.' + cleanDomain;

      // Save Workspace to PostgreSQL via Prisma
      const workspace = await prisma.workspace.create({
        data: {
          orgId: org.id,
          domain: cleanDomain,
          cnameDomain,
          siteId,
        },
      });

      fastify.log.info(`[Workspace Created]: ${workspace.domain} (Site ID: ${workspace.siteId})`);

      return reply.status(201).send({
        success: true,
        message: 'Client workspace successfully created',
        workspace: {
          siteId: workspace.siteId,
          domain: workspace.domain,
          cnameDomain: workspace.cnameDomain,
          phone,
          gadsId,
          ga4Id,
          metaPixelId,
          callProvider,
          installMethod,
        },
      });
    } catch (error: any) {
      fastify.log.error(`[Workspaces POST Error]: ${error?.message || error}`);
      return reply.status(500).send({ error: 'Failed to save workspace to database' });
    }
  });
}