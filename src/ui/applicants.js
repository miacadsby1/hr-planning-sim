export function renderApplicants(el, state, setState) {
  if (!state.applicants.length) {
    el.innerHTML = '<p class="muted">No open positions right now.</p>';
    return;
  }
  const rows = state.applicants.map(a => `
    <tr>
      <td>${a.name}</td>
      <td>${a.position}</td>
      <td>${a.performance.toFixed(1)}</td>
      <td>${a.potential.toFixed(1)}</td>
      <td>${a.notes || ''}</td>
      <td><button data-id="${a.id}">Hire into role</button></td>
    </tr>
  `).join('');

  el.innerHTML = `
    <table>
      <thead><tr><th>Name</th><th>Position</th><th>Perf</th><th>Pot</th><th>Notes</th><th></th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;

  el.querySelectorAll('button[data-id]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const a = state.applicants.find(x => x.id === id);
      if (!a) return;
      // "Hire" by replacing the inactive employee who held that position
      const idx = state.employees.findIndex(e => e.position === a.position && e.status !== 'active');
      if (idx >= 0) {
        state.employees[idx] = {
          id: 'H' + id, name: a.name, position: a.position, performance: a.performance,
          potential: a.potential, age: 30, info: 'Hired applicant', status: 'active', level: levelOf(a.position)
        };
        // remove from applicant pool
        const next = {...state, applicants: state.applicants.filter(x => x.id !== id)};
        setState(next, {warnOnFirstDecision: true});
      } else {
        alert('No matching vacancy found for that role.');
      }
    });
  });

  function levelOf(title) {
    if (title.includes('CEO')) return 'CEO';
    if (title.includes('VP')) return 'VP';
    if (title.includes('Director')) return 'Director';
    if (title.includes('Manager')) return 'Manager';
    return 'Specialist';
  }
}
