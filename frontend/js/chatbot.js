/**
 * chatbot.js — Chatbot UI and Groq integration via API.
 * Micro-interaction: soft teal cursor glow that follows mouse
 * within the chat container (from transcript: "cursor effects
 * take the build from professional to expensive").
 */

import { API } from './api.js';

let _cancer = '';
let _busy   = false;

export function initChatbot(getCancer) {
  const panel    = document.querySelector('.chatbot-panel');
  const messages = document.getElementById('chatMessages');
  const input    = document.getElementById('chatInput');
  const sendBtn  = document.getElementById('chatSend');
  const suggBtns = document.querySelectorAll('.chat-suggestion-btn');

  if (!panel || !messages || !input || !sendBtn) return;

  // ── Cursor glow micro-interaction ─────────────────────────
  panel.addEventListener('mousemove', e => {
    const rect = panel.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    panel.style.setProperty('--cx', cx + 'px');
    panel.style.setProperty('--cy', cy + 'px');
  });

  // ── Send on Enter (Shift+Enter = newline) ─────────────────
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  });

  sendBtn.addEventListener('click', send);

  // ── Suggestion chips ───────────────────────────────────────
  suggBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      input.value = btn.dataset.q;
      input.focus();
      send();
    });
  });

  async function send() {
    if (_busy) return;
    _cancer = getCancer();
    const question = input.value.trim();
    if (!question) { input.classList.add('shake'); setTimeout(() => input.classList.remove('shake'), 500); return; }

    appendMsg('user', question);
    input.value = '';
    sendBtn.disabled = true;
    _busy = true;

    const typingEl = appendMsg('assistant', '…', 'typing');

    try {
      const data = await API.chat(question, _cancer);
      typingEl.remove();
      appendMsg('assistant', data.answer);
    } catch (err) {
      typingEl.remove();
      appendMsg('assistant', `Unable to answer right now. Check that the backend is running and your Groq API key is set.`);
    } finally {
      sendBtn.disabled = false;
      _busy = false;
    }
  }

  function appendMsg(role, text, extra = '') {
    const div = document.createElement('div');
    div.className = `chat-msg ${role} ${extra}`.trim();
    div.textContent = text;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
    return div;
  }
}
