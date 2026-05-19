// Static catalogs used by the AP/SW dropdowns and the color picker. Kept in
// their own module so app.js doesn't need to define ~180 lines of catalog data
// before getting to the actual app logic.

import {WALL_MATERIALS} from './geometry.js';

// AP models grouped by manufacturer. Rendered as <optgroup> in the model dropdown.
export const AP_MODEL_GROUPS=[
  {label:'Ubiquiti UniFi — WiFi 6', models:[
    'U6 Lite','U6 Pro','U6 Plus','U6 Mesh','U6 Long-Range',
    'U6 Enterprise','U6 Enterprise In-Wall','U6 Extender',
    'U6 IW','U6+',
  ]},
  {label:'Ubiquiti UniFi — WiFi 7', models:[
    'U7 Pro','U7 Pro Max','U7 Pro Wall','U7 Pro XG',
    'U7 Outdoor','U7 Lite','U7 IW','U7 In-Wall',
    'E7','U7 Enterprise','U7 Enterprise Campus',
  ]},
  {label:'Ubiquiti UniFi — WiFi 5 (legacy)', models:[
    'UAP-AC-Pro','UAP-AC-Lite','UAP-AC-Mesh','UAP-AC-Mesh-Pro',
    'UAP-AC-HD','UAP-AC-SHD','UAP-nanoHD',
    'UAP-IW-HD','UAP-IW','UAP-BeaconHD',
    'UAP-AC-M','UAP-AC-M-Pro',
  ]},
  {label:'MikroTik — WiFi 6 / ax', models:[
    'cAP ax','cAP-XL ax','hAP ax²','hAP ax³','hAP ax lite',
    'wAP ax','wAP ax R','Chateau ax',
  ]},
  {label:'MikroTik — WiFi 5 / ac', models:[
    'cAP ac','cAP ac XL','hAP ac','hAP ac²','hAP ac³','hAP ac lite',
    'wAP ac','wAP-60G','mAP','mAP lite','Audience',
    'RBwAPGR-5HacD2HnD','Chateau LTE6 ac',
  ]},
  {label:'Other', models:['Custom/Other']},
];
export const MODELS=AP_MODEL_GROUPS.flatMap(g=>g.models);

// Typical coverage radius in metres (conservative indoor estimate) for each model.
// Used as a sensible default when placing an AP and when the user changes model.
export const AP_RANGE_M={
  // UniFi WiFi 6
  'U6 Lite':               18,
  'U6 Pro':                25,
  'U6 Plus':               22,
  'U6 Mesh':               20,
  'U6 Long-Range':         40,
  'U6 Enterprise':         30,
  'U6 Enterprise In-Wall': 20,
  'U6 Extender':           15,
  'U6 IW':                 18,
  'U6+':                   20,
  // UniFi WiFi 7
  'U7 Pro':                28,
  'U7 Pro Max':            32,
  'U7 Pro Wall':           22,
  'U7 Pro XG':             28,
  'U7 Outdoor':            50,
  'U7 Lite':               20,
  'U7 IW':                 20,
  'U7 In-Wall':            20,
  'E7':                    32,
  'U7 Enterprise':         35,
  'U7 Enterprise Campus':  40,
  // UniFi WiFi 5
  'UAP-AC-Pro':            22,
  'UAP-AC-Lite':           16,
  'UAP-AC-Mesh':           18,
  'UAP-AC-Mesh-Pro':       30,
  'UAP-AC-HD':             30,
  'UAP-AC-SHD':            30,
  'UAP-nanoHD':            20,
  'UAP-IW-HD':             18,
  'UAP-IW':                15,
  'UAP-BeaconHD':          15,
  'UAP-AC-M':              22,
  'UAP-AC-M-Pro':          30,
  // MikroTik WiFi 6 / ax
  'cAP ax':                28,
  'cAP-XL ax':              35,
  'hAP ax²':               20,
  'hAP ax³':               30,
  'hAP ax lite':           15,
  'wAP ax':                45,
  'wAP ax R':              40,
  'Chateau ax':            25,
  // MikroTik WiFi 5 / ac
  'cAP ac':                22,
  'cAP ac XL':             28,
  'hAP ac':                18,
  'hAP ac²':               18,
  'hAP ac³':               22,
  'hAP ac lite':           14,
  'wAP ac':                35,
  'wAP-60G':               20,
  'mAP':                   12,
  'mAP lite':              10,
  'Audience':              22,
  'RBwAPGR-5HacD2HnD':     30,
  'Chateau LTE6 ac':       22,
  // Fallback
  'Custom/Other':          25,
};

