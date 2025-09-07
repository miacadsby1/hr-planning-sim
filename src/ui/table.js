import { LEVEL_BY_TITLE } from '../constants.js';

export function renderTable(el, state, setState) {
  const q = document.getElementById('search')?.value?.toLowerCase() ?? '';
  const rows = state.employees
    .filter(e => [e.name, e.position].join(' ').toLowerCase().includes(q))
    .map(e => `
      <tr>
        <td>${e.name}</td>
        <td>${e.position}</td>
        <td>${e.performance.toFixed(1)}</td>
        <td>${e.potential.toFixed(1)}</td>
        <td>${e.age}</td>
        <td>${e.status}</td>
        <td>
          <select data-id="${e.id}" class="train-select">
            <option value="">No Training</option>
            <option value="performance">Performance Training</option>
            <option value="potential">Potential Development</option>
          </select>
        </td>
      </tr>
    `).join('');

  el.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Name</th><th>Position</th><th>Perf</th><th>Pot</th><th>Age</th><th>Status</th><th>Training</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;

  el.querySelectorAll('.train-select').forEach(sel => {
    sel.addEventListener('change', (e) => {
      const id = sel.dataset.id;
      const s = {...state, trainings: {...state.trainings, [id]: sel.value || null }};
      setState(s, {warnOnFirstDecision: true});
    });
  });
}
