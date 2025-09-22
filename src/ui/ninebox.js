import { NINEBOX, PERFORMANCE_BUCKETS, POTENTIAL_BUCKETS } from '../constants.js';

export function renderNineBox(el, state, setState) {
  const active = state.employees.filter(e => e.status === 'active');

  const selectors = active.map(e => {
    const k = e.id;
    const sel = state.ninebox[k] || { perfBucket: 1, potBucket: 1 };

    const perfOpts = PERFORMANCE_BUCKETS.map((b, i) =>
      `<option value="${i}" ${i === sel.perfBucket ? 'selected' : ''}>Perf: ${b}</option>`
    ).join('');

    const potOpts = POTENTIAL_BUCKETS.map((b, i) =>
      `<option value="${i}" ${i === sel.potBucket ? 'selected' : ''}>Pot: ${b}</option>`
    ).join('');

    return `
      <div class="row">
        <span class="badge">${e.name}</span>
        <select class="select perf" data-id="${k}">${perfOpts}</select>
        <select class="select pot" data-id="${k}">${potOpts}</select>
      </div>
    `;
  }).join('');

  const grid = NINEBOX.map((row, r) => `
    <div class="grid-row">
      ${row.map((label, c) =>
        `<div class="slot" data-row="${r}" data-col="${c}">
           <div class="label">${label}</div>
           <div class="bin"></div>
         </div>`
      ).join('')}
    </div>
  `).join('');

  el.innerHTML = `
    <div class="card">
      <div class="stack">${selectors}</div>
    </div>
    <div class="ninebox">${grid}</div>
  `;

  // Persist selections
  el.querySelectorAll('select.perf, select.pot').forEach(sel => {
    sel.addEventListener('change', () => {
      const id = sel.dataset.id;
      const next = {
        ...state,
        ninebox: {
          ...state.ninebox,
          [id]: {
            perfBucket: +(el.querySelector(`select.perf[data-id="${id}"]`).value),
            potBucket:  +(el.querySelector(`select.pot[data-id="${id}"]`).value),
          }
        }
      };
      setState(next, { warnOnFirstDecision: true });
      paintBins(el, next);
    });
  });

  paintBins(el, state);
}

function paintBins(el, state) {
  // Clear bins
  el.querySelectorAll('.bin').forEach(b => b.innerHTML = '');

  for (const [empId, v] of Object.entries(state.ninebox)) {
    const slot = el.querySelector(`.slot[data-row="${v.perfBucket}"][data-col="${v.potBucket}"] .bin`);
    const e = state.employees.find(x => x.id === empId);
    if (slot && e && e.status === 'active') {
      const chip = document.createElement('span');
      chip.className = 'badge';
      chip.textContent = e.name;
      slot.appendChild(chip);
    }
  }
}