// Switch / router models — grouped the same way as APs so the dropdown code
// can render either list identically.
export const SW_MODEL_GROUPS=[
  {label:'Ubiquiti UniFi — Switches', models:[
    'USW-Flex-Mini','USW-Flex','USW-Flex-Utility',
    'USW-Lite-8-PoE','USW-Lite-16-PoE',
    'USW-16','USW-16-PoE',
    'USW-24','USW-24-PoE',
    'USW-48','USW-48-PoE',
    'USW-Pro-8-PoE','USW-Pro-24','USW-Pro-24-PoE',
    'USW-Pro-48','USW-Pro-48-PoE',
    'USW-Pro-Max-16','USW-Pro-Max-24','USW-Pro-Max-48',
    'USW-Pro-Max-24-PoE','USW-Pro-Max-48-PoE',
    'USW-Aggregation','USW-Pro-Aggregation',
    'USW-EnterpriseXG-24','USW-Enterprise-24-PoE','USW-Enterprise-48-PoE','USW-Enterprise-8-PoE',
    'USW-Industrial','USW-Mission-Critical',
  ]},
  {label:'Ubiquiti UniFi — Routers & Gateways', models:[
    'UDM','UDM-Pro','UDM-SE','UDM-Pro-Max',
    'UXG-Lite','UXG-Pro','UXG-Max','UXG-Enterprise',
    'UCG-Fiber','UCG-Max','UCG-Ultra',
    'USG','USG-Pro-4','USG-3P',
    'Dream Router','Dream Router 7','Dream Machine',
    'Cloud Gateway Fiber','Cloud Gateway Max','Cloud Gateway Ultra',
  ]},
  {label:'MikroTik — Routers (Home / SMB)', models:[
    'hEX (RB750Gr4)','hEX S (RB760iGS)','hEX refresh',
    'hAP mini','hAP lite','hAP','hAP ac lite','hAP ac²','hAP ac³',
    'hAP ax lite','hAP ax²','hAP ax³',
    'RB4011iGS+RM','RB4011iGS+5HacQ2HnD-IN',
    'RB5009UG+S+IN','RB5009UPr+S+IN','RB5009UG+S+IN PoE',
    'RB3011UiAS-RM','RB2011UiAS-RM','RB2011iL-RM','RB2011iL-IN',
  ]},
  {label:'MikroTik — Routers (ISP / Enterprise)', models:[
    'L009UiGS-RM','L009UiGS-2HaxD-IN','L009UiGS-RM+Rack',
    'CCR1009-7G-1C-1S+','CCR1016-12G','CCR1036-12G-4S','CCR1036-8G-2S+',
    'CCR1072-1G-8S+',
    'CCR2004-1G-12S+2XS','CCR2004-16G-2S+','CCR2004-1G-2XS-PCIe',
    'CCR2116-12G-4S+','CCR2216-1G-12XS-2XQ',
  ]},
  {label:'MikroTik — Switches (Smart)', models:[
    'CSS326-24G-2S+RM','CSS610-8G-2S+IN','CSS318-16G-2S+IN','CSS318-16P-4S+RM',
  ]},
  {label:'MikroTik — Switches (CRS3xx — Managed)', models:[
    'CRS305-1G-4S+IN',
    'CRS309-1G-8S+IN','CRS309-1G-8S+IN Rackmount',
    'CRS310-1G-5S-4S+IN','CRS310-1G-5S-4S+OUT','CRS310-8G+2S+IN',
    'CRS312-4C+8XG-RM',
    'CRS317-1G-16S+RM',
    'CRS318-1Fi-15Fr-2S','CRS318-16P-2S+OUT',
    'CRS326-24G-2S+RM','CRS326-24G-2S+IN','CRS326-4C+20G+2Q+RM','CRS326-24S+2Q+RM',
    'CRS328-24P-4S+RM','CRS328-4C-20S-4S+RM',
    'CRS354-48G-4S+2Q+RM','CRS354-48P-4S+2Q+RM',
  ]},
  {label:'MikroTik — Switches (CRS5xx — High End)', models:[
    'CRS504-4XQ-IN','CRS510-8XS-2XQ-IN','CRS518-16XS-2XQ-RM','CRS520-4XS-16XQ-RM',
  ]},
  {label:'Other', models:['Custom/Other']},
];
export const SW_MODELS=SW_MODEL_GROUPS.flatMap(g=>g.models);

