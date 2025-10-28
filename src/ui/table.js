// src/ui/table.js
import { TRAINING_CAP } from '../constants.js';

// ---------- helpers ----------
const norm = (t) => (t || '').replace(/\s+/g, ' ').trim();
const ORDER = ['Specialist', 'Manager', 'Director', 'VP', 'CEO'];
const fmt = (v) => (v == null ? '—' : Number(v).toFixed(2));

function levelOf(title = '') {
  const t = String(title);
  if (t.includes('CEO')) return 'CEO';
  if (t.includes('VP')) return 'VP';
  if (t.includes('Director')) return 'Director';
  if (t.includes('Manager')) return 'Manager';
  return 'Specialist';
}

function computeOpenPositions(employees = []) {
  const activeTitles = new Set(
    employees.filter(e => e.status === 'active').map(e => norm(e.position))
  );
  const nonActiveTitles = employees
    .filter(e => e.status !== 'active')
    .map(e => e.position);

  return Array.from(new Set(nonActiveTitles.filter(t => !activeTitles.has(norm(t)))));
}

function higherOpenTitlesFor(emp, employees) {
  const myLevel = levelOf(emp.position);
  const myIdx = ORDER.indexOf(myLevel);
  const open = computeOpenPositions(employees);
  return open.filter(t => ORDER.indexOf(levelOf(t)) > myIdx);
}

function makeVacancyRecord(oldPosition, templateEmp) {
  return {
    id: 'VAC-' + Math.random().toString(36).slice(2, 7).toUpperCase(),
    name: `${oldPosition} — vacancy`,
    position: oldPosition,
    performance: templateEmp?.performance ?? 3,
    potential: templateEmp?.potential ?? 3,
    age: templateEmp?.age ?? 30,
    info: 'Vacated by promotion',
    status: 'vacant'
  };
}
// ---------- end helpers ----------


