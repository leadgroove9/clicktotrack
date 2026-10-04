import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface DashboardRouteParams {
  siteId?: string;
}

export async function dashboardRoutes(fastify: FastifyInstance) {
  // 1. Serve Visual Dashboard HTML Interface (GET /dashboard)
  fastify.get('/dashboard', async (request: FastifyRequest, reply: FastifyReply) => {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ClicktoTrack Control Center</title>
  <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    body { font-family: 'Inter', sans-serif; }
  </style>
</head>
<body class="bg-gray-900 text-gray-100 min-h-screen p-6">
  <div class="max-w-6xl mx-auto space-y-6">

    <!-- HEADER -->
    <header class="flex justify-between items-center bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl">
      <div>
        <h1 class="text-2xl font-bold text-white flex items-center gap-2">⚡ ClicktoTrack Control Center</h1>
        <p class="text-xs text-gray-400 mt-1">Multi-Channel S2S Conversion Engine & Workspace Manager</p>
      </div>
      <div class="flex items-center gap-3">
        <button onclick="openWizard()" class="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-indigo-600/30">
          + Add New Client / Domain
        </button>
        <select id="workspaceSelect" onchange="switchWorkspace(this.value)" class="bg-gray-900 border border-gray-700 text-gray-200 text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-500 font-medium">
          <option value="">Loading client workspaces...</option>
        </select>
      </div>
    </header>

    <!-- KPI CARDS -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div class="bg-gray-800 p-5 rounded-2xl border border-gray-700">
        <div class="text-xs text-gray-400 uppercase tracking-wider font-semibold">30-Day Conversions</div>
        <div class="text-3xl font-bold text-white mt-2" id="kpi-conversions">1,428</div>
        <div class="text-xs text-emerald-400 mt-1">↑ +14.2% vs prior month</div>
      </div>
      <div class="bg-gray-800 p-5 rounded-2xl border border-gray-700">
        <div class="text-xs text-gray-400 uppercase tracking-wider font-semibold">Safari ITP Recovery</div>
        <div class="text-3xl font-bold text-indigo-400 mt-2">+28.4%</div>
        <div class="text-xs text-indigo-300 mt-1">90-Day Cookie Restoration</div>
      </div>
      <div class="bg-gray-800 p-5 rounded-2xl border border-gray-700">
        <div class="text-xs text-gray-400 uppercase tracking-wider font-semibold">Consent Mode v2</div>
        <div class="text-3xl font-bold text-emerald-400 mt-2">Active (100%)</div>
        <div class="text-xs text-gray-400 mt-1">Cookieless Modeling Enabled</div>
      </div>
      <div class="bg-gray-800 p-5 rounded-2xl border border-gray-700">
        <div class="text-xs text-gray-400 uppercase tracking-wider font-semibold">Edge Proxy Status</div>
        <div class="text-3xl font-bold text-emerald-400 mt-2">Healthy</div>
        <div class="text-xs text-emerald-400 mt-1">1st-Party CNAME Proxy Shield</div>
      </div>
    </div>

  </div>

  <!-- ONBOARDING WIZARD MODAL -->
  <div id="wizardModal" class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 hidden flex items-center justify-center p-4">
    <div class="bg-gray-800 border border-gray-700 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
      <div class="flex items-center justify-between border-b border-gray-700 pb-3">
        <h2 class="text-lg font-bold text-white">Add New Client / Domain</h2>
        <button onclick="closeWizard()" class="text-gray-400 hover:text-white font-bold text-xl">&times;</button>
      </div>
      <div class="space-y-4">
        <div>
          <label class="block text-xs font-semibold text-gray-300 mb-1">Company / Client Name</label>
          <input type="text" id="wizName" placeholder="e.g. Acme Plumbing" class="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white">
        </div>
        <div>
          <label class="block text-xs font-semibold text-gray-300 mb-1">Target Website Domain</label>
          <input type="text" id="wizDomain" placeholder="e.g. acmeplumbing.com" class="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white">
        </div>
      </div>
      <div class="flex items-center justify-end space-x-3 pt-3 border-t border-gray-700">
        <button onclick="closeWizard()" class="px-4 py-2 text-xs font-semibold text-gray-400 hover:text-white">Cancel</button>
        <button onclick="saveWorkspace()" class="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2 rounded-lg">Save Client</button>
      </div>
    </div>
  </div>

  <script>
    function openWizard() { document.getElementById('wizardModal').classList.remove('hidden'); }
    function closeWizard() { document.getElementById('wizardModal').classList.add('hidden'); }

    async function loadWorkspaces() {
      try {
        const res = await fetch('/api/v1/workspaces');
        if (!res.ok) return;
        const data = await res.json();
        if (data.workspaces && data.workspaces.length > 0) {
          const select = document.getElementById('workspaceSelect');
          select.innerHTML = '';
          data.workspaces.forEach(ws => {
            const opt = document.createElement('option');
            opt.value = ws.siteId;
            opt.textContent = ws.domain + ' (' + (ws.cnameDomain || 'track.' + ws.domain) + ')';
            select.appendChild(opt);
          });
        }
      } catch (err) {
        console.error('Error loading workspaces:', err);
      }
    }

    async function saveWorkspace() {
      const name = document.getElementById('wizName').value || 'New Client';
      const domain = document.getElementById('wizDomain').value || '';
      if (!domain) {
        alert('Please enter a target website domain.');
        return;
      }
      try {
        const res = await fetch('/api/v1/workspaces', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, domain })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          alert('Successfully created workspace for ' + domain + '!');
          closeWizard();
          loadWorkspaces();
        } else {
          alert('Error: ' + (data.error || 'Failed to save workspace'));
        }
      } catch (err) {
        alert('Error connecting to backend server.');
      }
    }

    function switchWorkspace(val) {
      if (val) {
        alert('Switched active workspace to: ' + val);
      }
    }

    loadWorkspaces();
  </script>
</body>
</html>`;
    return reply.type('text/html').send(html);
  });

  // 2. Dashboard API Overview Endpoint (GET /api/v1/dashboard/overview/:siteId?)
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
          conversions: { take: 100, orderBy: { createdAt: 'desc' } },
        },
      });

      if (!workspace) {
        return reply.status(404).send({ error: `Workspace with siteId '${siteId}' not found` });
      }

      return reply.status(200).send({
        success: true,
        workspace: { siteId: workspace.siteId, domain: workspace.domain },
      });
    } catch (error: any) {
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  });
}