export const WALL_MATERIAL_KEYS=Object.keys(WALL_MATERIALS);

// AP antenna patterns. `arc` is the half-angle in degrees the AP radiates
// through; `omni` covers the full 360°. `lift` is how much the centre of
// the coverage shape shifts forward (for ceiling-down vs wall-mount).
export const AP_PATTERNS={
  omni:       {label:'Omni (default)',       arc:180},
  ceiling:    {label:'Ceiling-mount (down)', arc:180},
  'wall':     {label:'Wall-mount',           arc:75},
  'sector-90':{label:'Sector 90°',           arc:45},
  'sector-60':{label:'Sector 60°',           arc:30},
  'sector-30':{label:'Sector 30°',           arc:15},
};
export const AP_PATTERN_KEYS=Object.keys(AP_PATTERNS);

// Typical PoE draw in watts at full load. Used by the PoE-budget calculator.
// Conservative estimates from vendor datasheets; the user can edit per switch.
export const AP_POE_W={
  // UniFi WiFi 6
  'U6 Lite':12,'U6 Pro':17,'U6 Plus':14,'U6 Mesh':12,'U6 Long-Range':15,
  'U6 Enterprise':25,'U6 Enterprise In-Wall':22,'U6 Extender':10,
  'U6 IW':15,'U6+':12,
  // UniFi WiFi 7
  'U7 Pro':23,'U7 Pro Max':30,'U7 Pro Wall':18,'U7 Pro XG':25,
  'U7 Outdoor':22,'U7 Lite':13,'U7 IW':18,'U7 In-Wall':18,
  'E7':30,'U7 Enterprise':30,'U7 Enterprise Campus':35,
  // UniFi WiFi 5
  'UAP-AC-Pro':9,'UAP-AC-Lite':7,'UAP-AC-Mesh':9,'UAP-AC-Mesh-Pro':9,
  'UAP-AC-HD':17,'UAP-AC-SHD':25,'UAP-nanoHD':11,
  'UAP-IW-HD':17,'UAP-IW':9,'UAP-BeaconHD':9,
  'UAP-AC-M':8,'UAP-AC-M-Pro':9,
  // MikroTik
  'cAP ax':10,'cAP-XL ax':14,'hAP ax²':17,'hAP ax³':17,'hAP ax lite':10,
  'wAP ax':12,'wAP ax R':14,'Chateau ax':18,
  'cAP ac':6,'cAP ac XL':12,'hAP ac':12,'hAP ac²':14,'hAP ac³':14,'hAP ac lite':6,
  'wAP ac':5,'wAP-60G':12,'mAP':5,'mAP lite':2,'Audience':14,
  'RBwAPGR-5HacD2HnD':12,'Chateau LTE6 ac':18,
  'Custom/Other':15,
};

