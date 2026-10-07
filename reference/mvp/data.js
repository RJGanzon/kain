/* ============================================================
   KAIN MVP DATA
   SAMPLE DATA FOR THE DEMO. Prices, dates and nutrient values
   below are illustrative. Replace INGREDIENTS with the team's
   dated market dataset and FNRI PhilFCT values before showing
   real numbers.
   ------------------------------------------------------------
   Units: kg items -> recipe qty in grams; L items -> qty in ml;
   pc / bundle / can / pack -> qty in that unit.
   n = per 100 g edible portion:
       [kcal, protein g, iron mg, vitamin A ug RAE, calcium mg, vitamin C mg]
   g  = grams per unit (per litre for L items)
   ep = edible portion (share of what you buy that is eaten)
   prev = price four weeks earlier (for spike alerts and trends)
   tier = where the price came from (see TIERS)
   ============================================================ */

const TIERS = {
  contrib:   { label: 'Contributor',   rank: 1, desc: 'Recent price from a trusted contributor at this market' },
  log:       { label: 'Your log',      rank: 1, desc: 'From a purchase you logged; checked against other prices' },
  da_market: { label: 'DA · market',   rank: 2, desc: 'DA Bantay Presyo price for the nearest market' },
  da_avg:    { label: 'DA · average',  rank: 3, desc: 'DA average across markets in the region' },
  estimate:  { label: 'Estimate',      rank: 4, desc: 'Clearly labeled estimate when no recent price exists' },
};

const MARKETS = ['Pampang Market', 'San Nicolas Market', 'Anunas Market'];

const CATS = {
  staple: 'Rice & bread', fish: 'Fish', meat: 'Meat', egg: 'Eggs', legume: 'Beans & tofu',
  canned: 'Canned', veg: 'Vegetables', spice: 'Aromatics', pantry: 'Pantry',
};
const ANIMAL_CATS = ['fish', 'meat', 'egg', 'canned'];

function I(id, name, cat, unit, price, prev, g, ep, n, tier, date, aliases) {
  return { id, name, cat, unit, price, prev, g, ep, n, tier, date, aliases };
}

