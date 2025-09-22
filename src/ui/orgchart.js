export function renderOrgChart(el, state) {
  const groups = { CEO: [], VP: [], Director: [], Manager: [], Specialist: [] };

  function levelOf(title) {
    if (title.includes('CEO')) return 'CEO';
    if (title.includes('VP')) return 'VP';
    if (title.includes('Director')) return 'Director';
    if (title.includes('Manager')) return 'Manager';
    return 'Specialist';
  }

  for (const e of state.employees) {
    const level = levelOf(e.position);
    groups[level].push(e);
  }

  const html = Object.entries(groups).map(([level, list]) => {
    const chips = list.map(e => {
      const vacant = e.status !== 'active';
      const cls = 'badge' + (vacant ? ' danger' : '');
      const label = vacant ? `${e.position} — VACANT` : `${e.name}`;
      const title = vacant ? `${e.position} — ${e.status}` : `${e.position} — active`;
      return `<span class="${cls}" title="${title}">${label}</span>`;
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