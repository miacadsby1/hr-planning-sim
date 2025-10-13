// src/ui/orgchart.js
export function renderOrgChart(el, state) {
  if (!el) return;

  function levelOf(title = '') {
    if (title.includes('CEO')) return 'CEO';
    if (title.includes('VP')) return 'VP';
    if (title.includes('Director')) return 'Director';
    if (title.includes('Manager')) return 'Manager';
    return 'Specialist';
  }

  const employees = state.employees || [];

  // Build a unique set of positions seen in the data
  const allPositions = Array.from(new Set(employees.map(e => e.position)));

  // For each position, pick either the active holder or a single VACANT placeholder
  const perPosition = allPositions.map(pos => {
    const active = employees.find(e => e.position === pos && e.status === 'active');
    if (active) return active;
    // Otherwise render one synthetic "vacant" entry for that title
    return {
      id: `VAC-${pos}`,
      name: `${pos} — VACANT`,
      position: pos,
      status: 'vacant',
      performance: 0,
      potential: 0,
    };
  });

  // Bucket by level
  const groups = { CEO: [], VP: [], Director: [], Manager: [], Specialist: [] };
  for (const e of perPosition) {
    groups[levelOf(e.position)].push(e);
  }

  // Read hired/promoted (this round) to tag chips
  const last = (state.history || [])[state.history?.length - 1] || {};
  const hiredIds = new Set((last.hired || []).map(h => h.id));
  const promotedIds = new Set((last.promoted || []).map(p => p.id));

  const html = Object.entries(groups).map(([level, list]) => {
    const chips = list.map(e => {
      const isVacant = e.status !== 'active';
      const cls = 'badge' + (isVacant ? ' danger' : '');
      const label = isVacant ? `${e.position} — VACANT` : e.name;
      const title = isVacant ? `${e.position} — vacant` : `${e.position} — active`;

      const mini = !isVacant ? `
        <span class="mini-tags">
          ${hiredIds.has(e.id) ? '<span class="tag hired">Hired</span>' : ''}
          ${promotedIds.has(e.id) ? '<span class="tag promoted">Promoted</span>' : ''}
        </span>` : '';

      return `<span class="${cls}" title="${title}">${label}${mini}</span>`;
    }).join('');

    return `
      <div class="card">
        <h4>${level} (${list.length})</h4>
        <div class="flex">${chips}</div>
      </div>
    `;
  }).join('');

  el.innerHTML = html;
}
