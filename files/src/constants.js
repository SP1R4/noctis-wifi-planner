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
