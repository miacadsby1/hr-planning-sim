export const POSITION_WEIGHTS = {
  'CEO': 5.0,
  'VP': 4.0,
  'Director': 3.0,
  'Manager': 2.0,
  'Specialist': 1.0
};

export const LEVEL_BY_TITLE = (title) => {
  if (title.includes('CEO')) return 'CEO';
  if (title.includes('VP')) return 'VP';
  if (title.includes('Director')) return 'Director';
  if (title.includes('Manager')) return 'Manager';
  return 'Specialist';
};

export const NINEBOX = [
  ['Poor Fit', 'Development Needed', 'Untapped Potential'],
  ['Inconsistent Performer', 'Solid Performer', 'Future Leader'],
  ['Performance Risk', 'Core Performer', 'Star / High Potential']
];

export const POTENTIAL_BUCKETS = ['Low', 'Moderate', 'High'];
export const PERFORMANCE_BUCKETS = ['Low', 'Moderate', 'High'];
