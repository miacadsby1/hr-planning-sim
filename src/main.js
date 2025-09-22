import { loadState, saveState, resetState } from './state.js';
import { renderTable } from './ui/table.js';
import { renderNineBox } from './ui/ninebox.js';
import { renderOrgChart } from './ui/orgchart.js';
import { renderApplicants } from './ui/applicants.js';
import { score, advanceOneYear } from './rules.js';

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

  // Score (two targets supported: #score and #current-score)
  const s = score(state).toFixed(2);

  const scoreEl = $('#score');
  if (scoreEl) scoreEl.textContent = 'Current Score: ' + s;

  const currentScoreEl = document.getElementById('current-score');
  if (currentScoreEl) currentScoreEl.textContent = `Score: ${s}`;

  // Round summary list
  const summaryEl = $('#summary');
  if (summaryEl) {
    // Expecting history items with a .summary string; fallback if not present
    summaryEl.innerHTML = state.history
      .map(h => `<div>• ${h.summary ?? JSON.stringify(h)}</div>`)
      .join('');
  }
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