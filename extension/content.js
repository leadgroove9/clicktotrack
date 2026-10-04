/**
 * ClicktoTrack Visual Element Inspector & Point-and-Click / AI Goal Selector
 * Content Script injected into target client web pages.
 */

(function () {
  if (window.__clickToTrackInspectorInjected) return;
  window.__clickToTrackInspectorInjected = true;

  let isInspectorActive = false;
  let hoveredElement = null;
  let activeOverlayCard = null;

  // Listen for messages from popup or background script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'TOGGLE_INSPECTOR') {
      isInspectorActive = message.enabled;
      if (isInspectorActive) {
        enableInspector();
      } else {
        disableInspector();
      }
      sendResponse({ status: 'ok', active: isInspectorActive });
    } else if (message.action === 'EXECUTE_AI_PROMPT') {
      executeAiPrompt(message.prompt);
      sendResponse({ status: 'ok' });
    }
    return true;
  });

  function enableInspector() {
    document.addEventListener('mouseover', handleMouseOver, true);
    document.addEventListener('mouseout', handleMouseOut, true);
    document.addEventListener('click', handleClick, true);
    showNotification('ClicktoTrack Inspector Enabled. Hover and click any element to setup a tracking goal.');
  }

  function disableInspector() {
    document.removeEventListener('mouseover', handleMouseOver, true);
    document.removeEventListener('mouseout', handleMouseOut, true);
    document.removeEventListener('click', handleClick, true);
    clearHighlight();
    showNotification('ClicktoTrack Inspector Disabled.');
  }

  function handleMouseOver(e) {
    if (!isInspectorActive) return;
    if (activeOverlayCard && activeOverlayCard.contains(e.target)) return;

    clearHighlight();
    hoveredElement = e.target;
    hoveredElement.style.outline = '3px solid #6366f1';
    hoveredElement.style.outlineOffset = '2px';
    hoveredElement.style.cursor = 'pointer';
  }

  function handleMouseOut(e) {
    if (!isInspectorActive) return;
    if (e.target && e.target === hoveredElement) {
      clearHighlight();
    }
  }

  function clearHighlight() {
    if (hoveredElement) {
      hoveredElement.style.outline = '';
      hoveredElement.style.outlineOffset = '';
      hoveredElement.style.cursor = '';
      hoveredElement = null;
    }
  }

  function handleClick(e) {
    if (!isInspectorActive) return;
    if (activeOverlayCard && activeOverlayCard.contains(e.target)) return;

    e.preventDefault();
    e.stopPropagation();

    const target = e.target;
    const elementData = extractElementDetails(target);
    disableInspector();

    renderGoalModal(elementData);
  }

  // AI Prompt Natural Language Intent Matcher
  function executeAiPrompt(userPrompt) {
    showNotification('🤖 AI Natural Language Mode: Analyzing DOM tree...');
    const promptLower = (userPrompt || '').toLowerCase();
    
    // Find all potential interactive elements on page
    const elements = Array.from(document.querySelectorAll('button, a, form, input[type="submit"], input[type="button"], [role="button"], [class*="btn"], [class*="chat"], [class*="whatsapp"], [class*="form"]'));
    
    let bestMatch = null;
    let highestScore = -1;

    elements.forEach(el => {
      const text = (el.textContent || el.value || el.getAttribute('aria-label') || el.id || el.className || '').toLowerCase();
      let score = 0;

      // Token match scoring
      const promptWords = promptLower.split(/\s+/).filter(w => w.length > 2);
      promptWords.forEach(word => {
        if (text.includes(word)) score += 2;
      });

      // Semantic Intent Boosts
      if (promptLower.includes('phone') || promptLower.includes('call')) {
        if (text.includes('tel:') || text.includes('call') || text.includes('phone') || /\d{3}-\d{3}-\d{4}/.test(text)) score += 5;
      }
      if (promptLower.includes('chat') || promptLower.includes('whatsapp') || promptLower.includes('message')) {
        if (text.includes('chat') || text.includes('whatsapp') || text.includes('message')) score += 5;
      }
      if (promptLower.includes('form') || promptLower.includes('contact') || promptLower.includes('submit') || promptLower.includes('lead')) {
        if (el.tagName === 'FORM' || el.tagName === 'INPUT' || text.includes('submit') || text.includes('send') || text.includes('contact')) score += 5;
      }
      if (promptLower.includes('appointment') || promptLower.includes('book') || promptLower.includes('schedule')) {
        if (text.includes('book') || text.includes('schedule') || text.includes('appointment') || text.includes('calendly')) score += 5;
      }

      if (score > highestScore) {
        highestScore = score;
        bestMatch = el;
      }
    });

    if (!bestMatch) {
      bestMatch = document.querySelector('button, form, a[href^="tel:"]') || document.body;
    }

    // Scroll to & highlight best match with a purple AI border
    bestMatch.scrollIntoView({ behavior: 'smooth', block: 'center' });
    bestMatch.style.outline = '4px solid #a855f7';
    bestMatch.style.outlineOffset = '3px';

    const elementData = extractElementDetails(bestMatch);
    
    // Customize suggested metadata based on prompt intent
    if (promptLower.includes('phone') || promptLower.includes('call')) {
      elementData.suggestedTitle = 'Phone Call Lead';
      elementData.suggestedCategory = 'Phone Call';
    } else if (promptLower.includes('chat') || promptLower.includes('whatsapp')) {
      elementData.suggestedTitle = 'Live Chat Initiated';
      elementData.suggestedCategory = 'Live Chat';
    } else if (promptLower.includes('appointment') || promptLower.includes('book')) {
      elementData.suggestedTitle = 'Booked Appointment';
      elementData.suggestedCategory = 'Booked Appointment';
    } else if (promptLower.includes('form') || promptLower.includes('contact')) {
      elementData.suggestedTitle = 'Lead Form Submission';
      elementData.suggestedCategory = 'Form Fill';
    } else {
      elementData.suggestedTitle = userPrompt.slice(0, 35);
    }

    setTimeout(() => {
      bestMatch.style.outline = '';
      renderGoalModal(elementData);
    }, 600);
  }

  // Generate Stable CSS Selector
  function generateCssSelector(el) {
    if (el.id) return `#${el.id}`;
    if (el.name) return `${el.tagName.toLowerCase()}[name="${el.name}"]`;
    if (el.getAttribute('data-testimonial') || el.getAttribute('data-id')) {
      const dataAttr = el.getAttribute('data-id') ? 'data-id' : 'data-testimonial';
      return `${el.tagName.toLowerCase()}[${dataAttr}="${el.getAttribute(dataAttr)}"]`;
    }

    let path = [];
    while (el && el.nodeType === Node.ELEMENT_NODE) {
      let selector = el.tagName.toLowerCase();
      if (el.className && typeof el.className === 'string' && el.className.trim()) {
        const classes = el.className.trim().split(/\s+/).filter(c => !c.startsWith('ct-') && !c.includes(':')).slice(0, 2);
        if (classes.length) {
          selector += '.' + classes.join('.');
        }
      }
      path.unshift(selector);
      if (el.id) break;
      el = el.parentElement;
      if (path.length >= 3) break;
    }
    return path.join(' > ');
  }

  // Generate Stable XPath
  function generateXPath(el) {
    if (el.id) return `//*[@id="${el.id}"]`;
    const text = el.textContent ? el.textContent.trim().slice(0, 30) : '';
    if (text && (el.tagName === 'BUTTON' || el.tagName === 'A')) {
      return `//${el.tagName.toLowerCase()}[contains(text(), "${text}")]`;
    }
    return `//${el.tagName.toLowerCase()}`;
  }

  // Infer Goal Title and Category based on element context
  function inferGoalMetadata(el) {
    const text = (el.textContent || el.value || el.ariaLabel || '').toLowerCase();
    const tag = el.tagName.toLowerCase();
    const href = el.getAttribute('href') || '';

    if (href.startsWith('tel:') || text.includes('call') || text.includes('phone') || /\d{3}-\d{3}-\d{4}/.test(text)) {
      return { title: 'Phone Call Lead', category: 'Phone Call' };
    }
    if (text.includes('chat') || text.includes('whatsapp') || text.includes('message')) {
      return { title: 'Live Chat Initiated', category: 'Live Chat' };
    }
    if (text.includes('demo') || text.includes('trial')) {
      return { title: 'Request Demo', category: 'Demo Request' };
    }
    if (text.includes('book') || text.includes('schedule') || text.includes('appointment') || text.includes('calendar')) {
      return { title: 'Booked Appointment', category: 'Booked Appointment' };
    }
    if (text.includes('quiz') || text.includes('survey')) {
      return { title: 'Quiz Submission', category: 'Quiz Submit' };
    }
    if (text.includes('buy') || text.includes('checkout') || text.includes('purchase') || text.includes('cart') || text.includes('pay')) {
      return { title: 'Order Sale', category: 'Sale' };
    }
    if (tag === 'form' || tag === 'input' || text.includes('submit') || text.includes('send') || text.includes('contact') || text.includes('get started')) {
      return { title: 'Submit Lead Form', category: 'Form Fill' };
    }

    return { title: 'Custom Conversion Goal', category: 'Form Fill' };
  }

  function extractElementDetails(el) {
    const cssSelector = generateCssSelector(el);
    const xpath = generateXPath(el);
    const { title, category } = inferGoalMetadata(el);

    return {
      tagName: el.tagName.toLowerCase(),
      text: (el.textContent || el.value || '').trim().slice(0, 100),
      cssSelector,
      xpath,
      suggestedTitle: title,
      suggestedCategory: category,
      url: window.location.href,
      domain: window.location.hostname
    };
  }

  // Render Visual Modal Card Overlay
  function renderGoalModal(data) {
    if (activeOverlayCard) activeOverlayCard.remove();

    const card = document.createElement('div');
    card.id = 'clicktotrack-goal-modal';
    card.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      width: 380px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      z-index: 9999999;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #0f172a;
      padding: 20px;
      box-sizing: border-box;
    `;

    card.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <div style="width: 10px; height: 10px; background: #6366f1; border-radius: 50%;"></div>
          <span style="font-weight: 700; font-size: 15px;">ClicktoTrack Goal Setup</span>
        </div>
        <button id="ct-modal-close" style="background: none; border: none; font-size: 18px; cursor: pointer; color: #64748b;">&times;</button>
      </div>

      <div style="margin-bottom: 12px;">
        <label style="display: block; font-size: 12px; font-weight: 600; color: #475569; margin-bottom: 4px;">Goal Title</label>
        <input type="text" id="ct-goal-title" value="${data.suggestedTitle}" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; box-sizing: border-box;">
      </div>

      <div style="margin-bottom: 12px;">
        <label style="display: block; font-size: 12px; font-weight: 600; color: #475569; margin-bottom: 4px;">Goal Category</label>
        <select id="ct-goal-category" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; background: #fff; box-sizing: border-box;">
          <option value="Phone Call" ${data.suggestedCategory === 'Phone Call' ? 'selected' : ''}>Phone Call</option>
          <option value="Form Fill" ${data.suggestedCategory === 'Form Fill' ? 'selected' : ''}>Form Fill</option>
          <option value="Live Chat" ${data.suggestedCategory === 'Live Chat' ? 'selected' : ''}>Live Chat</option>
          <option value="Quiz Submit" ${data.suggestedCategory === 'Quiz Submit' ? 'selected' : ''}>Quiz Submit</option>
          <option value="Demo Request" ${data.suggestedCategory === 'Demo Request' ? 'selected' : ''}>Demo Request</option>
          <option value="Booked Appointment" ${data.suggestedCategory === 'Booked Appointment' ? 'selected' : ''}>Booked Appointment</option>
          <option value="Sale" ${data.suggestedCategory === 'Sale' ? 'selected' : ''}>Sale</option>
        </select>
      </div>

      <div style="margin-bottom: 12px;">
        <label style="display: block; font-size: 12px; font-weight: 600; color: #475569; margin-bottom: 4px;">Captured CSS Selector</label>
        <input type="text" id="ct-css-selector" value="${data.cssSelector}" style="width: 100%; padding: 6px 10px; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 11px; background: #f8fafc; font-family: monospace; box-sizing: border-box;" readonly>
      </div>

      <div style="margin-bottom: 16px;">
        <label style="display: block; font-size: 12px; font-weight: 600; color: #475569; margin-bottom: 6px;">Sync Target Ad Channels</label>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 12px;">
          <label style="display: flex; align-items: center; gap: 6px;"><input type="checkbox" id="ct-sync-gads" checked> Google Ads API</label>
          <label style="display: flex; align-items: center; gap: 6px;"><input type="checkbox" id="ct-sync-ga4" checked> GA4 Key Events</label>
          <label style="display: flex; align-items: center; gap: 6px;"><input type="checkbox" id="ct-sync-meta" checked> Meta CAPI</label>
          <label style="display: flex; align-items: center; gap: 6px;"><input type="checkbox" id="ct-sync-msft" checked> Microsoft Ads</label>
        </div>
      </div>

      <div style="display: flex; gap: 8px;">
        <button id="ct-save-goal" style="flex: 1; padding: 10px; background: #4f46e5; color: #fff; border: none; border-radius: 6px; font-weight: 600; font-size: 13px; cursor: pointer;">Save Conversion Goal</button>
        <button id="ct-cancel-goal" style="padding: 10px 14px; background: #f1f5f9; color: #475569; border: none; border-radius: 6px; font-size: 13px; cursor: pointer;">Cancel</button>
      </div>
      <div id="ct-modal-status" style="margin-top: 10px; font-size: 12px; text-align: center; color: #16a34a; font-weight: 600;"></div>
    `;

    document.body.appendChild(card);
    activeOverlayCard = card;

    document.getElementById('ct-modal-close').onclick = () => card.remove();
    document.getElementById('ct-cancel-goal').onclick = () => card.remove();

    document.getElementById('ct-save-goal').onclick = () => {
      const goalPayload = {
        title: document.getElementById('ct-goal-title').value,
        category: document.getElementById('ct-goal-category').value,
        selector: document.getElementById('ct-css-selector').value,
        xpath: data.xpath,
        url: data.url,
        domain: data.domain,
        channels: {
          googleAds: document.getElementById('ct-sync-gads').checked,
          ga4: document.getElementById('ct-sync-ga4').checked,
          metaCapi: document.getElementById('ct-sync-meta').checked,
          microsoftAds: document.getElementById('ct-sync-msft').checked
        }
      };

      const statusEl = document.getElementById('ct-modal-status');
      statusEl.textContent = 'Saving goal & provisioning ad platform APIs...';

      chrome.runtime.sendMessage({ action: 'SAVE_GOAL', data: goalPayload }, (response) => {
        if (response && response.success) {
          statusEl.style.color = '#16a34a';
          statusEl.textContent = 'Goal provisioned successfully across all ad platforms!';
          setTimeout(() => card.remove(), 2000);
        } else {
          statusEl.style.color = '#dc2626';
          statusEl.textContent = 'Error saving goal: ' + (response?.error || 'Server error');
        }
      });
    };
  }

  function showNotification(msg) {
    const banner = document.createElement('div');
    banner.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: #1e293b;
      color: #ffffff;
      padding: 10px 20px;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 500;
      z-index: 9999999;
      box-shadow: 0 10px 15px -3px rgba(0,0,0,0.3);
      font-family: sans-serif;
    `;
    banner.textContent = msg;
    document.body.appendChild(banner);
    setTimeout(() => banner.remove(), 3500);
  }
})();