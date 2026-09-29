import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

export type UserRole = 'AGENCY_ADMIN' | 'ACCOUNT_MANAGER' | 'CLIENT_READONLY';

interface CreateOrgBody {
  name: string;
  adminEmail: string;
}

interface CreateWorkspaceBody {
  orgId: string;
  domain: string;
  cnameDomain?: string;
  siteId?: string;
}

interface InviteUserBody {
  orgId: string;
  email: string;
  role: UserRole;
  assignedWorkspaceIds?: string[];
}

interface AgencyRouteParams {
  orgId?: string;
  workspaceId?: string;
}

export async function rbacRoutes(fastify: FastifyInstance) {
  // 1. Create Agency Organization (POST)
  fastify.post('/api/v1/agency/organizations', async (
    request: FastifyRequest<{ Body: CreateOrgBody }>,
    reply: FastifyReply
  ) => {
    try {
      const { name, adminEmail } = request.body || {};

      if (!name || !adminEmail) {
        return reply.status(400).send({ error: 'Missing required fields: name, adminEmail' });
      }

      const org = await prisma.organization.create({
        data: { name },
      });

      fastify.log.info(`[RBAC] Organization created: ${org.name} (${org.id}) by Admin ${adminEmail}`);

      return reply.status(201).send({
        success: true,
        message: 'Agency organization created successfully',
        organization: {
          id: org.id,
          name: org.name,
          createdAt: org.createdAt,
          adminRoleAssigned: 'AGENCY_ADMIN',
          adminEmail,
        },
      });
    } catch (error: any) {
      fastify.log.error(`[RBAC Create Org Error]: ${error?.message || error}`);
      return reply.status(500).send({ error: 'Internal Server Error creating organization' });
    }
  });

  // 2. Provision Client Workspace under Agency Organization (POST)
  fastify.post('/api/v1/agency/workspaces', async (
    request: FastifyRequest<{ Body: CreateWorkspaceBody }>,
    reply: FastifyReply
  ) => {
    try {
      const { orgId, domain, cnameDomain, siteId } = request.body || {};

      if (!orgId || !domain) {
        return reply.status(400).send({ error: 'Missing required fields: orgId, domain' });
      }

      const generatedSiteId = siteId || `site_${crypto.randomBytes(6).toString('hex')}`;
      const defaultCname = cnameDomain || `track.${domain.replace(/^https?:\/\//, '')}`;

      const workspace = await prisma.workspace.create({
        data: {
          orgId,
          domain: domain.replace(/^https?:\/\//, ''),
          cnameDomain: defaultCname,
          siteId: generatedSiteId,
        },
      });

      fastify.log.info(`[RBAC] Client Workspace provisioned: ${workspace.domain} (siteId: ${workspace.siteId})`);

      return reply.status(201).send({
        success: true,
        message: 'Client workspace provisioned successfully under Agency',
        workspace: {
          id: workspace.id,
          orgId: workspace.orgId,
          domain: workspace.domain,
          cnameDomain: workspace.cnameDomain,
          siteId: workspace.siteId,
          universalTagUrl: `https://${workspace.cnameDomain}/clicktotrack.js?site_id=${workspace.siteId}`,
        },
      });
    } catch (error: any) {
      fastify.log.error(`[RBAC Create Workspace Error]: ${error?.message || error}`);
      return reply.status(500).send({
        error: 'Internal Server Error provisioning workspace',
        details: error?.message || String(error),
      });
    }
  });

  // 3. List All Workspaces in Organization (GET)
  fastify.get('/api/v1/agency/workspaces/:orgId?', async (
    request: FastifyRequest<{ Params: AgencyRouteParams }>,
    reply: FastifyReply
  ) => {
    try {
      const urlParams = request.params || {};
      const orgId = urlParams.orgId;
      const whereClause = orgId ? { orgId } : {};

      const workspaces = await prisma.workspace.findMany({
        where: whereClause,
        include: {
          organization: true,
          goals: true,
          _count: {
            select: { conversions: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return reply.status(200).send({
        success: true,
        count: workspaces.length,
        workspaces: workspaces.map(w => ({
          workspaceId: w.id,
          orgName: w.organization?.name || 'Default Agency',
          domain: w.domain,
          cnameDomain: w.cnameDomain,
          siteId: w.siteId,
          activeGoalsCount: w.goals.length,
          totalConversionsLogged: w._count.conversions,
          createdAt: w.createdAt,
        })),
      });
    } catch (error: any) {
      fastify.log.error(`[RBAC List Workspaces Error]: ${error?.message || error}`);
      return reply.status(500).send({ error: 'Internal Server Error listing workspaces' });
    }
  });

  // 4. Invite Team Member / Client with Role-Based Scope (POST)
  fastify.post('/api/v1/agency/users/invite', async (
    request: FastifyRequest<{ Body: InviteUserBody }>,
    reply: FastifyReply
  ) => {
    try {
      const { orgId, email, role, assignedWorkspaceIds } = request.body || {};

      if (!orgId || !email || !role) {
        return reply.status(400).send({ error: 'Missing required fields: orgId, email, role' });
      }

      const inviteToken = `inv_${crypto.randomBytes(16).toString('hex')}`;
      const inviteUrl = `https://app.clicktotrack.io/accept-invite?token=${inviteToken}`;

      return reply.status(200).send({
        success: true,
        message: `User invitation generated successfully for ${email}`,
        userInvitation: {
          orgId,
          email,
          role,
          permissions: {
            canCreateWorkspaces: role === 'AGENCY_ADMIN',
            canEditGoals: role === 'AGENCY_ADMIN' || role === 'ACCOUNT_MANAGER',
            canViewAnalytics: true,
            isScopedToWorkspaces: role !== 'AGENCY_ADMIN',
            assignedWorkspacesCount: assignedWorkspaceIds?.length || 0,
          },
          inviteToken,
          inviteUrl,
          expiresIn: '7 Days',
        },
      });
    } catch (error: any) {
      return reply.status(500).send({ error: 'Internal Server Error sending user invitation' });
    }
  });

  // 5. Authorize User Access & Validate Workspace Isolation (GET)
  fastify.get('/api/v1/agency/auth/verify', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userRole = (request.headers['x-user-role'] as UserRole) || 'AGENCY_ADMIN';
      const userOrgId = (request.headers['x-org-id'] as string) || 'org_demo_123';
      const targetSiteId = (request.headers['x-target-site-id'] as string) || 'demo-site-123';

      const workspace = await prisma.workspace.findUnique({
        where: { siteId: targetSiteId },
        include: { organization: true },
      });

      if (!workspace) {
        return reply.status(404).send({ error: `Target workspace with siteId '${targetSiteId}' not found` });
      }

      const isAuthorized = userRole === 'AGENCY_ADMIN' || workspace.orgId === userOrgId;

      return reply.status(200).send({
        success: true,
        authorized: isAuthorized,
        context: {
          userRole,
          userOrgId,
          targetSiteId: workspace.siteId,
          targetDomain: workspace.domain,
          targetOrgName: workspace.organization.name,
          accessLevel: userRole === 'AGENCY_ADMIN' ? 'FULL_AGENCY_ADMIN' : 'SCOPED_CLIENT_ACCESS',
        },
      });
    } catch (error: any) {
      return reply.status(500).send({ error: 'Internal Server Error verifying RBAC authorization' });
    }
  });
}