export function renderTable(el, state, setState) {
  if (!el) return;
  const isAdvanced = state.version === 'advanced';

  const q = (document.getElementById('search')?.value || '').toLowerCase();
  const employees = (state.employees || []).filter(e =>
    [e.name, e.position, e.info || ''].join(' ').toLowerCase().includes(q)
  );

  const trainings = state.trainings || {};
  const used = Object.values(trainings).filter(v => v && v !== 'none').length;
  const cap = TRAINING_CAP;

  const head = `
    <div class="row" style="justify-content:space-between; align-items:center; margin-bottom:8px;">
      <div class="muted">Showing ${employees.length} employees</div>
      <div id="training-counter" class="badge ${used >= cap ? 'danger' : ''}">
        Training used: ${used}/${cap}
      </div>
    </div>
  `;

  const rows = employees.map(e => {
    const isActive = e.status === 'active';
    const currentTrain = trainings[e.id] || '';
    const atCapAndNotSelected = used >= cap && (currentTrain === '' || currentTrain === 'none');
    const trainDisabledAttr = isActive ? '' : 'disabled';

    const tag =
      currentTrain === 'performance' ? '<span class="tag perf">Perf</span>' :
      currentTrain === 'potential'  ? '<span class="tag pot">Pot</span>'  : '';

    const promoOptions = higherOpenTitlesFor(e, state.employees || []);
    const promoteDisabled = !isActive || promoOptions.length === 0;
    const promoteSelect = `
      <select class="promote-select" data-id="${e.id}" ${promoteDisabled ? 'disabled' : ''}>
        <option value="">Promote into… ${promoteDisabled ? '(none)' : ''}</option>
        ${promoOptions.map(t => `<option value="${t}">${t}</option>`).join('')}
      </select>
    `;

    const rowClass = isActive ? '' : 'row-inactive';
    const statusKey = String(e.status || 'active').toLowerCase();
    const statusPill = `<span class="pill status-${statusKey}">${e.status}</span>`;

    // Advanced 3×3 columns
    const advancedCols = isAdvanced
      ? `
        <td>${fmt(e.perf1)}</td>
        <td>${fmt(e.perf2)}</td>
        <td>${fmt(e.perf3)}</td>
        <td>${fmt(e.pot1)}</td>
        <td>${fmt(e.pot2)}</td>
        <td>${fmt(e.pot3)}</td>
      `
      : '';

    return `
      <tr data-id="${e.id}" class="${rowClass}">
        <td>${e.name} ${tag}</td>
        <td>${e.position}</td>
        <td>${fmt(e.performance)}</td>
        <td>${fmt(e.potential)}</td>
        ${advancedCols}
        <td>${e.age ?? ''}</td>
        <td>${statusPill}</td>
        <td>
          <select data-id="${e.id}" class="train-select" ${trainDisabledAttr}>
            <option value="" ${!currentTrain || currentTrain === 'none' ? 'selected' : ''}>No Training</option>
            <option value="performance" ${currentTrain === 'performance' ? 'selected' : ''} ${atCapAndNotSelected ? 'disabled' : ''}>Performance Training</option>
            <option value="potential" ${currentTrain === 'potential' ? 'selected' : ''} ${atCapAndNotSelected ? 'disabled' : ''}>Potential Development</option>
          </select>
        </td>
        <td>${promoteSelect}</td>
      </tr>
    `;
  }).join('');

  const extraHead = isAdvanced
    ? `<th>Perf1</th><th>Perf2</th><th>Perf3</th><th>Pot1</th><th>Pot2</th><th>Pot3</th>`
    : '';

  el.innerHTML = `
    ${head}
    <table class="table">
      <thead>
        <tr>
          <th>Name</th><th>Position</th><th>Perf</th><th>Pot</th>
          ${extraHead}
          <th>Age</th><th>Status</th><th>Training (cap ${cap})</th><th>Promote</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;

  // --- Training handler ---
  el.querySelectorAll('.train-select').forEach(sel => {
    sel.addEventListener('change', () => {
      const id = sel.dataset.id;
      if (!id) return;
      const emp = (state.employees || []).find(x => x.id === id);
      if (!emp || emp.status !== 'active') {
        alert('Training can only be assigned to ACTIVE employees.');
        sel.value = (state.trainings || {})[id] || '';
        return;
      }

      const prev = (state.trainings || {})[id] || '';
      const nextVal = sel.value || '';
      const currentUsed = Object.values(state.trainings || {}).filter(v => v && v !== 'none').length;
      const wasCounting = !!prev && prev !== 'none';
      const willCount = !!nextVal && nextVal !== 'none';
      const projected = currentUsed + (willCount ? 1 : 0) - (wasCounting ? 1 : 0);

      if (projected > TRAINING_CAP) {
        alert(`Training cap reached (${TRAINING_CAP}).`);
        sel.value = prev || '';
        return;
      }

      const nextTrainings = { ...(state.trainings || {}) };
      if (!nextVal) delete nextTrainings[id]; else nextTrainings[id] = nextVal;

      setState({ ...state, trainings: nextTrainings }, { warnOnFirstDecision: true });
    });
  });

  // --- Promotion handler ---
  el.querySelectorAll('.promote-select').forEach(sel => {
    sel.addEventListener('change', () => {
      const toTitle = sel.value;
      const empId = sel.dataset.id;
      if (!toTitle || !empId) return;
      const emp = (state.employees || []).find(x => x.id === empId);
      if (!emp || emp.status !== 'active') {
        alert('Only ACTIVE employees can be promoted.');
        sel.value = '';
        return;
      }

      const openNow = computeOpenPositions(state.employees || []);
      if (!openNow.map(norm).includes(norm(toTitle))) {
        alert('That role is not currently open.');
        sel.value = '';
        return;
      }

      const fromTitle = emp.position;
      const updated = (state.employees || []).map(x =>
        x.id === empId ? { ...x, position: toTitle } : x
      );
      const vacancy = makeVacancyRecord(fromTitle, emp);
      const employees = [...updated, vacancy];

      let nextHistory = state.history;
      if (Array.isArray(state.history) && state.history.length) {
        const latest = { ...state.history[state.history.length - 1] };
        latest.openPositions = computeOpenPositions(employees);
        latest.promoted = [
          ...(latest.promoted || []),
          { id: emp.id, name: emp.name, from: fromTitle, to: toTitle }
        ];
        nextHistory = [...state.history.slice(0, -1), latest];
      }

      const next = { ...state, employees, history: nextHistory };
      setState(next, { warnOnFirstDecision: true });
    });
  });
}