// src/ui/orgchart.js

function levelOf(title) {
  if (title.includes('CEO')) return 'CEO';
  if (title.includes('VP')) return 'VP';
  if (title.includes('Director')) return 'Director';
  if (title.includes('Manager')) return 'Manager';
  return 'Specialist';
}

export function renderOrgChart(el, state) {
  if (!el) return;

  // Group all employee records by position title
  const byPosition = new Map();
  for (const e of (state.employees || [])) {
    const key = e.position;
    if (!byPosition.has(key)) byPosition.set(key, []);
    byPosition.get(key).push(e);
  }

  // Build display chips per level, de-duplicated by position
  const groups = { CEO: [], VP: [], Director: [], Manager: [], Specialist: [] };

  for (const [position, list] of byPosition.entries()) {
    const level = levelOf(position);
    const active = list.find(e => e.status === 'active');

    if (active) {
      // Prefer the active incumbent; suppress all non-active entries for this title
      groups[level].push({
        cls: 'badge',
        label: active.name,
        title: `${position} — active`,
      });
    } else {
      // No active holder: show a single VACANT chip (use first record's status as hint)
      const reason = (list[0]?.status || 'vacant');
      groups[level].push({
        cls: 'badge danger',
        label: `${position} — VACANT`,
        title: `${position} — ${reason}`,
      });
    }
  }

  // Render each level card with chips; counts reflect unique positions
  const html = Object.entries(groups).map(([level, chips]) => {
    const chipHtml = chips.map(c =>
      `<span class="${c.cls}" title="${c.title}">${c.label}</span>`
    ).join('');

    return `
      <div class="card">
        <h4>${level} (${chips.length})</h4>
        <div class="flex">${chipHtml}</div>
      </div>
    `;
  }).join('');

  el.innerHTML = html;
}