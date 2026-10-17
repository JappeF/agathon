export const SPHERES = [
  'Correspondence',
  'Entropy',
  'Forces',
  'Life',
  'Matter',
  'Mind',
  'Prime',
  'Spirit',
  'Time',
] as const;

export type Sphere = (typeof SPHERES)[number];