const INGREDIENTS = [
  I('bigas',     'Bigas (well-milled)',   'staple', 'kg',     50,  49, 1000, 1.00, [361, 7.1, 0.8, 0, 10, 0],      'da_market', '2026-10-02', ['bigas','rice','well milled','well-milled']),
  I('pandesal',  'Pandesal',              'staple', 'pc',      5,   5,   35, 1.00, [280, 8.5, 2.5, 0, 50, 0],      'contrib',   '2026-10-04', ['pandesal','pandisal','tinapay','bread']),
  I('itlog',     'Itlog',                 'egg',    'pc',    8.5,   8,   60, 0.88, [143, 12.6, 1.8, 160, 56, 0],   'contrib',   '2026-10-05', ['itlog','egg','eggs']),
  I('galunggong','Galunggong',            'fish',   'kg',    280, 250, 1000, 0.60, [110, 20, 1.5, 20, 60, 0],      'contrib',   '2026-10-05', ['galunggong','gg','round scad']),
  I('bangus',    'Bangus',                'fish',   'kg',    230, 225, 1000, 0.65, [150, 20, 0.8, 30, 50, 0],      'contrib',   '2026-10-05', ['bangus','milkfish']),
  I('tilapia',   'Tilapia',               'fish',   'kg',    150, 145, 1000, 0.50, [96, 20, 0.6, 0, 10, 0],        'da_market', '2026-10-02', ['tilapia']),
  I('manok',     'Manok',                 'meat',   'kg',    210, 200, 1000, 0.75, [190, 18, 1.0, 40, 12, 0],      'da_market', '2026-10-02', ['manok','chicken']),
  I('atay',      'Atay ng manok',         'meat',   'kg',    170, 165, 1000, 1.00, [119, 17, 9.0, 3300, 8, 18],    'estimate',  '2026-09-28', ['atay','chicken liver','liver']),
  I('baboy',     'Baboy (kasim)',         'meat',   'kg',    360, 350, 1000, 0.95, [250, 17, 1.0, 5, 10, 0],       'da_market', '2026-10-02', ['baboy','pork','kasim']),
  I('baka',      'Baka',                  'meat',   'kg',    480, 470, 1000, 0.95, [220, 20, 2.5, 0, 12, 0],       'da_avg',    '2026-10-02', ['baka','beef']),
  I('munggo',    'Munggo',                'legume', 'kg',    130, 128, 1000, 1.00, [347, 24, 6.7, 6, 132, 5],      'da_market', '2026-10-02', ['munggo','monggo','mongo','mung beans']),
  I('tokwa',     'Tokwa',                 'legume', 'pc',     12,  12,  120, 1.00, [145, 15, 2.7, 0, 200, 0],      'contrib',   '2026-10-04', ['tokwa','tukwa','tofu']),
  I('sardinas',  'Sardinas (155 g)',      'canned', 'can',    26,  25,  155, 1.00, [180, 18, 2.5, 30, 300, 0],     'contrib',   '2026-10-04', ['sardinas','sardines']),
  I('kangkong',  'Kangkong',              'veg',    'bundle', 20,  18,  250, 0.70, [20, 2.6, 1.7, 315, 77, 55],    'contrib',   '2026-10-05', ['kangkong','water spinach']),
  I('malunggay', 'Malunggay',             'veg',    'bundle', 15,  15,  120, 0.50, [64, 9.4, 4.0, 378, 185, 51],   'estimate',  '2026-09-28', ['malunggay','moringa']),
  I('pechay',    'Pechay',                'veg',    'kg',     80,  70, 1000, 0.85, [13, 1.5, 0.8, 223, 105, 45],   'da_market', '2026-10-02', ['pechay','petsay','bok choy']),
  I('sitaw',     'Sitaw',                 'veg',    'kg',    100,  90, 1000, 0.90, [47, 2.8, 0.5, 43, 50, 18],     'da_market', '2026-10-02', ['sitaw','sitao','string beans']),
  I('kalabasa',  'Kalabasa',              'veg',    'kg',     55,  60, 1000, 0.80, [26, 1.0, 0.8, 426, 21, 9],     'contrib',   '2026-10-05', ['kalabasa','squash','pumpkin']),
  I('talong',    'Talong',                'veg',    'kg',     90,  85, 1000, 0.90, [25, 1.0, 0.2, 1, 9, 2],        'contrib',   '2026-10-05', ['talong','eggplant']),
  I('ampalaya',  'Ampalaya',              'veg',    'kg',    110, 100, 1000, 0.85, [17, 1.0, 0.4, 24, 19, 84],     'da_market', '2026-10-02', ['ampalaya','amplaya','bitter gourd']),
  I('okra',      'Okra',                  'veg',    'kg',     90,  90, 1000, 0.90, [33, 1.9, 0.6, 36, 82, 23],     'da_avg',    '2026-10-02', ['okra']),
  I('sayote',    'Sayote',                'veg',    'kg',     50,  45, 1000, 0.85, [19, 0.8, 0.3, 0, 17, 8],       'da_market', '2026-10-02', ['sayote','chayote']),
  I('repolyo',   'Repolyo',               'veg',    'kg',     85,  75, 1000, 0.85, [25, 1.3, 0.5, 5, 40, 36],      'da_market', '2026-10-02', ['repolyo','cabbage']),
  I('karot',     'Karot',                 'veg',    'kg',    110, 100, 1000, 0.90, [41, 0.9, 0.3, 835, 33, 6],     'da_avg',    '2026-10-02', ['karot','carrot','carrots']),
  I('patatas',   'Patatas',               'veg',    'kg',     95,  90, 1000, 0.85, [77, 2.0, 0.8, 0, 12, 20],      'da_market', '2026-10-02', ['patatas','potato','potatoes']),
  I('kamote',    'Kamote',                'veg',    'kg',     70,  70, 1000, 0.85, [86, 1.6, 0.6, 709, 30, 2.4],   'contrib',   '2026-10-05', ['kamote','sweet potato']),
  I('kamatis',   'Kamatis',               'veg',    'kg',    120,  85, 1000, 0.95, [18, 0.9, 0.3, 42, 10, 14],     'contrib',   '2026-10-05', ['kamatis','tomato','tomatoes']),
  I('sibuyas',   'Sibuyas',               'spice',  'kg',    160, 130, 1000, 0.90, [40, 1.1, 0.2, 0, 23, 7],       'da_market', '2026-10-02', ['sibuyas','onion','onions']),
  I('bawang',    'Bawang',                'spice',  'kg',    140, 140, 1000, 0.85, [149, 6.4, 1.7, 0, 181, 31],    'da_market', '2026-10-02', ['bawang','garlic']),
  I('luya',      'Luya',                  'spice',  'kg',    160, 150, 1000, 0.85, [80, 1.8, 0.6, 0, 16, 5],       'da_avg',    '2026-10-02', ['luya','ginger']),
  I('gata',      'Gata (200 ml pack)',    'pantry', 'pack',   32,  30,  200, 1.00, [230, 2.3, 1.6, 0, 16, 3],      'estimate',  '2026-09-28', ['gata','coconut milk','kakang gata']),
  I('sinigang',  'Sinigang mix (22 g)',   'pantry', 'pack',   12,  12,   22, 1.00, [350, 1, 1, 0, 50, 10],         'contrib',   '2026-10-04', ['sinigang mix','sinigang','sampalok']),
  I('mantika',   'Mantika',               'pantry', 'L',      95,  92,  920, 1.00, [884, 0, 0, 0, 0, 0],           'da_avg',    '2026-10-02', ['mantika','oil','cooking oil']),
  I('toyo',      'Toyo',                  'pantry', 'L',      45,  45, 1000, 1.00, [53, 8, 1.5, 0, 20, 0],         'estimate',  '2026-09-28', ['toyo','soy sauce']),
  I('suka',      'Suka',                  'pantry', 'L',      40,  40, 1000, 1.00, [18, 0, 0.2, 0, 6, 0],          'estimate',  '2026-09-28', ['suka','vinegar']),
  I('patis',     'Patis',                 'pantry', 'L',      55,  55, 1000, 1.00, [35, 5, 0.8, 0, 40, 0],         'estimate',  '2026-09-28', ['patis','fish sauce']),
];

