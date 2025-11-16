// src/main.js
import { loadState, saveState, resetState } from './state.js';
import { renderTable } from './ui/table.js';
import { renderNineBox } from './ui/ninebox.js';
import { renderOrgChart } from './ui/orgchart.js';
import { renderApplicants } from './ui/applicants.js';
import { score, advanceOneYear } from './rules.js';
import { MAX_ROUNDS, TRAINING_CAP } from './constants.js';

let state = loadState();
let warnedThisRound = false;

// Short-hand selector
const $ = (sel) => document.querySelector(sel);

/* ======================= State & Warning ======================= */

function setState(next, opts = {}) {
  const { warnOnFirstDecision = false } = opts;

  if (warnOnFirstDecision && !warnedThisRound) {
    alert(
      'Warning: All decisions in this round are permanent and cannot be undone. ' +
      'Please review carefully before committing.'
    );
    warnedThisRound = true;
  }

  state = next;
  saveState(state);
  render();
}

/* ========================= Final Mode UI ======================= */

function setFinalMode(enabled) {
  const overlay = $('#final-overlay');
  if (!overlay) return;

  if (enabled) {
    document.body.classList.add('final-mode');
    overlay.style.display = 'flex';
  } else {
    document.body.classList.remove('final-mode');
    overlay.style.display = 'none';
  }
}

/* ================== Helpers for summaries ====================== */

function computeOpenPositions(employees = []) {
  const norm = (t) => (t || '').replace(/\s+/g, ' ').trim();

  const activeTitles = new Set(
    employees.filter(e => e.status === 'active').map(e => norm(e.position))
  );

  const inactiveTitles = employees
    .filter(e => e.status !== 'active')
    .map(e => e.position);

  return Array.from(
    new Set(inactiveTitles.filter(t => !activeTitles.has(norm(t))))
  );
}

function renderRoundSummary(el, state) {
  if (!el) return;

  const hist = state.history || [];
  if (!hist.length) {
    el.innerHTML = `<div class="muted">No rounds committed yet.</div>`;
    return;
  }

  const last = hist[hist.length - 1];

  const leftList = last.left?.length
    ? last.left.map(x => `<li>${x.name} — ${x.reason}</li>`).join('')
    : '<li>None</li>';

  const open = computeOpenPositions(state.employees);
  const openList = open.length
    ? open.map(t => `<li>${t}</li>`).join('')
    : '<li>No open positions</li>';

  const hiredBlock = last.hired?.length
    ? `
      <div>
        <strong>New hires:</strong>
        <ul style="margin:6px 0 0 18px">
          ${last.hired.map(h => `<li>${h.name} — ${h.position}</li>`).join('')}
        </ul>
      </div>`
    : '';

  const promotedBlock = last.promoted?.length
    ? `
      <div>
        <strong>Promotions:</strong>
        <ul style="margin:6px 0 0 18px">
          ${last.promoted
            .map(p => `<li>${p.name}: ${p.from} → ${p.to}</li>`)
            .join('')}
        </ul>
      </div>`
    : '';

  const trend = hist
    .map(s => `R${s.round}: ${Number(s.score).toFixed(2)}`)
    .join(' → ');

  el.innerHTML = `
    <div class="card">
      <h4>Round ${last.round} Summary</h4>
      <div class="stack" style="margin-top:8px">
        <div><strong>Score after round:</strong> ${Number(last.score).toFixed(2)}</div>
        <div>
          <strong>Left this round:</strong>
          <ul style="margin:6px 0 0 18px">${leftList}</ul>
        </div>
        ${hiredBlock}
        ${promotedBlock}
        <div>
          <strong>Open positions:</strong>
          <ul style="margin:6px 0 0 18px">${openList}</ul>
        </div>
      </div>
    </div>
    <div class="card" style="margin-top:10px">
      <strong>Score trend:</strong> ${trend || '—'}
    </div>
  `;
}

function renderFinalSummary(el, state) {
  if (!el) return;

  const hist = state.history || [];
  if (!hist.length) {
    el.innerHTML = '';
    return;
  }

  const finalScore = Number(score(state)).toFixed(2);
  const trend = hist
    .map(s => `R${s.round}: ${Number(s.score).toFixed(2)}`)
    .join(' → ');

  const vacancies = computeOpenPositions(state.employees);
  const vacList = vacancies.length
    ? vacancies.map(t => `<li>${t}</li>`).join('')
    : '<li>None</li>';

  el.innerHTML = `
    <div class="card">
      <h3>Final Summary (${state.version === 'advanced' ? 'Advanced' : 'Basic'})</h3>
      <div class="stack" style="margin-top:8px">
        <div><strong>Final score:</strong> ${finalScore}</div>
        <div><strong>Score trend:</strong> ${trend}</div>
        <div>
          <strong>Remaining vacancies:</strong>
          <ul style="margin:6px 0 0 18px">${vacList}</ul>
        </div>
      </div>
    </div>
  `;
}

