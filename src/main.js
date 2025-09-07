import { loadState, saveState, resetState } from './state.js';
import { renderTable } from './ui/table.js';
import { renderNineBox } from './ui/ninebox.js';
import { renderOrgChart } from './ui/orgchart.js';
import { renderApplicants } from './ui/applicants.js';
import { score, advanceOneYear } from './rules.js';

let state = loadState();
let warnedThisRound = false;

const $ = (sel) => document.querySelector(sel);

function setState(next, opts={}) {
  if (opts.warnOnFirstDecision && !warnedThisRound) {
    // Non-dismissible warning before first change in a round
    alert('Warning: All decisions made in this round are permanent and cannot be undone. Please plan carefully before confirming.');
    warnedThisRound = true;
  }
  state = next;
  saveState(state);
  render();
}

function render() {
  $('#round-indicator').textContent = 'Round: ' + state.round;
  $('#version-indicator').textContent = 'Version: ' + (state.version === 'advanced' ? 'Advanced' : 'Basic');
  renderOrgChart($('#orgchart'), state);
  renderTable($('#employee-table'), state, setState);
  renderNineBox($('#ninebox'), state, setState);
  renderApplicants($('#applicants'), state, setState);
  $('#score').textContent = 'Current Score: ' + score(state).toFixed(2);
  $('#summary').innerHTML = state.history.map(h => `<div>• ${h.summary}</div>`).join('');
}

$('#btn-new-sim').addEventListener('click', () => {
  if (confirm('Reset all progress?')) {
    warnedThisRound = false;
    state = resetState();
    render();
  }
});

$('#btn-commit-round').addEventListener('click', () => {
  // lock decisions and move forward a year
  warnedThisRound = false;
  state = advanceOneYear(state);
  saveState(state);
  render();
});

$('#toggle-advanced').addEventListener('change', (e) => {
  state = {...state, version: e.target.checked ? 'advanced' : 'basic'};
  setState(state);
});

$('#search').addEventListener('input', render);

render();
