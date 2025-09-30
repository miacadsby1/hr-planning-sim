// src/ui/table.js
import { TRAINING_CAP } from '../constants.js';

export function renderTable(el, state, setState) {
  if (!el) return;

  const q = (document.getElementById('search')?.value || '').toLowerCase();

  const employees = (state.employees || []).filter(e => {
    const hay = [e.name, e.position, e.info || ''].join(' ').toLowerCase();
    return hay.includes(q);
  });

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
    const current = trainings[e.id] || ''; // '', 'performance', 'potential'
    const isActive = e.status === 'active';
    const atCapAndNotSelected = used >= cap && (current === '' || current === 'none');

    const tag =
      current === 'performance' ? '<span class="tag perf">Perf</span>' :
      current === 'potential'  ? '<span class="tag pot">Pot</span>'  : '';

    return `
      <tr data-id="${e.id}">
        <td>${e.name} ${tag}</td>
        <td>${e.position}</td>
        <td>${e.performance.toFixed(2)}</td>
        <td>${e.potential.toFixed(2)}</td>
        <td>${e.age ?? ''}</td>
        <td>${e.status}</td>
        <td>
          <select data-id="${e.id}" class="train-select" ${isActive ? '' : 'disabled'}>
            <option value="" ${current === '' || current === 'none' ? 'selected' : ''}>No Training</option>
            <option value="performance" ${current === 'performance' ? 'selected' : ''} ${atCapAndNotSelected ? 'disabled' : ''}>Performance Training</option>
            <option value="potential"  ${current === 'potential'  ? 'selected' : ''} ${atCapAndNotSelected ? 'disabled' : ''}>Potential Development</option>
          </select>
        </td>
      </tr>
    `;
  }).join('');

  el.innerHTML = `
    ${head}
    <table class="table">
      <thead>
        <tr>
          <th>Name</th><th>Position</th><th>Perf</th><th>Pot</th><th>Age</th><th>Status</th><th>Training (cap ${cap})</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;

  // Wire up selects
  el.querySelectorAll('.train-select').forEach(sel => {
    sel.addEventListener('change', () => {
      const id = sel.dataset.id;
      if (!id) return;

      const prev = trainings[id] || '';
      const nextVal = sel.value || ''; // '', 'performance', 'potential'

      // enforce cap
      const currentUsed = Object.values(trainings).filter(v => v && v !== 'none').length;
      const wasCounting = !!prev && prev !== 'none';
      const willCount   = !!nextVal && nextVal !== 'none';
      const projected   = currentUsed + (willCount ? 1 : 0) - (wasCounting ? 1 : 0);

      if (projected > TRAINING_CAP) {
        alert(`Training cap reached (${TRAINING_CAP}). Deselect someone else first.`);
        renderTable(el, state, setState); // revert UI
        return;
      }

      const nextTrainings = { ...(state.trainings || {}) };
      if (!nextVal) delete nextTrainings[id]; else nextTrainings[id] = nextVal;

      setState({ ...state, trainings: nextTrainings }, { warnOnFirstDecision: true });
    });
  });
}