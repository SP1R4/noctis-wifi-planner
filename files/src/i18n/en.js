// English translation bundle. Strings are namespaced by feature, period-separated.
// Keep keys stable across releases; UI references them directly.

export const en={
  // Top bar
  'tb.new':                'New',
  'tb.upload':             'Upload Map',
  'tb.walls_svg':          'Walls SVG',
  'tb.save':               'Save',
  'tb.load':               'Load',
  'tb.share':              'Share',
  'tb.undo':               'Undo',
  'tb.redo':               'Redo',
  'tb.export_html':        'Export',
  'tb.export_pdf':         'PDF',
  'tb.settings':           'Settings',
  'tb.help':               'Help',
  'tb.present':            'Present',
  'tb.theme':              'Toggle theme',

  // Workspace
  'ws.coverage':           'Coverage',
  'ws.overlaps':           'Overlaps',
  'ws.heatmap':            'Heatmap',
  'ws.roaming':            'Roaming',
  'ws.grid':               'Grid',
  'ws.cables':             'Cables',
  'ws.auto_place':         'Auto-place',
  'ws.auto_channel':       'Auto channel',
  'ws.poe':                'PoE',
  'ws.bom':                'BoM CSV',
  'ws.cable_csv':          'Cable CSV',
  'ws.install_sheets':     'Install sheets',
  'ws.survey_import':      'Import survey',

  // Modes
  'mode.add':              'Add AP',
  'mode.select':           'Select',
  'mode.dead_zone':        'Dead Zone',
  'mode.switch':           'Switch / Router',
  'mode.camera':           'Camera',
  'mode.ruler':            'Ruler / Measure',
  'mode.wall':             'Wall (draw)',
  'mode.annotation':       'Annotation',

  // Hints
  'hint.add':              'Click map to place an AP',
  'hint.sel':              'Click an item to select · Shift+click to add to selection · drag to move',
  'hint.dz':               'Click to mark a dead zone',
  'hint.sw':               'Click to place a switch or router',
  'hint.cam':              'Click to place a camera · rotate via heading slider in the panel',
  'hint.ruler':            'Click two points to measure · Esc to clear',
  'hint.wall':             'Click two points to draw a wall · Shift for 45° · Esc to cancel',
  'hint.anno':             'Click to place a text label · drag to draw an arrow · Esc to cancel',

  // Heatmap modes
  'heat.mode_label':       'Heatmap mode',
  'heat.band_label':       'Band filter',
  'heat.band_all':         'All bands',
  'heat.band_24':          '2.4 GHz',
  'heat.band_5':           '5 GHz',
  'heat.band_6':           '6 GHz',

  // Settings panel
  'settings.title':                  'Project Settings',
  'settings.company':                'Company / Brand',
  'settings.tagline':                'Tagline',
  'settings.contact':                'Contact',
  'settings.meta_line':              'Cover meta line',
  'settings.report_title':           'Report title',
  'settings.locale':                 'Date locale',
  'settings.language':               'UI language',
  'settings.coverage_opacity':       'Coverage opacity',
  'settings.propagation_model':      'Propagation model',
  'settings.regulatory_region':      'Regulatory region',
  'settings.noise_floor':            'Noise floor (dBm)',
  'settings.floor_slab':             'Floor slab attenuation (dB)',
  'settings.show_floor_leakage':     'Include neighbouring floors in heatmap',
  'settings.heatmap_mode':           'Heatmap mode',
  'settings.heatmap_band':           'Band filter',
  'settings.show_roaming':           'Show roaming overlap layer',
  'settings.arch_scale':             'Architect scale preset',
  'settings.logo':                   'Brand logo (data URL or paste)',
  'settings.footer_line':            'Footer line',
  'settings.hint':                   'Saved with the project. Used in HTML/PDF exports and the top-bar brand label.',

  // PoE summary
  'poe.title':             'PoE budget summary',
  'poe.over_budget':       'OVER BUDGET',
  'poe.no_switches':       'No switches placed yet.',

  // Modals / actions
  'modal.cancel':          'Cancel',
  'modal.ok':              'OK',
  'modal.delete':          'Delete',
  'modal.keep':            'Keep',

  // Reports
  'report.coverage':       'Coverage',
  'report.floors':         'Floors',
  'report.aps':            'Access points',
  'report.cameras':        'Cameras',
  'report.switches':       'Switches',
  'report.dead_zones':     'Dead Zones',
  'report.bom_title':      'Bill of Materials',
  'report.cable_title':    'Cable schedule',
  'report.install_title':  'AP install sheet',

  // Toasts
  'toast.shared':          'Share link copied to clipboard',
  'toast.exported':        'Exported!',
  'toast.bom_exported':    'BoM exported',
  'toast.cable_exported':  'Cable schedule exported',
  'toast.installs_exported':'Install sheets opened',
  'toast.imported_samples':'Imported {n} survey samples',
};
