export interface Character {
  id: string;
  name: string;
  subtitle: string;
  emoji: string;
  shirtColor: string;
  capColor: string;
  pantColor: string;
  cost: number;
  unlocked: boolean;
  perk: string;
}

export interface Difficulty {
  id: 'easy' | 'normal' | 'hard';
  name: string;
  speedBase: number;
  speedMax: number;
  accel: number;
  trainSpeed: number;
  multi: number;
  desc: string;
}

export interface Upgrade {
  id: string;
  name: string;
  desc: string;
  icon: string;
  level: number;
  maxLevel: number;
  baseCost: number;
  costMultiplier: number;
  count?: number;
  cost?: number;
}

export interface PowerupState {
  magnet: number;
  multiplier: number;
  boots: number;
  hoverboard: boolean;
}

export type GameObjectType = 'train' | 'low' | 'high' | 'coin' | 'powerup';

export interface GameObject {
  t: GameObjectType;
  l: number; // lane: -1 (left), 0 (center), 1 (right)
  z: number; // distance ahead
  len: number; // length
  d?: number; // collected / destroyed
  c?: number; // color variant
  trainType?: 'vande_bharat' | 'rajdhani';
  speedBonus?: number;
  pType?: 'magnet' | 'multiplier' | 'boots';
  icon?: string;
  color?: string;
}
