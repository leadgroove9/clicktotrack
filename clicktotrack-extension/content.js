(function () {
  if (window.__clickToTrackInspectorInjected) return;
  window.__clickToTrackInspectorInjected = true;

  let isInspectorActive = false;
  let hoveredElement = null;
  let overlayModal = null;

  chrome.runtime.onMessage.addListener((request) => {
    if (request.action === 'TOGGLE_INSPECTOR') {
      isInspectorActive = request.enabled;
      if (isInspectorActive) {
        enableInspector();
      } else {
        disableInspector();
      }
    }
  });

  function enableInspector() {
    document.addEventListener('mouseover', handleMouseOver, true);
    document.addEventListener('mouseout', handleMouseOut, true);
    document.addEventListener('click', handleClick, true);
  }

  function disableInspector() {
    document.removeEventListener('mouseover', handleMouseOver, true);
    document.removeEventListener('mouseout', handleMouseOut, true);
    document.removeEventListener('click', handleClick, true);
    if (hoveredElement) hoveredElement.style.outline = '';
  }

  function handleMouseOver(e) {
    if (!isInspectorActive || isInsideModal(e.target)) return;
    if (hoveredElement) hoveredElement.style.outline = '';
    hoveredElement = e.target;
    hoveredElement.style.outline = '3px solid #6366f1';
  }

  function handleMouseOut(e) {
    if (!isInspectorActive || isInsideModal(e.target)) return;
    if (e.target) e.target.style.outline = '';
  }

  function handleClick(e) {
    if (!isInspectorActive || isInsideModal(e.target)) return;
    e.preventDefault();
    e.stopPropagation();

    const element = e.target;
    element.style.outline = '';
    disableInspector();

    const selector = getUniqueSelector(element);
    const suggestedCategory = inferGoalCategory(element);
    const suggestedTitle = inferGoalTitle(element, suggestedCategory);

    showGoalConfigModal(selector, suggestedCategory, suggestedTitle);
  }

  function isInsideModal(el) {
    return el && el.closest && el.closest('#ct-modal-root');
  }

  function getUniqueSelector(el) {
    if (el.id) return `#${el.id}`;
    if (el.name) return `${el.tagName.toLowerCase()}[name="${el.name}"]`;
    let path = [];
    while (el && el.nodeType === Node.ELEMENT_NODE) {
      let selector = el.tagName.toLowerCase();
      if (el.className) {
        const classes = String(el.className).trim().split(/\s+/).filter(c => c && !c.startsWith('ct-'));
        if (classes.length) selector += `.${classes.join('.')}`;
      }
      path.unshift(selector);
      el = el.parentElement;
    }
    return path.join(' > ');
  }

  function inferGoalCategory(el) {
    const text = (el.innerText || el.value || '').toLowerCase();
    if (text.includes('call') || text.includes('phone') || el.href?.startsWith('tel:')) return 'Phone Call';
    if (text.includes('chat') || text.includes('message')) return 'Live Chat';
    if (text.includes('quiz') || text.includes('survey')) return 'Quiz Submit';
    if (text.includes('demo') || text.includes('trial')) return 'Demo Request';
    if (text.includes('book') || text.includes('schedule') || text.includes('appointment')) return 'Booked Appointment';
    if (text.includes('buy') || text.includes('checkout') || text.includes('order')) return 'Sale';
    return 'Form Fill';
  }

  function inferGoalTitle(el, category) {
    const text = (el.innerText || el.value || '').trim();
    if (text && text.length < 30) return text;
    return `${category} Goal`;
  }

  function showGoalConfigModal(selector, category, title) {
    if (overlayModal) overlayModal.remove();

    overlayModal = document.createElement('div');
    overlayModal.id = 'ct-modal-root';
    overlayModal.innerHTML = `
      <div style="position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(15,23,42,0.7);z-index:999999;display:flex;align-items:center;justify-content:center;font-family:sans-serif;">
        <div style="background:#0f172a;color:#fff;border:1px solid #334155;border-radius:12px;padding:20px;width:360px;box-shadow:0 20px 25px -5px rgba(0,0,0,0.5);">
          <div style="font-size:16px;font-weight:700;margin-bottom:12px;">🎯 Configure Conversion Goal</div>
          <div style="margin-bottom:10px;">
            <label style="font-size:11px;color:#94a3b8;display:block;margin-bottom:4px;">Goal Title</label>
            <input id="ct-title-input" value="${title}" style="width:100%;box-sizing:border-box;padding:8px;background:#1e293b;border:1px solid #334155;border-radius:6px;color:#fff;">
          </div>
          <div style="margin-bottom:10px;">
            <label style="font-size:11px;color:#94a3b8;display:block;margin-bottom:4px;">Goal Category</label>
            <select id="ct-category-select" style="width:100%;box-sizing:border-box;padding:8px;background:#1e293b;border:1px solid #334155;border-radius:6px;color:#fff;">
              <option value="Phone Call" ${category === 'Phone Call' ? 'selected' : ''}>Phone Call</option>
              <option value="Form Fill" ${category === 'Form Fill' ? 'selected' : ''}>Form Fill</option>
              <option value="Live Chat" ${category === 'Live Chat' ? 'selected' : ''}>Live Chat</option>
              <option value="Quiz Submit" ${category === 'Quiz Submit' ? 'selected' : ''}>Quiz Submit</option>
              <option value="Demo Request" ${category === 'Demo Request' ? 'selected' : ''}>Demo Request</option>
              <option value="Booked Appointment" ${category === 'Booked Appointment' ? 'selected' : ''}>Booked Appointment</option>
              <option value="Sale" ${category === 'Sale' ? 'selected' : ''}>Sale</option>
            </select>
          </div>
          <div style="margin-bottom:14px;">
            <label style="font-size:11px;color:#94a3b8;display:block;margin-bottom:4px;">CSS Selector</label>
            <input value="${selector}" readonly style="width:100%;box-sizing:border-box;padding:8px;background:#1e293b;border:1px solid #334155;border-radius:6px;color:#94a3b8;font-size:11px;">
          </div>
          <div style="display:flex;gap:8px;">
            <button id="ct-cancel-btn" style="flex:1;padding:10px;background:#334155;border:none;border-radius:6px;color:#fff;cursor:pointer;">Cancel</button>
            <button id="ct-save-btn" style="flex:1;padding:10px;background:#6366f1;border:none;border-radius:6px;color:#fff;font-weight:600;cursor:pointer;">Save Goal</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlayModal);

    document.getElementById('ct-cancel-btn').addEventListener('click', () => overlayModal.remove());
    document.getElementById('ct-save-btn').addEventListener('click', () => {
      const finalTitle = document.getElementById('ct-title-input').value;
      const finalCat = document.getElementById('ct-category-select').value;

      chrome.storage.local.get(['siteId'], (res) => {
        const siteId = res.siteId || 'demo-site-123';
        chrome.runtime.sendMessage({
          action: 'SAVE_GOAL',
          goalData: { siteId, title: finalTitle, category: finalCat, selector }
        }, () => {
          overlayModal.remove();
          alert(`✅ Goal "${finalTitle}" saved for ${siteId}!`);
        });
      });
    });
  }
})();