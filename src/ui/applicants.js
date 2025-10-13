const norm = (t) => (t || '').replace(/\s+/g, ' ').trim();

// A title is "open" if some non-active record has that title AND no active employee currently holds it.
function computeOpenPositions(employees = []) {
  const activeTitles = new Set(
    (employees || []).filter(e => e.status === 'active').map(e => norm(e.position))
  );
  const nonActiveTitles = (employees || []).filter(e => e.status !== 'active').map(e => e.position);
  return Array.from(new Set(nonActiveTitles.filter(t => !activeTitles.has(norm(t)))));
}

// Create a unique-ish new employee id
function newEmpId(existing) {
  const used = new Set((existing || []).map(e => e.id));
  let id;
  do {
    id = 'E' + Math.random().toString(36).slice(2, 6).toUpperCase();
  } while (used.has(id));
  return id;
}

export function renderApplicants(el, state, setState) {
  if (!el) return;

  // 1) Figure out what’s truly open right now
  const openPositions = computeOpenPositions(state.employees || []);
  const applicants = (state.applicants || []).filter(a => openPositions.includes(a.position));

  // 2) Render UI
  if (!openPositions.length) {
    el.innerHTML = `<p class="muted">No open positions right now.</p>`;
  } else if (!applicants.length) {
    el.innerHTML = `<p class="muted">Vacancies detected, but no matching applicants yet.</p>`;
  } else {
    const rows = applicants.map(a => `
      <tr data-id="${a.id}">
        <td>${a.name}</td>
        <td>${a.position}</td>
        <td>${Number(a.performance ?? 3).toFixed(2)}</td>
        <td>${Number(a.potential  ?? 3).toFixed(2)}</td>
        <td>${a.notes ?? ''}</td>
        <td><button class="btn-hire" data-id="${a.id}">Hire into role</button></td>
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
  }

  // 3) Event delegation for resilience across re-renders
  el.onclick = (ev) => {
    const btn = ev.target.closest('.btn-hire');
    if (!btn) return;

    const id = btn.dataset.id;
    const a = (state.applicants || []).find(x => x.id === id);
    if (!a) {
      console.warn('Hire clicked but applicant not found for id:', id);
      alert('Could not find that applicant.');
      return;
    }

    // Debug: log open roles before
    const beforeOpen = computeOpenPositions(state.employees || []);
    console.group(`Hire → ${a.name} into ${a.position}`);
    console.log('Open before:', beforeOpen);

    // New active employee filling the vacancy
    const newEmp = {
      id: newEmpId(state.employees || []),
      name: a.name,
      position: a.position,
      performance: Number(a.performance ?? 3),
      potential:  Number(a.potential  ?? 3),
      age: a.age ?? 30,
      info: a.notes || 'Hired applicant',
      status: 'active'
    };

    // Insert into employees and recompute openings
    const employees = [
  ...(state.employees || []),
  newEmp
].filter(e => !(e.status === 'vacant' && e.position === newEmp.position));
    const stillOpen = computeOpenPositions(employees);
    console.log('Open after :', stillOpen);

    // Shrink applicants to only remaining openings
    const nextApplicants = (state.applicants || []).filter(x => stillOpen.includes(x.position));

    // Update latest round summary so it reflects the hire (open positions + hired list)
    let nextHistory = state.history;
    if (Array.isArray(state.history) && state.history.length) {
      const latest = { ...state.history[state.history.length - 1] };
      latest.openPositions = stillOpen;
      latest.hired = [ ...(latest.hired || []), { id: newEmp.id, name: newEmp.name, position: newEmp.position } ];
      nextHistory = [ ...state.history.slice(0, -1), latest ];
    }

    const next = {
      ...state,
      employees,
      applicants: nextApplicants,
      history: nextHistory
    };

    console.log('New employee:', newEmp);
    console.groupEnd();

    // First decision warning + re-render everything
    setState(next, { warnOnFirstDecision: true });

    // Optional visible feedback
    try { alert(`Hired ${a.name} into ${a.position}`); } catch {}
  };
}