/* Recipes: qty per serving. rice = grams of uncooked rice served with it.
   meal: b = breakfast, u = ulam (lunch or dinner). price = sample eatery price per serving. */
const RECIPES = [
  { id:'sinangag',   name:'Sinangag at Itlog',             meal:'b', rice:80, items:{ itlog:1, bawang:5, mantika:5 } },
  { id:'pandesal',   name:'Pandesal at Itlog',             meal:'b', rice:0,  items:{ pandesal:3, itlog:1, mantika:3 } },
  { id:'lugaw',      name:'Lugaw na may Itlog',            meal:'b', rice:0,  items:{ bigas:50, itlog:1, luya:5, bawang:3, malunggay:0.1, patis:5 } },
  { id:'sardinasb',  name:'Sardinas na may Itlog',         meal:'b', rice:80, items:{ sardinas:0.25, itlog:0.5, sibuyas:10, kamatis:20, mantika:5 } },
  { id:'kamote',     name:'Nilagang Kamote at Itlog',      meal:'b', rice:0,  items:{ kamote:150, itlog:1 } },

  { id:'munggo',     name:'Ginisang Munggo',               meal:'u', rice:120, price:50, items:{ munggo:45, malunggay:0.12, kamatis:20, sibuyas:10, bawang:4, mantika:5 } },
  { id:'pinakbet',   name:'Pinakbet',                      meal:'u', rice:120, price:60, items:{ kalabasa:50, sitaw:30, talong:40, ampalaya:30, okra:25, kamatis:20, sibuyas:10, bawang:3, baboy:20, mantika:5 } },
  { id:'akangkong',  name:'Adobong Kangkong',              meal:'u', rice:120, price:40, items:{ kangkong:0.5, bawang:5, toyo:10, suka:10, mantika:5 } },
  { id:'gg',         name:'Pritong Galunggong',            meal:'u', rice:120, price:75, items:{ galunggong:120, mantika:10, kamatis:30, sibuyas:5 } },
  { id:'sinigang',   name:'Sinigang na Bangus',            meal:'u', rice:120, price:90, items:{ bangus:120, kangkong:0.25, sitaw:20, talong:30, kamatis:30, sibuyas:10, sinigang:0.15 } },
  { id:'tinola',     name:'Tinolang Manok',                meal:'u', rice:120, price:85, items:{ manok:120, sayote:80, malunggay:0.1, luya:5, sibuyas:10, bawang:3, patis:5 } },
  { id:'ginataan',   name:'Ginataang Kalabasa at Sitaw',   meal:'u', rice:120, price:55, items:{ kalabasa:100, sitaw:40, gata:0.25, sibuyas:10, bawang:3, mantika:3 } },
  { id:'torta',      name:'Tortang Talong',                meal:'u', rice:120, price:50, items:{ talong:100, itlog:1, mantika:10, bawang:2 } },
  { id:'amanok',     name:'Adobong Manok',                 meal:'u', rice:120, price:85, items:{ manok:130, toyo:15, suka:15, bawang:8, mantika:5 } },
  { id:'gsardinas',  name:'Ginisang Sardinas at Pechay',   meal:'u', rice:120, price:45, items:{ sardinas:0.4, pechay:60, sibuyas:10, bawang:3, kamatis:20, mantika:5 } },
  { id:'tokwa',      name:"Tokwa't Gulay",                 meal:'u', rice:120, price:50, items:{ tokwa:0.8, repolyo:60, sitaw:30, karot:20, bawang:3, sibuyas:10, toyo:10, mantika:10 } },
  { id:'atay',       name:'Adobong Atay at Patatas',       meal:'u', rice:120, price:60, items:{ atay:80, patatas:50, toyo:10, suka:10, bawang:5, sibuyas:10, mantika:5 } },
  { id:'paksiw',     name:'Paksiw na Galunggong',          meal:'u', rice:120, price:70, items:{ galunggong:120, suka:20, luya:5, bawang:3, talong:30, ampalaya:30 } },
  { id:'tilapia',    name:'Pritong Tilapia at Kamatis',    meal:'u', rice:120, price:75, items:{ tilapia:160, mantika:10, kamatis:40, sibuyas:10 } },
  { id:'ampalaya',   name:'Ginisang Ampalaya at Itlog',    meal:'u', rice:120, price:50, items:{ ampalaya:80, itlog:1, kamatis:20, sibuyas:10, bawang:3, mantika:5 } },
  { id:'menudo',     name:'Menudo',                        meal:'u', rice:120, price:95, items:{ baboy:90, patatas:50, karot:30, kamatis:40, sibuyas:10, bawang:4, toyo:5, mantika:5 } },
  { id:'nilaga',     name:'Nilagang Baka',                 meal:'u', rice:120, price:120, items:{ baka:120, repolyo:60, pechay:40, patatas:60, sibuyas:10, patis:5 } },
];

