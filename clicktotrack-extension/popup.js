document.addEventListener('DOMContentLoaded', async () => {
  const siteIdInput = document.getElementById('site-id-input');
  const toggleBtn = document.getElementById('toggle-inspector-btn');
  const goalsContainer = document.getElementById('goals-container');
  const goalsCountEl = document.getElementById('goals-count');

  let isInspectorActive = false;

  chrome.storage.local.get(['siteId', 'inspectorActive'], (result) => {
    if (result.siteId) siteIdInput.value = result.siteId;
    if (result.inspectorActive) {
      isInspectorActive = true;
      updateBtnState();
    }
    loadConfiguredGoals();
  });

  siteIdInput.addEventListener('change', () => {
    chrome.storage.local.set({ siteId: siteIdInput.value });
    loadConfiguredGoals();
  });

  toggleBtn.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return;

    isInspectorActive = !isInspectorActive;
    chrome.storage.local.set({ inspectorActive: isInspectorActive, siteId: siteIdInput.value });

    chrome.tabs.sendMessage(tab.id, { action: 'TOGGLE_INSPECTOR', enabled: isInspectorActive }, () => {
      if (chrome.runtime.lastError) {
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js']
        }, () => {
          chrome.tabs.sendMessage(tab.id, { action: 'TOGGLE_INSPECTOR', enabled: isInspectorActive });
        });
      }
      updateBtnState();
    });
  });

  function updateBtnState() {
    toggleBtn.className = isInspectorActive ? 'btn btn-active' : 'btn btn-primary';
    toggleBtn.innerHTML = isInspectorActive ? '<span>🛑 Exit Selector Mode</span>' : '<span>🎯 Start Point & Click Selector</span>';
  }

  function loadConfiguredGoals() {
    const siteId = siteIdInput.value;
    chrome.runtime.sendMessage({ action: 'GET_GOALS', siteId }, (response) => {
      if (response && response.goals && response.goals.length > 0) {
        goalsCountEl.textContent = `${response.goals.length} configured`;
        goalsContainer.innerHTML = response.goals.map(g => `
          <div class="goal-item">
            <div>
              <div style="font-weight: 600; color: #f1f5f9;">${escapeHtml(g.title)}</div>
              <div style="font-size: 10px; color: #94a3b8;">${escapeHtml(g.category)} • ${escapeHtml(g.selector)}</div>
            </div>
            <span style="color: #16a34a; font-size: 10px; font-weight: 600;">ACTIVE</span>
          </div>
        `).join('');
      } else {
        goalsCountEl.textContent = '0 configured';
        goalsContainer.innerHTML = `<div style="color: #94a3b8; font-size: 11px; text-align: center; padding: 12px;">No goals saved for ${escapeHtml(siteId)} yet. Click above to start!</div>`;
      }
    });
  }

  function escapeHtml(str) {
    return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
});