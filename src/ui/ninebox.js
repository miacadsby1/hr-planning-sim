import { NINEBOX, PERFORMANCE_BUCKETS, POTENTIAL_BUCKETS } from '../constants.js';

export function renderNineBox(el, state, setState) {
  // Create a simple per-employee selector UI (drag & drop can be added later).
  const items = state.employees.filter(e => e.status === 'active').map(e => {
    const key = e.id;
    const current = state.ninebox[key] || { perfBucket: 1, potBucket: 1 };
    return `
      <div class="row">
        <span class="badge">${e.name}</span>
        <select class="select perf" data-id="${key}">
          ${PERFORMANCE_BUCKETS.map((b, i) => `<option value="${i}" ${i===current.perfBucket?'selected':''}>Perf: ${b}</option>`).join('')}
        </select>
        <select class="select pot" data-id="${key}">
          ${POTENTIAL_BUCKETS.map((b, i) => `<option value="${i}" ${i===current.potBucket?'selected':''}>Pot: ${b}</option>`).join('')}
        </select>
      </div>
    `;
  }).join('');

  el.innerHTML = `
    <div class="grid">
      ${[0,1,2].map(row => `
        ${[0,1,2].map(col => `
          <div class="cell">
            <h4>${NINEBOX[row][col]}</h4>
            <div class="slot" data-row="${row}" data-col="${col}"></div>
          </div>
        `).join('')}
      `).join('')}
    </div>
    <div class="card" style="margin-top:12px">
      <h4>Assign Buckets</h4>
      ${items}
    </div>
  `;

  // Re-populate the grid using selections
  const placements = {};
  for (const [empId, v] of Object.entries(state.ninebox)) {
    const key = `${v.perfBucket}-${v.potBucket}`;
    placements[key] = placements[key] || [];
    placements[key].push(empId);
  }
  for (const key of Object.keys(placements)) {
    const [r,c] = key.split('-').map(Number);
    const slot = el.querySelector(`.slot[data-row="${r}"][data-col="${c}"]`);
    if (!slot) continue;
    for (const empId of placements[key]) {
      const e = state.employees.find(x => x.id === empId);
      if (!e) continue;
      const div = document.createElement('div');
      div.className = 'badge';
      div.textContent = e.name;
      slot.appendChild(div);
    }
  }

  el.querySelectorAll('select.perf, select.pot').forEach(sel => {
    sel.addEventListener('change', () => {
      const id = sel.dataset.id;
      const curr = state.ninebox[id] || { perfBucket: 1, potBucket: 1 };
      const next = {...curr};
      if (sel.classList.contains('perf')) next.perfBucket = parseInt(sel.value, 10);
      if (sel.classList.contains('pot'))  next.potBucket  = parseInt(sel.value, 10);
      const s = {...state, ninebox: {...state.ninebox, [id]: next }};
      setState(s, {warnOnFirstDecision: true});
    });
  });
}
