import { loadState, saveState, resetState } from './state.js';
import { renderTable } from './ui/table.js';
import { renderNineBox } from './ui/ninebox.js';
import { renderOrgChart } from './ui/orgchart.js';
import { renderApplicants } from './ui/applicants.js';
import { score, advanceOneYear } from './rules.js';
import { MAX_ROUNDS } from './constants.js';

let state = loadState();
let warnedThisRound = false;

// Shorthand selector
const $ = (sel) => document.querySelector(sel);

// Centralized state setter with one-time round warning
function setState(next, opts = {}) {
  if (opts.warnOnFirstDecision && !warnedThisRound) {
    alert('Warning: All decisions made in this round are permanent and cannot be undone. Please plan carefully before confirming.');
    warnedThisRound = true;
  }
  state = next;
  saveState(state);
  render();
}

/* ------------ helpers (live vacancy computation for summaries) ------------ */
function computeOpenPositionsFromEmployees(employees = []) {
  const activeTitles    = new Set(employees.filter(e => e.status === 'active').map(e => e.position));
  const nonActiveTitles =        employees.filter(e => e.status !== 'active').map(e => e.position);
  // A title is open if (a) it exists among non-active records, and (b) no active holds it
  return Array.from(new Set(nonActiveTitles.filter(t => !activeTitles.has(t))));
}
/* ------------------------------------------------------------------------- */

/* ---------------- Round Summary renderer (uses LIVE vacancies) ---------------- */
function renderRoundSummary(el, state) {
  if (!el) return;

  const h = state.history || [];
  if (h.length === 0) {
    el.innerHTML = `<div class="muted">No rounds committed yet.</div>`;
    return;
  }

  const last = h[h.length - 1];

  const leftList = (last.left && last.left.length)
    ? last.left.map(x => `<li>${x.name} — ${x.reason}</li>`).join('')
    : '<li>None</li>';

  // LIVE open positions based on current employees (so hires immediately reflect here)
  const openNow = computeOpenPositionsFromEmployees(state.employees || []);
  const openList = openNow.length
    ? openNow.map(t => `<li>${t}</li>`).join('')
    : '<li>No open positions</li>';

  // Optional: show hires if you’re recording them in history (applicants.js assigns latest.hired)
  const hiredList = (last.hired && last.hired.length)
    ? `<div><strong>New hires:</strong><ul style="margin:6px 0 0 18px">${
        last.hired.map(hh => `<li>${hh.name} — ${hh.position}</li>`).join('')
      }</ul></div>`
    : '';

  const trend = h.map(s => `R${s.round}: ${Number(s.score ?? 0).toFixed(2)}`).join(' → ');

  el.innerHTML = `
    <div class="card">
      <h4>Round ${last.round} Summary</h4>
      <div class="stack" style="margin-top:8px">
        <div><strong>Score after round:</strong> ${Number(last.score ?? score(state)).toFixed(2)}</div>
        <div>
          <strong>Left this round:</strong>
          <ul style="margin:6px 0 0 18px">${leftList}</ul>
        </div>
        ${hiredList}
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
/* ----------------------------------------------------------------------------- */

/* ---------------- Final Summary renderer ---------------- */
function renderFinalSummary(el, state) {
  if (!el) return;
  const h = state.history || [];
  if (!h.length) {
    el.innerHTML = '';
    return;
  }

  const trend = h.map(s => `R${s.round}: ${Number(s.score ?? 0).toFixed(2)}`).join(' → ');

  // Remaining vacancies = any non-active positions at the end (live)
  const remainingVacancies = computeOpenPositionsFromEmployees(state.employees || []);
  const vacList = remainingVacancies.length
    ? remainingVacancies.map(t => `<li>${t}</li>`).join('')
    : '<li>None</li>';

  const finalScore = Number(score(state)).toFixed(2);

  el.innerHTML = `
    <div class="card">
      <h3>Final Summary (Basic)</h3>
      <div class="stack" style="margin-top:8px">
        <div><strong>Final score:</strong> ${finalScore}</div>
        <div><strong>Score trend:</strong> ${trend || '—'}</div>
        <div>
          <strong>Remaining vacancies:</strong>
          <ul style="margin:6px 0 0 18px">${vacList}</ul>
        </div>
      </div>
    </div>
  `;
}
/* -------------------------------------------------------- */

function render() {
  // Header indicators
  const roundEl = $('#round-indicator');
  if (roundEl) roundEl.textContent = 'Round: ' + state.round;

  const versionEl = $('#version-indicator');
  if (versionEl) versionEl.textContent = 'Version: ' + (state.version === 'advanced' ? 'Advanced' : 'Basic');

  // Views
  const orgEl = $('#orgchart');
  if (orgEl) renderOrgChart(orgEl, state);

  const tableEl = $('#employee-table');
  if (tableEl) renderTable(tableEl, state, setState);

  const nineEl = $('#ninebox');
  if (nineEl) renderNineBox(nineEl, state, setState);

  const applicantsEl = $('#applicants');
  if (applicantsEl) renderApplicants(applicantsEl, state, setState);

  // Score
  const s = score(state).toFixed(2);
  const scoreEl = $('#score');
  if (scoreEl) scoreEl.textContent = 'Current Score: ' + s;

  const currentScoreEl = document.getElementById('current-score');
  if (currentScoreEl) currentScoreEl.textContent = `Score: ${s}`;

  // Round summary card (now live to hires/promotions)
  const roundSummaryEl = document.querySelector('#round-summary');
  if (roundSummaryEl) renderRoundSummary(roundSummaryEl, state);

  // Final Summary + hide Commit after MAX_ROUNDS
  const isFinal = state.round > MAX_ROUNDS;
  const finalEl = document.querySelector('#final-summary');
  if (finalEl) {
    if (isFinal) renderFinalSummary(finalEl, state);
    else finalEl.innerHTML = '';
  }

  const commitBtn = document.getElementById('btn-commit-round');
  if (commitBtn) {
    commitBtn.disabled = isFinal;
    commitBtn.style.display = isFinal ? 'none' : '';
  }

  // Optional legacy history dump
  const summaryEl = $('#summary');
  if (summaryEl) {
    summaryEl.innerHTML = (state.history || [])
      .map(h => `<div>• ${h.summary ?? `Round ${h.round} — score ${Number(h.score ?? 0).toFixed(2)}`}</div>`)
      .join('');
  }

  // Make UI read-only in final mode (prevents edits after Round MAX_ROUNDS)
  document.querySelectorAll('.train-select, select.perf, select.pot').forEach(sel => {
    sel.disabled = isFinal;
  });
}

// Buttons / toggles / inputs
const newSimBtn = $('#btn-new-sim');
if (newSimBtn) {
  newSimBtn.addEventListener('click', () => {
    if (confirm('Reset all progress?')) {
      warnedThisRound = false;
      state = resetState();
      render();
    }
  });
}

const commitRoundBtn = $('#btn-commit-round');
if (commitRoundBtn) {
  commitRoundBtn.addEventListener('click', () => {
    if (state.round > MAX_ROUNDS) {
      alert('Simulation complete! View the Final Summary.');
      return;
    }
    // Lock decisions and move forward a year
    warnedThisRound = false;
    state = advanceOneYear(state);
    saveState(state);
    render();
  });
}

const toggleAdvanced = $('#toggle-advanced');
if (toggleAdvanced) {
  toggleAdvanced.addEventListener('change', (e) => {
    state = { ...state, version: e.target.checked ? 'advanced' : 'basic' };
    setState(state);
  });
}

const searchInput = $('#search');
if (searchInput) {
  searchInput.addEventListener('input', render);
}

// Initial paint
render();