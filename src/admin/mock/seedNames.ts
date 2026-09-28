/**
 * Deterministic name and label seeds.
 *
 * The mock service layer uses these lists to produce realistic-looking
 * fixture data without needing a faker dependency.
 */

export const FIRST_NAMES: string[] = [
  'Alex', 'Jordan', 'Riley', 'Casey', 'Taylor',
  'Morgan', 'Rowan', 'Skylar', 'Quinn', 'Avery',
  'Peyton', 'Emerson', 'Elliot', 'Blake', 'Cameron',
  'Devon', 'Drew', 'Finley', 'Harper', 'Hayden',
  'Jamie', 'Kai', 'Kendall', 'Kerry', 'Lane',
  'Leslie', 'Logan', 'Marlow', 'Micah', 'Noel',
  'Parker', 'Reese', 'Robin', 'Sam', 'Sawyer',
  'Shea', 'Sidney', 'Toni', 'Wren', 'Zion',
  'Sasha', 'Kim', 'Aiden', 'Nova', 'Sage',
  'Presley', 'Charlie', 'Dakota', 'Ellis', 'Frankie',
];

export const LAST_NAMES: string[] = [
  'Reyes', 'Nguyen', 'Patel', 'Kim', 'Diaz',
  'Ali', 'Johnson', 'Smith', 'Rodriguez', 'Garcia',
  'Williams', 'Miller', 'Davis', 'Wilson', 'Martinez',
  'Anderson', 'Taylor', 'Thomas', 'Hernandez', 'Moore',
  'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson',
  'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez',
  'Lewis', 'Robinson', 'Walker', 'Young', 'Allen',
  'King', 'Wright', 'Scott', 'Torres', 'Nguyen',
  'Hill', 'Flores', 'Green', 'Adams', 'Nelson',
  'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell',
];

export const TRANSPORTERS: string[] = [
  'Northline Freight',
  'Southport Logistics',
  'BayShore Cargo',
  'Greenfield Trucking',
  'Meridian Haulers',
  'Ironway Transport',
  'Pinecrest Delivery',
  'Silverleaf Movers',
  'Blue Ridge Freight',
  'Aspen Peak Logistics',
  'Coastal Runners',
  'Highland Freightlines',
  'Lakeside Distribution',
  'Copper Valley Cargo',
  'Sunset Route Transport',
];

export const CITIES: string[] = [
  'Brooklyn', 'Queens', 'Bronx', 'Newark', 'Jersey City',
  'Yonkers', 'White Plains', 'Stamford', 'Bridgeport', 'Trenton',
  'Rochester', 'Buffalo', 'Syracuse', 'Albany', 'Poughkeepsie',
];

export const STATES: string[] = ['NY', 'NJ', 'CT', 'PA', 'MA'];

export const TAG_POOL: string[] = [
  'priority', 'trainer', 'ops', 'safety', 'compliance',
  'weekend', 'night-shift', 'day-shift', 'trainee', 'lead',
  'external', 'contractor', 'seasonal', 'veteran', 'floater',
];

export const NOTE_TEMPLATES: string[] = [
  'Prefers morning shifts and reachable via SMS during handoff.',
  'Recently completed advanced safety training.',
  'Handles multi-transporter dispatch on the overnight route.',
  'Escalated for pattern of missed check-ins in the last two weeks.',
  'Requested schedule adjustment for the fall semester.',
  'Onboarded during the summer surge; still shadowing the lead.',
  'Backup contact for the coastal region in case of storms.',
  'Pilot participant for the mobile violations workflow.',
  'Prefers email over SMS for reports and audit follow-ups.',
  'Requested audit trail before signing off on ad-hoc access grants.',
];

export const IP_POOL: string[] = [
  '10.0.12.14',
  '10.0.31.7',
  '10.0.44.201',
  '10.0.72.88',
  '10.0.101.32',
  '10.1.5.211',
  '10.1.14.19',
  '10.1.90.44',
  '192.168.30.12',
  '192.168.44.51',
];

export const USER_AGENTS: string[] = [
  'Mozilla/5.0 (Windows NT 11.0; Win64; x64) FleetWatchWeb/2.4.1',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) FleetWatchWeb/2.4.1',
  'Mozilla/5.0 (X11; Linux x86_64) FleetWatchWeb/2.4.1',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_2) FleetWatchWeb/2.4.1',
  'Mozilla/5.0 (Android 14; SM-G990B) FleetWatchWeb/2.4.1',
];