// Camera model catalog. Grouped like the AP catalog so the dropdown is consistent.
export const CAM_MODEL_GROUPS=[
  {label:'Ubiquiti UniFi Protect — G5 (current)', models:[
    'G5 Pro','G5 Bullet','G5 Dome','G5 Flex','G5 Turret Ultra',
    'G5 PTZ','G5 Dome Ultra','G5 Bullet Ultra',
  ]},
  {label:'Ubiquiti UniFi Protect — AI series', models:[
    'AI Pro','AI 360','AI DSLR','AI Theta','AI Bullet','AI LPR',
  ]},
  {label:'Ubiquiti UniFi Protect — G4 (legacy)', models:[
    'G4 Pro','G4 Bullet','G4 Dome','G4 PTZ','G4 Doorbell','G4 Doorbell Pro',
    'G4 Instant',
  ]},
  {label:'Ubiquiti UniFi Protect — G3 (very legacy)', models:[
    'G3 Pro','G3 Bullet','G3 Dome','G3 Flex','G3 Instant','G3 Micro',
  ]},
  {label:'Hikvision', models:[
    'DS-2CD2143G2-I (Dome 4MP)','DS-2CD2T46G2-2I (Bullet 4MP)',
    'DS-2CD2386G2-IU (8MP)','DS-2DE4225IW-DE (PTZ)','Generic Hikvision',
  ]},
  {label:'Dahua', models:[
    'IPC-HDW3441T-AS (Dome 4MP)','IPC-HFW3441T-AS (Bullet 4MP)',
    'IPC-HDBW5442H (5MP)','SD49225XA-HNR (PTZ)','Generic Dahua',
  ]},
  {label:'Reolink', models:[
    'RLC-823A','RLC-1224A','RLC-820A','RLC-410W','Argus 4 Pro','Trackmix',
  ]},
  {label:'Axis', models:[
    'M3045-V','M3046-V','M3057-PLVE','P3245-LV','Q6125-LE (PTZ)','Generic Axis',
  ]},
  {label:'Other', models:['Custom/Other']},
];
export const CAM_MODELS=CAM_MODEL_GROUPS.flatMap(g=>g.models);

