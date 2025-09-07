import { employees as INITIAL_EMPLOYEES } from './data/employees_basic.js';
import { LEVEL_BY_TITLE } from './constants.js';

const KEY = 'hr-sim-state-v1';

export const defaultState = () => ({
  round: 1,
  version: 'basic', // 'basic' | 'advanced'
  employees: INITIAL_EMPLOYEES.map(e => ({...e, status:'active', level: LEVEL_BY_TITLE(e.position)})),
  ninebox: {}, // employeeId -> { perfBucket: 0..2, potBucket: 0..2 }
  trainings: {}, // employeeId -> 'performance' | 'potential' | null
  applicants: [],
  history: [] // summaries per round
});

export function loadState() {
  const raw = localStorage.getItem(KEY);
  if (!raw) return defaultState();
  try {
    const s = JSON.parse(raw);
    return s;
  } catch {
    return defaultState();
  }
}

export function saveState(s) {
  localStorage.setItem(KEY, JSON.stringify(s));
}

export function resetState() {
  const s = defaultState();
  saveState(s);
  return s;
}
