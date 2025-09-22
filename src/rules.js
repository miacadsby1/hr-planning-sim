import { POSITION_WEIGHTS } from './constants.js';

const clamp = (v, lo=1.0, hi=5.0) => Math.max(lo, Math.min(hi, v));

/** Deterministic small delta based on employee id and round. No randomness. */
export function deterministicDelta(empId, round, kind) {
  const base = empId.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const kindFactor = kind === 'perf' ? 7 : 11;
  const raw = Math.sin((base + round * kindFactor) * 0.137) * 0.35; // ~[-0.35, +0.35]
  return Math.max(-0.5, Math.min(0.5, raw));
}

export function applyTrainingBoost(score, trainingType) {
  if (!trainingType) return score;
  // 0.5–1.0 boost with diminishing returns near 5.0
  const boost = 0.7;
  const scaled = score + boost * (1 - (score - 1) / 4); // fades as score approaches 5
  return clamp(scaled);
}

function levelOf(title) {
  if (title.includes('CEO')) return 'CEO';
  if (title.includes('VP')) return 'VP';
  if (title.includes('Director')) return 'Director';
  if (title.includes('Manager')) return 'Manager';
  return 'Specialist';
}

/** Apply performance & potential changes (deterministic + training) */
function updateRatings(e, round, trainingChoice) {
  const perfDelta = deterministicDelta(e.id, round, 'perf');
  const potDelta  = deterministicDelta(e.id, round, 'pot');

  let perf = clamp(e.performance + perfDelta);
  let pot  = clamp(e.potential  + potDelta);

  if (trainingChoice === 'performance') perf = applyTrainingBoost(perf, 'performance');
  if (trainingChoice === 'potential')  pot  = applyTrainingBoost(pot,  'potential');

  return { ...e, performance: perf, potential: pot };
}

/** Deterministic turnover rules (Basic version) */
function applyTurnover(e, round) {
  if (e.status !== 'active') return e;

  const info = (e.info || '').toLowerCase();

  // Retirements: leave at end of Round 1 if flagged
  if (info.includes('retiring') || info.includes('retire')) {
    if (round >= 1) return { ...e, status: 'retired' };
  }

  // Quits: external opportunities leave at end of Round 1
  if (info.includes('external opportunities')) {
    if (round >= 1) return { ...e, status: 'quit' };
  }

  // Firings: consistently very low performance (<= 2.5) for two consecutive rounds
  if (e._lowPerfStrikes && e._lowPerfStrikes >= 2) {
    return { ...e, status: 'fired' };
  }

  return e;
}

/** Track “strikes” for very low performance to enable deterministic firings */
function updateLowPerfStrikes(e) {
  const low = e.performance <= 2.5 ? 1 : 0;
  const strikes = (e._lowPerfStrikes || 0) + low;
  return { ...e, _lowPerfStrikes: strikes };
}

/** Generate applicants only for currently open positions (Basic version) */
function generateApplicantsForOpenRoles(openTitles) {
  const pool = [
    { id:'A01', name:'Chris P. Jones', position:'VP, Department B', performance:3.5, potential:4.2, notes:'Strong leadership potential' },
    { id:'A02', name:'Dana M. Smith', position:'Manager, Unit A2.1', performance:4.5, potential:3.0, notes:'Experienced, but limited growth' },
    { id:'A03', name:'Evan R. White', position:'VP, Department D', performance:2.5, potential:3.5, notes:'Entry-level, high learning agility' },
    { id:'A04', name:'Grace T. Brown', position:'Specialist C1.1.2', performance:4.0, potential:4.0, notes:'Well-rounded, good fit for many roles' },
  ];
  const set = new Set(openTitles);
  return pool.filter(a => set.has(a.position));
}

/** Compute weighted score across active employees */
export function score(state) {
  let total = 0, denom = 0;
  for (const e of state.employees) {
    if (e.status !== 'active') continue;
    const weight = POSITION_WEIGHTS[levelOf(e.position)] ?? 1.0;
    total += e.performance * weight;
    denom += weight;
  }
  return denom ? +(total / denom).toFixed(3) : 0;
}

/** Advance exactly one year (one round), deterministically */
export function advanceOneYear(state) {
  const round = state.round;

  // 1) Update ratings deterministically + training boosts
  let employees = state.employees.map(e =>
    e.status === 'active'
      ? updateLowPerfStrikes(updateRatings(e, round, state.trainings[e.id]))
      : e
  );

  // 2) Apply turnover at end of the year
  employees = employees.map(e => applyTurnover(e, round));

  // 3) Determine open roles (positions held by non-active employees)
  const openPositions = employees
    .filter(e => e.status !== 'active')
    .map(e => e.position);

  // 4) Build applicant pool ONLY for open roles
  const applicants = generateApplicantsForOpenRoles(openPositions);

  // 5) Append round summary
  const roundSummary = {
    round,
    openPositions,
    left: employees.filter(e => ['retired','quit','fired'].includes(e.status)).map(e => ({id:e.id,name:e.name,reason:e.status})),
    score: null // filled after we compute below from active headcount
  };

  const next = {
    ...state,
    round: round + 1,
    employees,
    applicants,
    trainings: {},         // reset training choices each year
    history: [...state.history, roundSummary]
  };

  // 6) Compute score after the turnover (based on active org now)
  const s = score(next);
  next.history[next.history.length - 1].score = s;

  return next;
}