/* =========================== Render ============================ */

function render() {
  // Header bits
  const roundEl = $('#round-indicator');
  if (roundEl) roundEl.textContent = `Round: ${state.round}`;

  const versionEl = $('#version-indicator');
  if (versionEl)
    versionEl.textContent =
      `Version: ${state.version === 'advanced' ? 'Advanced' : 'Basic'}`;

  // Main panels
  renderOrgChart($('#orgchart'), state);
  renderTable($('#employee-table'), state, setState);

  const nineboxEl = $('#ninebox') || $('#ninebox-grid');
  if (nineboxEl) renderNineBox(nineboxEl, state, setState);

  renderApplicants($('#applicants'), state, setState);

  // Score
  const val = score(state).toFixed(2);
  const scoreEl = $('#current-score');
  if (scoreEl) scoreEl.textContent = `Score: ${val}`;

  // Round summary
  renderRoundSummary($('#round-summary'), state);

  // Final mode
  const isFinished = state.round > MAX_ROUNDS;
  const commitBtn = $('#btn-commit-round');
  if (commitBtn) commitBtn.style.display = isFinished ? 'none' : '';

  if (isFinished) {
    setFinalMode(true);
    renderFinalSummary($('#final-summary'), state);
  } else {
    setFinalMode(false);
  }
}

/* ====================== Event Handlers ========================= */

// New simulation
$('#btn-new-sim')?.addEventListener('click', () => {
  if (!confirm('Start a new simulation? All progress will be lost.')) return;
  warnedThisRound = false;
  state = resetState(state.version);
  render();
});

// COMMIT ROUND
$('#btn-commit-round')?.addEventListener('click', () => {
  if (state.round > MAX_ROUNDS) {
    alert("Simulation complete. View the final summary.");
    return;
  }

  // 1) HARD CHECK: every ACTIVE employee must have a nine-box placement
  const activeEmployees = (state.employees || []).filter(e => e.status === 'active');
  const nb = state.ninebox || {};

  const missingNinebox = activeEmployees.filter(e => {
    const box = nb[e.id];
    return !box ||
      typeof box.perfBucket !== 'number' ||
      typeof box.potBucket  !== 'number';
  });

  if (missingNinebox.length > 0) {
    const list = missingNinebox
      .map(e => `• ${e.name} (${e.position})`)
      .join('\n');

    alert(
      'Before you commit the round, every ACTIVE employee must have a ' +
      'performance/potential bucket in the nine-box.\n\n' +
      'Missing for:\n' + list
    );
    return; // block commit
  }

  // 2) SOFT CHECK: warn about unused training slots (but allow override)
  const used = Object.values(state.trainings || {}).filter(v => v && v !== 'none').length;
  const remaining = Math.max(0, (TRAINING_CAP ?? 4) - used);

  let warning = '';
  if (remaining > 0) {
    warning += `• ${remaining} training slot(s) unused this round\n`;
  }

  if (warning) {
    const ok = confirm(
      `Before committing, note:\n\n${warning}\nCommit round anyway?`
    );
    if (!ok) return;
  }

  // 3) All good → advance one year
  warnedThisRound = false;
  const next = advanceOneYear(state);
  setState(next);
});

// Advanced/basic toggle
$('#toggle-advanced')?.addEventListener('change', (e) => {
  const version = e.target.checked ? 'advanced' : 'basic';
  if (!confirm(`Switch to ${version} version? This will reset the simulation.`)) {
    e.target.checked = state.version === 'advanced';
    return;
  }
  warnedThisRound = false;
  state = resetState(version);
  saveState(state);
  render();
});

// Search filter – the table module reads the input value directly
$('#search')?.addEventListener('input', render);

// Final overlay restart
$('#btn-restart')?.addEventListener('click', () => {
  if (!confirm('Start a new simulation?')) return;
  warnedThisRound = false;
  state = resetState(state.version);
  setFinalMode(false);
  saveState(state);
  render();
});

// Initial paint
render();