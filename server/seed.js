/**
 * seed.js — Seeds 25 teams (split 13/12) + 6 items into Room A and Room B
 * Run: node server/seed.js
 */
require('dotenv').config();
const db = require('./db');

// 25 team definitions — vivid colors
const ALL_TEAMS = [
  { id: 'alpha',   name: 'Team Alpha',   password: 'alpha123',   color: '#3b82f6' },
  { id: 'beta',    name: 'Team Beta',    password: 'beta123',    color: '#f59e0b' },
  { id: 'gamma',   name: 'Team Gamma',   password: 'gamma123',   color: '#a855f7' },
  { id: 'delta',   name: 'Team Delta',   password: 'delta123',   color: '#22c55e' },
  { id: 'epsilon', name: 'Team Epsilon', password: 'epsilon123', color: '#ef4444' },
  { id: 'zeta',    name: 'Team Zeta',    password: 'zeta123',    color: '#ec4899' },
  { id: 'eta',     name: 'Team Eta',     password: 'eta123',     color: '#14b8a6' },
  { id: 'theta',   name: 'Team Theta',   password: 'theta123',   color: '#f97316' },
  { id: 'iota',    name: 'Team Iota',    password: 'iota123',    color: '#06b6d4' },
  { id: 'kappa',   name: 'Team Kappa',   password: 'kappa123',   color: '#84cc16' },
  { id: 'lambda',  name: 'Team Lambda',  password: 'lambda123',  color: '#e11d48' },
  { id: 'mu',      name: 'Team Mu',      password: 'mu123',      color: '#7c3aed' },
  { id: 'nu',      name: 'Team Nu',      password: 'nu123',      color: '#0ea5e9' },
  { id: 'xi',      name: 'Team Xi',      password: 'xi123',      color: '#d97706' },
  { id: 'omicron', name: 'Team Omicron', password: 'omicron123', color: '#10b981' },
  { id: 'pi',      name: 'Team Pi',      password: 'pi123',      color: '#8b5cf6' },
  { id: 'rho',     name: 'Team Rho',     password: 'rho123',     color: '#f43f5e' },
  { id: 'sigma',   name: 'Team Sigma',   password: 'sigma123',   color: '#2563eb' },
  { id: 'tau',     name: 'Team Tau',     password: 'tau123',     color: '#16a34a' },
  { id: 'upsilon', name: 'Team Upsilon', password: 'upsilon123', color: '#9333ea' },
  { id: 'phi',     name: 'Team Phi',     password: 'phi123',     color: '#dc2626' },
  { id: 'chi',     name: 'Team Chi',     password: 'chi123',     color: '#0d9488' },
  { id: 'psi',     name: 'Team Psi',     password: 'psi123',     color: '#ca8a04' },
  { id: 'omega',   name: 'Team Omega',   password: 'omega123',   color: '#7c3aed' },
  { id: 'nexus',   name: 'Team Nexus',   password: 'nexus123',   color: '#06b6d4' },
];

const ROOM_A_TEAMS = ALL_TEAMS.slice(0, 13);   // 13 teams
const ROOM_B_TEAMS = ALL_TEAMS.slice(13, 25);  // 12 teams

const ITEMS = [
  { name: 'Wireless Headphones',  description: 'Premium noise-cancelling', icon: '🎧', base_price: 5000  },
  { name: 'Photography Kit',      description: 'DSLR accessories bundle',  icon: '📷', base_price: 15000 },
  { name: 'Smart Speaker',        description: 'Voice-controlled speaker', icon: '📢', base_price: 4000  },
  { name: 'Portable Projector',   description: 'Mini HD projector',        icon: '📽️', base_price: 20000 },
  { name: 'USB Hub Pro',          description: '10-port USB-C hub',        icon: '🔌', base_price: 3000  },
  { name: 'Premium Notebook Set', description: 'Leather-bound notebooks',  icon: '📓', base_price: 2000  },
];

async function seed() {
  console.log('Seeding Room A and Room B...\n');

  await db.initRoom('a');
  await db.initRoom('b');

  for (const t of ROOM_A_TEAMS) {
    db.insertTeam('a', t.id, t.name, t.password, t.color, 50000);
    console.log(`[Room A] Team: ${t.name} / ${t.id} / ${t.password}`);
  }
  ITEMS.forEach((item, i) => db.insertItem('a', item.name, item.description, item.icon, item.base_price, i+1));
  console.log(`[Room A] Seeded ${ROOM_A_TEAMS.length} teams + ${ITEMS.length} items\n`);

  for (const t of ROOM_B_TEAMS) {
    db.insertTeam('b', t.id, t.name, t.password, t.color, 50000);
    console.log(`[Room B] Team: ${t.name} / ${t.id} / ${t.password}`);
  }
  ITEMS.forEach((item, i) => db.insertItem('b', item.name, item.description, item.icon, item.base_price, i+1));
  console.log(`\n[Room B] Seeded ${ROOM_B_TEAMS.length} teams + ${ITEMS.length} items`);

  db.saveToDisk('a');
  db.saveToDisk('b');
  console.log('\n✅ Seed complete. Room A: 13 teams. Room B: 12 teams.');
  process.exit(0);
}

seed().catch(e => { console.error(e); process.exit(1); });
