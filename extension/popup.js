document.addEventListener('DOMContentLoaded', async () => {
  const siteIdInput = document.getElementById('site-id-input');
  const toggleBtn = document.getElementById('toggle-inspector-btn');
  const aiPromptInput = document.getElementById('ai-prompt-input');
  const aiSubmitBtn = document.getElementById('ai-submit-btn');
  const aiStatusEl = document.getElementById('ai-status');
  const goalsContainer = document.getElementById('goals-container');
  const goalsCountEl = document.getElementById('goals-count');

  let isInspectorActive = false;

  // Load saved siteId
  chrome.storage.local.get(['siteId', 'inspectorActive'], (result) => {
    if (result.siteId && siteIdInput) {
      siteIdInput.value = result.siteId;
    }
    if (result.inspectorActive) {
      isInspectorActive = true;
      updateBtnState();
    }
    loadConfiguredGoals();
  });

  if (siteIdInput) {
    siteIdInput.addEventListener('change', () => {
      chrome.storage.local.set({ siteId: siteIdInput.value });
      loadConfiguredGoals();
    });
  }

  // Option 1: Point & Click Inspector Toggle
  if (toggleBtn) {
    toggleBtn.addEventListener('click', async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) return;

      isInspectorActive = !isInspectorActive;
      chrome.storage.local.set({ inspectorActive: isInspectorActive, siteId: siteIdInput ? siteIdInput.value : '' });

      chrome.tabs.sendMessage(tab.id, { action: 'TOGGLE_INSPECTOR', enabled: isInspectorActive }, (response) => {
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
  }

  // Option 2: AI Natural Language Prompt Submission
  if (aiSubmitBtn) {
    aiSubmitBtn.addEventListener('click', async () => {
      const prompt = aiPromptInput ? aiPromptInput.value.trim() : '';
      if (!prompt) {
        if (aiStatusEl) {
          aiStatusEl.style.color = '#f59e0b';
          aiStatusEl.textContent = 'Please enter a prompt describing what to track.';
        }
        return;
      }

      if (aiStatusEl) {
        aiStatusEl.style.color = '#a855f7';
        aiStatusEl.textContent = '🤖 Analyzing DOM tree & matching prompt intent...';
      }

      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) return;

      chrome.tabs.sendMessage(tab.id, { action: 'EXECUTE_AI_PROMPT', prompt }, (response) => {
        if (chrome.runtime.lastError) {
          chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content.js']
          }, () => {
            chrome.tabs.sendMessage(tab.id, { action: 'EXECUTE_AI_PROMPT', prompt }, (resp) => {
              if (aiStatusEl) {
                aiStatusEl.style.color = '#22c55e';
                aiStatusEl.textContent = '✨ Target element found! Check page overlay modal.';
              }
            });
          });
        } else {
          if (aiStatusEl) {
            aiStatusEl.style.color = '#22c55e';
            aiStatusEl.textContent = '✨ Target element found! Check page overlay modal.';
          }
        }
      });
    });
  }

  function updateBtnState() {
    if (!toggleBtn) return;
    if (isInspectorActive) {
      toggleBtn.className = 'btn btn-active';
      toggleBtn.innerHTML = '<span>🛑 Exit Selector Mode</span>';
    } else {
      toggleBtn.className = 'btn btn-primary';
      toggleBtn.innerHTML = '<span>🎯 Start Point & Click Selector</span>';
    }
  }

  function loadConfiguredGoals() {
    if (!goalsContainer || !siteIdInput) return;
    const siteId = siteIdInput.value;
    chrome.runtime.sendMessage({ action: 'GET_GOALS', siteId }, (response) => {
      if (response && response.goals && response.goals.length > 0) {
        if (goalsCountEl) goalsCountEl.textContent = `${response.goals.length} configured`;
        goalsContainer.innerHTML = response.goals.map(g => `
          <div class="goal-item">
            <div>
              <div class="goal-name">${escapeHtml(g.title)}</div>
              <div class="goal-category">${escapeHtml(g.category)} • ${escapeHtml(g.selector)}</div>
            </div>
            <span style="color: #16a34a; font-size: 10px; font-weight: 600;">ACTIVE</span>
          </div>
        `).join('');
      } else {
        if (goalsCountEl) goalsCountEl.textContent = '0 configured';
        goalsContainer.innerHTML = `<div style="color: #94a3b8; font-size: 11px; text-align: center; padding: 12px;">No goals saved for ${escapeHtml(siteId)} yet. Use Point & Click or AI Prompt above!</div>`;
      }
    });
  }

  function escapeHtml(str) {
    return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
});