/* Simplified daily targets per adult, based on FNRI PDRI ranges. A child (4-12) counts as 0.6 of an adult.
   Replace with age- and sex-specific PDRI values in the next version. */
const NUTRIENTS = [
  { key:'kcal', label:'Energy',    unit:'kcal', target:2000, w:1.5 },
  { key:'prot', label:'Protein',   unit:'g',    target:60,   w:1.5 },
  { key:'fe',   label:'Iron',      unit:'mg',   target:18,   w:1 },
  { key:'vita', label:'Vitamin A', unit:'µg',   target:600,  w:1 },
  { key:'ca',   label:'Calcium',   unit:'mg',   target:750,  w:1 },
  { key:'vitc', label:'Vitamin C', unit:'mg',   target:70,   w:1 },
];
const CHILD_FACTOR = 0.6;

/* Ingredients that can stand in for each other (used for "cheaper substitute" suggestions). */
const SUB_GROUPS = [
  ['galunggong', 'bangus', 'tilapia'],
  ['kangkong', 'pechay', 'malunggay'],
  ['sitaw', 'okra'],
  ['repolyo', 'pechay'],
];

/* Example log entries shown on first open (marked as examples in the UI). */
const EXAMPLE_LOGS = [
  { text: '1 kilo bangus 240', daysAgo: 2 },
  { text: 'isang dosenang itlog 102', daysAgo: 1 },
  { text: '2 tali kangkong 40', daysAgo: 0 },
];