// Typical specs per camera model. `fov` is horizontal field of view in
// degrees, `range` is effective night-vision range in metres (used as
// the default cone length on the map). Users can override either.
export const CAM_SPECS={
  // UniFi G5 — current gen
  'G5 Pro':           {fov:96, range:30,  res:'4K',   poeW:7},
  'G5 Bullet':        {fov:103,range:25,  res:'4MP',  poeW:5},
  'G5 Dome':          {fov:102,range:15,  res:'4MP',  poeW:5},
  'G5 Flex':          {fov:115,range:8,   res:'4MP',  poeW:5},
  'G5 Turret Ultra':  {fov:100,range:30,  res:'4MP',  poeW:5},
  'G5 PTZ':           {fov:75, range:80,  res:'4K',   poeW:30},
  'G5 Dome Ultra':    {fov:115,range:20,  res:'4MP',  poeW:6},
  'G5 Bullet Ultra':  {fov:115,range:30,  res:'4MP',  poeW:6},
  // UniFi AI
  'AI Pro':           {fov:110,range:35,  res:'4K',   poeW:13},
  'AI 360':           {fov:360,range:15,  res:'5MP',  poeW:9},
  'AI DSLR':          {fov:80, range:45,  res:'8MP',  poeW:13},
  'AI Theta':         {fov:360,range:20,  res:'5MP',  poeW:13},
  'AI Bullet':        {fov:110,range:35,  res:'4K',   poeW:13},
  'AI LPR':           {fov:50, range:30,  res:'4K',   poeW:13},
  // UniFi G4
  'G4 Pro':           {fov:70, range:30,  res:'4K',   poeW:8},
  'G4 Bullet':        {fov:100,range:25,  res:'4MP',  poeW:7},
  'G4 Dome':          {fov:100,range:15,  res:'4MP',  poeW:7},
  'G4 PTZ':           {fov:75, range:50,  res:'4K',   poeW:30},
  'G4 Doorbell':      {fov:160,range:10,  res:'2MP',  poeW:7},
  'G4 Doorbell Pro':  {fov:150,range:10,  res:'5MP',  poeW:7},
  'G4 Instant':       {fov:115,range:8,   res:'2MP',  poeW:0},
  // UniFi G3
  'G3 Pro':           {fov:85, range:25,  res:'1080p',poeW:8},
  'G3 Bullet':        {fov:84, range:25,  res:'1080p',poeW:8},
  'G3 Dome':          {fov:115,range:10,  res:'1080p',poeW:8},
  'G3 Flex':          {fov:115,range:8,   res:'1080p',poeW:5},
  'G3 Instant':       {fov:115,range:5,   res:'1080p',poeW:0},
  'G3 Micro':         {fov:115,range:5,   res:'1080p',poeW:0},
  // Hikvision
  'DS-2CD2143G2-I (Dome 4MP)':       {fov:103,range:30,res:'4MP',poeW:6},
  'DS-2CD2T46G2-2I (Bullet 4MP)':    {fov:103,range:60,res:'4MP',poeW:7},
  'DS-2CD2386G2-IU (8MP)':           {fov:102,range:30,res:'8MP',poeW:8},
  'DS-2DE4225IW-DE (PTZ)':           {fov:60, range:100,res:'2MP',poeW:18},
  'Generic Hikvision':               {fov:90, range:30,res:'4MP',poeW:8},
  // Dahua
  'IPC-HDW3441T-AS (Dome 4MP)':      {fov:101,range:30,res:'4MP',poeW:6},
  'IPC-HFW3441T-AS (Bullet 4MP)':    {fov:101,range:50,res:'4MP',poeW:7},
  'IPC-HDBW5442H (5MP)':             {fov:96, range:30,res:'5MP',poeW:7},
  'SD49225XA-HNR (PTZ)':             {fov:60, range:100,res:'2MP',poeW:30},
  'Generic Dahua':                   {fov:90, range:30,res:'4MP',poeW:8},
  // Reolink
  'RLC-823A':         {fov:105,range:55,  res:'4K',   poeW:12},
  'RLC-1224A':        {fov:97, range:30,  res:'12MP', poeW:10},
  'RLC-820A':         {fov:80, range:30,  res:'4K',   poeW:10},
  'RLC-410W':         {fov:80, range:30,  res:'5MP',  poeW:0},
  'Argus 4 Pro':      {fov:180,range:10,  res:'4K',   poeW:0},
  'Trackmix':         {fov:105,range:25,  res:'4K',   poeW:12},
  // Axis
  'M3045-V':          {fov:118,range:0,   res:'1080p',poeW:4},
  'M3046-V':          {fov:106,range:0,   res:'4MP',  poeW:4},
  'M3057-PLVE':       {fov:360,range:15,  res:'6MP',  poeW:8},
  'P3245-LV':         {fov:103,range:40,  res:'1080p',poeW:14},
  'Q6125-LE (PTZ)':   {fov:65, range:80,  res:'2MP',  poeW:30},
  'Generic Axis':     {fov:90, range:30,  res:'4MP',  poeW:8},
  // Fallback
  'Custom/Other':     {fov:90, range:30,  res:'4K',   poeW:8},
};

// Heatmap signal-strength thresholds (dBm). Anything stronger than -65 is
// "great", -65 to -75 is "good", -75 to -85 is "marginal", below is "weak".
export const HEATMAP_STOPS=[
  {dbm:-55, color:'#1e7d3c', label:'Excellent (-55 dBm)'},
  {dbm:-65, color:'#76b542', label:'Strong (-65 dBm)'},
  {dbm:-75, color:'#e7b40e', label:'Fair (-75 dBm)'},
  {dbm:-85, color:'#e07b22', label:'Weak (-85 dBm)'},
  {dbm:-95, color:'#c0382b', label:'Unusable (-95 dBm)'},
];

// Curated AP color palette — chosen to read clearly on the cream NOCTIS canvas.
// Empty value means "use default ink (#000)".
export const AP_COLORS=[
  {value:'',         label:'Default'},
  {value:'#c0382b',  label:'Red'},
  {value:'#d68910',  label:'Amber'},
  {value:'#1e7d3c',  label:'Green'},
  {value:'#1565c0',  label:'Blue'},
  {value:'#6a1b9a',  label:'Purple'},
  {value:'#00838f',  label:'Teal'},
  {value:'#6d4c41',  label:'Brown'},
];
