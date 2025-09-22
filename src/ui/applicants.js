function levelOf(title) {
  if (title.includes('CEO')) return 'CEO';
  if (title.includes('VP')) return 'VP';
  if (title.includes('Director')) return 'Director';
  if (title.includes('Manager')) return 'Manager';
  return 'Specialist';
}

export function renderApplicants(el, state, setState) {
  const open = new Set(
    state.employees.filter(e => e.status !== 'active').map(e => e.position)
  );

  if (!state.applicants.length) {
    el.innerHTML = open.size
      ? `<p class="muted">Vacancies detected, but no matching applicants yet.</p>`
      : `<p class="muted">No open positions right now.</p>`;
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
    <table class="table">
      <thead>
        <tr><th>Name</th><th>Target Role</th><th>Perf</th><th>Pot</th><th>Notes</th><th></th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;

  el.querySelectorAll('button[data-id]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const a = state.applicants.find(x => x.id === id);
      if (!a) return;

      const idx = state.employees.findIndex(e => e.position === a.position && e.status !== 'active');
      if (idx >= 0) {
        const hired = {
          id: 'H' + id,
          name: a.name,
          position: a.position,
          performance: a.performance,
          potential: a.potential,
          age: 30,
          info: 'Hired applicant',
          status: 'active',
          level: levelOf(a.position)
        };
        const nextEmployees = state.employees.slice();
        nextEmployees[idx] = hired;

        const next = { ...state, employees: nextEmployees, applicants: state.applicants.filter(x => x.id !== id) };
        setState(next, { warnOnFirstDecision: true });
      } else {
        alert('No matching vacancy found for that role.');
      }
    });
  });
}