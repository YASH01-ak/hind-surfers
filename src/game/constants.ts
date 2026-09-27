import { Character, Difficulty, Upgrade } from './types';

export const CHARACTERS: Character[] = [
  {
    id: 'veer',
    name: 'Veer',
    subtitle: 'The Railway Surfer',
    emoji: '🏃‍♂️',
    shirtColor: '#ff9933',
    capColor: '#138808',
    pantColor: '#f4ede2',
    cost: 0,
    unlocked: true,
    perk: 'Classic balanced speed'
  },
  {
    id: 'ananya',
    name: 'Ananya',
    subtitle: 'Techie Runner',
    emoji: '👩‍💻',
    shirtColor: '#06b6d4',
    capColor: '#ec4899',
    pantColor: '#1e1b4b',
    cost: 150,
    unlocked: false,
    perk: '+20% Rupee Magnet range'
  },
  {
    id: 'sheru',
    name: 'Sheru',
    subtitle: 'Desi Pahalwan',
    emoji: '🦁',
    shirtColor: '#dc2626',
    capColor: '#f59e0b',
    pantColor: '#fef08a',
    cost: 350,
    unlocked: false,
    perk: 'Longer super slide duration'
  },
  {
    id: 'babu',
    name: 'Babu Bhaiya',
    subtitle: 'Dhoti King',
    emoji: '🧔',
    shirtColor: '#eab308',
    capColor: '#ffffff',
    pantColor: '#ffffff',
    cost: 600,
    unlocked: false,
    perk: '+20% Score points multiplier'
  }
];

export const DIFFICULTIES: Record<string, Difficulty> = {
  easy: {
    id: 'easy',
    name: 'Passenger',
    speedBase: 15,
    speedMax: 26,
    accel: 0.0028,
    trainSpeed: 6,
    multi: 1.0,
    desc: 'Slow & easy dodging'
  },
  normal: {
    id: 'normal',
    name: 'Express',
    speedBase: 18,
    speedMax: 33,
    accel: 0.0042,
    trainSpeed: 9,
    multi: 1.25,
    desc: 'Classic Indian railway rush'
  },
  hard: {
    id: 'hard',
    name: 'Vande Bharat',
    speedBase: 22,
    speedMax: 42,
    accel: 0.0065,
    trainSpeed: 14,
    multi: 1.6,
    desc: 'Fast & lightning reflexes'
  }
};

export const UPGRADES: Upgrade[] = [
  {
    id: 'magnet_upgrade',
    name: 'Chumbak Magnet',
    desc: 'Pulls nearby rupees towards you automatically',
    icon: '🧲',
    level: 1,
    maxLevel: 5,
    baseCost: 80,
    costMultiplier: 1.8
  },
  {
    id: 'multiplier_upgrade',
    name: '2X Sona Booster',
    desc: 'Doubles all score and rupee coin rewards',
    icon: '🪙',
    level: 1,
    maxLevel: 5,
    baseCost: 100,
    costMultiplier: 2.0
  },
  {
    id: 'boots_upgrade',
    name: 'Super Jump Boots',
    desc: 'Leap extra high above oncoming express trains',
    icon: '👟',
    level: 1,
    maxLevel: 5,
    baseCost: 120,
    costMultiplier: 2.0
  },
  {
    id: 'hoverboard_item',
    name: 'Tejas Hoverboard',
    desc: 'Double tap or press H for 1 crash shield protection!',
    icon: '🛹',
    level: 1,
    maxLevel: 99,
    baseCost: 50,
    costMultiplier: 1,
    count: 2,
    cost: 50
  }
];
