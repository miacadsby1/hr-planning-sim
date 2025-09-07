export function renderOrgChart(el, state) {
  // Minimal textual tree by grouping by prefixes in the position title.
  const groups = {
    'CEO': [], 'VP': [], 'Director': [], 'Manager': [], 'Specialist': []
  };
  for (const e of state.employees) {
    groups[levelOf(e.position)]?.push(e);
  }

  function levelOf(title) {
    if (title.includes('CEO')) return 'CEO';
    if (title.includes('VP')) return 'VP';
    if (title.includes('Director')) return 'Director';
    if (title.includes('Manager')) return 'Manager';
    return 'Specialist';
  }

  const html = Object.entries(groups).map(([level, list]) => `
    <div class="card">
      <h4>${level} (${list.length})</h4>
      <div class="flex">
        ${list.map(e => `<span class="badge" title="${e.position} — ${e.status}">${e.name}</span>`).join('')}
      </div>
    </div>
  `).join('');

  el.innerHTML = html;
}
