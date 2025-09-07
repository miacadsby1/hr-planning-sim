import { POSITION_WEIGHTS } from './constants.js';

/** Deterministic small delta based on employee id and round. No randomness. */
export function deterministicDelta(empId, round, kind) {
  // map id chars to code points sum
  const base = empId.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const kindFactor = kind === 'perf' ? 7 : 11;
  const raw = Math.sin((base + round * kindFactor) * 0.137) * 0.35; // ~[-0.35, +0.35]
  // clamp to -0.5..+0.5
  return Math.max(-0.5, Math.min(0.5, raw));
}

export function applyTrainingBoost(score, trainingType) {
  if (!trainingType) return score;
  const boost = 0.7; // within 0.5 - 1.0 window
  // diminishing returns: scale down when already high
  const room = 5.0 - score;
  return Math.min(5.0, score + Math.min(boost, room * 0.75));
}

export function advanceOneYear(state) {
  const s = structuredClone(state);

  // 1) Deterministic fluctuations & training effects
  for (const e of s.employees) {
    if (e.status !== 'active') continue;
    const perfDelta = deterministicDelta(e.id, s.round, 'perf');
    const potDelta  = deterministicDelta(e.id, s.round, 'pot');

    let newPerf = e.performance + perfDelta;
    let newPot  = e.potential + potDelta;

    const t = s.trainings[e.id];
    if (t === 'performance') newPerf = applyTrainingBoost(newPerf, t);
    if (t === 'potential') newPot = applyTrainingBoost(newPot, t);

    e.performance = Math.max(1.0, Math.min(5.0, parseFloat(newPerf.toFixed(1))));
    e.potential   = Math.max(1.0, Math.min(5.0, parseFloat(newPot.toFixed(1))));
  }

  // 2) Turnover rules (deterministic; mirrors the spec)
  for (const e of s.employees) {
    if (e.status !== 'active') continue;
    const info = (e.info || '').toLowerCase();
    // retirements
    if (info.includes('retiring') or info.includes('retire')) {
      // high probability -> make it deterministic: retire at end of round 1
      if (s.round >= 1) e.status = 'retired';
    }
    // quits
    if (info.includes('external opportunities')) {
      // deterministic quit at end of round 1
      if (s.round >= 1) e.status = 'quit';
    }
    // firings for consistently low performance (<= 2.5) across two rounds
    if (e.performance <= 2.5 && s.round >= 2) {
      e.status = 'fired';
    }
  }

  // 3) Open positions -> applicant pool (only the sample roles for demo)
  const vacancies = openPositions(s);
  s.applicants = demoApplicants().filter(a => vacancies.includes(a.position));

  // 4) Clear per-round decisions
  s.trainings = {};
  s.ninebox = {};

  // 5) Push summary & bump round
  s.history.push({
    round: s.round,
    summary: `Year ${s.round} complete. Vacancies: ${vacancies.length}`
  });
  s.round += 1;
  return s;
}

export function openPositions(state) {
  // A position is open if the *person* who occupied it is no longer active.
  const activePositions = new Set(state.employees.filter(e => e.status === 'active').map(e => e.position));
  const allPositions = new Set(state.employees.map(e => e.position));
  return [...allPositions].filter(p => !activePositions.has(p));
}

export function score(state) {
  let total = 0, denom = 0;
  for (const e of state.employees) {
    if (e.status !== 'active') continue;
    const weight = POSITION_WEIGHTS[e.level] ?? 1;
    total += e.performance * weight;
    denom += weight;
  }
  return denom ? (total / denom) : 0;
}

function demoApplicants() {
  // Sample from the spec to keep it light for the starter; expand as needed.
  return [
    { id:'A01', name:'Chris P. Jones', position:'VP, Department B', performance:3.5, potential:4.2, notes:'Strong leadership potential' },
    { id:'A02', name:'Dana M. Smith', position:'Manager, Unit A2.1', performance:4.5, potential:3.0, notes:'Experienced, but limited growth' },
    { id:'A03', name:'Evan R. White', position:'VP, Department D', performance:2.5, potential:3.5, notes:'Entry-level, high learning agility' },
    { id:'A04', name:'Grace T. Brown', position:'Specialist C1.1.2', performance:4.0, potential:4.0, notes:'Well-rounded, good fit for many roles' }
  ];
}
