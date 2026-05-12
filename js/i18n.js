/* =============================================================================
   Pixel Round — js/i18n.js
   All Rights Reserved.

   Multi-locale system.

   How to add a new locale:
     1. Add an entry to AVAILABLE_LOCALES with code (BCP-47), label, and
        the htmlLang attribute to set on <html lang>.
     2. Add a full translation block under TR[code] mirroring the keys
        present in 'en-US'.
     3. Done — the Settings select and the topbar lang-button auto-update
        from AVAILABLE_LOCALES.

   Architecture
     • AVAILABLE_LOCALES — declarative list of all supported locales.
     • TR                — keyed by locale code; each entry is a flat key
                           map plus a structured `info` tree (rendered to
                           the Info page).
     • t(key)            — returns the current-locale string for a key
                           (English fallback, then the key itself).
     • setLocale(code)   — switches, persists to localStorage, applies
                           DOM updates, refits page metadata, rebuilds
                           the Info page and Settings language picker.
     • applyLocale()     — walks data-i18n / data-i18n-title /
                           data-i18n-aria attributes and refreshes them.
     • initI18N()        — called from main.js on DOMContentLoaded.
   ============================================================================ */

(function(){

/* ---------- LOCALE REGISTRY ----------------------------------------------- */
const AVAILABLE_LOCALES = [
  { code: 'en-US', label: 'EN-US', name: 'English (US)',       htmlLang: 'en'    },
  { code: 'pt-BR', label: 'PT-BR', name: 'Português (Brasil)', htmlLang: 'pt-BR' },
];
const DEFAULT_LOCALE = 'en-US';
const STORAGE_KEY = 'pr_locale';

/* ---------- TRANSLATION TABLES -------------------------------------------- */
/* Each locale must mirror the keys in 'en-US'. Missing keys fall back to
   English; missing English keys return the literal key (so untranslated
   strings surface visibly during development). */
const TR = {
  'en-US': {
    /* ---- meta ---- */
    doc_title:   'Pixel Round',
    meta_desc:   'Pixel Round — a pixel-perfect generator for circles, ellipses, spheres and ellipsoids. Vanilla JS + Canvas + three.js. Works offline.',
    brand:       'Pixel Round',
    brand_aria:  'Pixel Round home',

    /* ---- topbar buttons ---- */
    lang_toggle_title: 'Change language',
    theme_title:       'Theme (T)',
    info_title:        'Info',
    settings_title:    'Settings',
    brand_title:       'Pixel Round',

    /* ---- mode / shape buttons ---- */
    mode_2d: '2D', mode_3d: '3D',
    shape_circle:    'Circle',
    shape_ellipse:   'Ellipse',
    shape_sphere:    'Sphere',
    shape_ellipsoid: 'Ellipsoid',

    /* ---- render pills ---- */
    render_filled: 'Filled',
    render_thin:   'Thin',
    render_thick:  'Thick',

    /* ---- algo pills ---- */
    algo_euclidean: 'Euclidean',
    algo_bresenham: 'Bresenham',
    algo_threshold: 'Threshold',

    /* ---- 3D style pills ---- */
    style_classic: 'Classic',
    style_smooth:  'Smooth',
    style_blocks:  'Blocks',

    /* ---- slider labels ---- */
    lbl_size:   'Size',
    lbl_width:  'Width',
    lbl_height: 'Height',
    lbl_depth:  'Depth',
    lbl_cut:    'Cut',

    /* ---- canvas corner button titles ---- */
    title_grid:     'Grid / Wireframe (G)',
    title_download: 'Download PNG (D)',
    title_center:   'Center guides (C)',
    title_overlay:  'Perfect overlay',
    title_zoom:     'Zoom top-left quadrant',
    title_infochip: 'Info chip (I)',

    /* ---- info chip labels ---- */
    chip_d:    'D',
    chip_r:    'R',
    chip_area: 'Area',
    chip_vol:  'Vol',
    chip_algo: 'Algo',
    chip_style:'Style',

    /* ---- cut-axis titles ---- */
    title_cut_x: 'Cut on X axis',
    title_cut_y: 'Cut on Y axis',

    /* ---- toasts ---- */
    sounds_on:  'Sounds on',
    sounds_off: 'Sounds off',
    grid_on:    'Grid on',
    grid_off:   'Grid off',
    center_on:  'center on',
    center_off: 'center off',
    edges_on:   'Edges on',
    edges_off:  'Edges off',
    reset:      'Reset',
    png_saved:  'PNG saved',
    lang_changed: 'Language: English (US)',

    /* ---- settings page ---- */
    settings_h2:          'Settings',
    settings_sub:         'Preferences persist in the browser.',
    setting_lang_lbl:     'Language',
    setting_lang_desc:    'Interface language',
    setting_theme_lbl:    'Theme',
    setting_theme_desc:   'Light or Dark',
    theme_light:          'Light',
    theme_dark:           'Dark',
    setting_sounds_lbl:   'Sounds',
    setting_sounds_desc:  'Sound feedback on interactions',
    setting_grid_lbl:     'Canvas grid',
    setting_grid_desc:    'Background helper lines (full canvas)',
    setting_center_lbl:   'Center guides',
    setting_center_desc:  'X/Y lines through the figure center',
    setting_reset_lbl:    'Reset',
    setting_reset_desc:   'Restore all settings to defaults',
    btn_reset:            'Reset',

    /* ---- info page (structured) ---- */
    info: {
      h2:  'Info',
      sub: 'A pixel-perfect circle, ellipse, sphere and ellipsoid generator.',
      sections: [
        { h3: '1. What it is', items: [
          { p: 'Browser-based generator for pixel-art circles &amp; ellipses (2D) and voxel spheres &amp; ellipsoids (3D). Integer dimensions in, PNG out. No installation, no account, no backend.' },
        ]},
        { h3: '2. Modes & shapes', items: [
          { h: '2D · Circle',    p: 'Single <b>Size</b>. Filled, thin or thick pixel circle.' },
          { h: '2D · Ellipse',   p: '<b>Width</b> + <b>Height</b> independent. Same render-mode set.' },
          { h: '3D · Sphere',    p: 'Single <b>Size</b>. Isometric voxel sphere. <b>Cut</b> on X or Y slices through.' },
          { h: '3D · Ellipsoid', p: '<b>Width</b> + <b>Height</b> + <b>Depth</b> independent. <b>Cut</b> slices on the chosen axis.' },
        ]},
        { h3: '3. Algorithms (2D only)', items: [
          { h: 'Euclidean', p: 'Distance test at pixel centres. Smoothest contour.' },
          { h: 'Bresenham', p: 'Classic integer midpoint algorithm. Stair-stepped pixel-art look.' },
          { h: 'Threshold', p: 'Corner-coverage test. Chunkier silhouette — any cell with a corner inside fills.' },
        ]},
        { h3: '4. Controls', items: [
          { h: 'Mode & shape',     p: 'The <b>2D / 3D</b> and <b>Circle / Ellipse</b> (or <b>Sphere / Ellipsoid</b> in 3D) toggles at the top are the ONLY way to switch.' },
          { h: 'Cut (3D)',         p: 'The <b>X / Y</b> toggle chooses the slicing axis. Switching axis restores the full figure automatically — only one axis cuts at a time. The slider max equals the chosen axis dimension.' },
          { h: 'Pinch & rotate',   p: 'Two fingers on the canvas zoom. In 3D, the midpoint of the fingers also rotates the figure. Mouse wheel zooms in 3D; click-drag rotates.' },
          { h: 'Grid & wireframe', p: 'The grid button in the canvas top-left toggles the cell grid in 2D and wireframe in 3D.' },
          { h: 'Language',         p: 'The <b>language</b> button at the right side of the topbar (and the picker in Settings) swaps the interface between supported locales. Choice is remembered across reloads.' },
          { h: 'Keyboard',         p: '<span class="key">G</span> Grid &nbsp; <span class="key">C</span> Center &nbsp; <span class="key">D</span> Download &nbsp; <span class="key">T</span> Theme &nbsp; <span class="key">I</span> Info chip &nbsp; <span class="key">M</span> 2D/3D &nbsp; <span class="key">S</span> Sound' },
        ]},
        { h3: '5. Technical', items: [
          { h: 'Stack',   p: 'Vanilla JavaScript + Canvas 2D + three.js. No framework, no build step.' },
          { h: 'Offline', p: 'PWA-installable. Once loaded, no network is required. Settings persist via <code>localStorage</code>.' },
          { h: 'Output',  p: 'PNG with the accent color on transparent background. 2D exports at ~2048px on the major axis.' },
        ]},
        { h3: '6. License & credits', items: [
          { h: 'License', p: 'All Rights Reserved on code &amp; design — see <code>LICENSE</code>. Third-party attributions in <code>NOTICE.md</code>.' },
          { h: 'Source',  p: 'Repository: <code>github.com/ViniSouza128/pixel-round</code>.' },
        ]},
      ],
    },
  },

  'pt-BR': {
    /* ---- meta ---- */
    doc_title:   'Pixel Round',
    meta_desc:   'Pixel Round — um gerador pixel-perfeito de círculos, elipses, esferas e elipsoides. JavaScript puro + Canvas + three.js. Funciona offline.',
    brand:       'Pixel Round',
    brand_aria:  'Página inicial do Pixel Round',

    /* ---- topbar buttons ---- */
    lang_toggle_title: 'Mudar idioma',
    theme_title:       'Tema (T)',
    info_title:        'Informações',
    settings_title:    'Configurações',
    brand_title:       'Pixel Round',

    /* ---- mode / shape buttons ---- */
    mode_2d: '2D', mode_3d: '3D',
    shape_circle:    'Círculo',
    shape_ellipse:   'Elipse',
    shape_sphere:    'Esfera',
    shape_ellipsoid: 'Elipsoide',

    /* ---- render pills ---- */
    render_filled: 'Preenchido',
    render_thin:   'Fino',
    render_thick:  'Grosso',

    /* ---- algo pills ---- */
    algo_euclidean: 'Euclidiano',
    algo_bresenham: 'Bresenham',
    algo_threshold: 'Limiar',

    /* ---- 3D style pills ---- */
    style_classic: 'Clássico',
    style_smooth:  'Suave',
    style_blocks:  'Blocos',

    /* ---- slider labels ---- */
    lbl_size:   'Tamanho',
    lbl_width:  'Largura',
    lbl_height: 'Altura',
    lbl_depth:  'Profundidade',
    lbl_cut:    'Corte',

    /* ---- canvas corner button titles ---- */
    title_grid:     'Grade / Wireframe (G)',
    title_download: 'Baixar PNG (D)',
    title_center:   'Guias de centro (C)',
    title_overlay:  'Sobreposição perfeita',
    title_zoom:     'Zoom no quadrante superior esquerdo',
    title_infochip: 'Chip de informações (I)',

    /* ---- info chip labels ---- */
    chip_d:    'D',
    chip_r:    'R',
    chip_area: 'Área',
    chip_vol:  'Vol',
    chip_algo: 'Algo',
    chip_style:'Estilo',

    /* ---- cut-axis titles ---- */
    title_cut_x: 'Cortar no eixo X',
    title_cut_y: 'Cortar no eixo Y',

    /* ---- toasts ---- */
    sounds_on:  'Sons ativados',
    sounds_off: 'Sons desativados',
    grid_on:    'Grade ativada',
    grid_off:   'Grade desativada',
    center_on:  'guias centrais ativadas',
    center_off: 'guias centrais desativadas',
    edges_on:   'Arestas ativadas',
    edges_off:  'Arestas desativadas',
    reset:      'Reiniciado',
    png_saved:  'PNG salvo',
    lang_changed: 'Idioma: Português (Brasil)',

    /* ---- settings page ---- */
    settings_h2:          'Configurações',
    settings_sub:         'As preferências ficam salvas no navegador.',
    setting_lang_lbl:     'Idioma',
    setting_lang_desc:    'Idioma da interface',
    setting_theme_lbl:    'Tema',
    setting_theme_desc:   'Claro ou Escuro',
    theme_light:          'Claro',
    theme_dark:           'Escuro',
    setting_sounds_lbl:   'Sons',
    setting_sounds_desc:  'Feedback sonoro nas interações',
    setting_grid_lbl:     'Grade do canvas',
    setting_grid_desc:    'Linhas auxiliares de fundo (canvas completo)',
    setting_center_lbl:   'Guias de centro',
    setting_center_desc:  'Linhas X/Y pelo centro da figura',
    setting_reset_lbl:    'Reiniciar',
    setting_reset_desc:   'Restaurar todas as configurações ao padrão',
    btn_reset:            'Reiniciar',

    /* ---- info page (structured) ---- */
    info: {
      h2:  'Informações',
      sub: 'Um gerador pixel-perfeito de círculos, elipses, esferas e elipsoides.',
      sections: [
        { h3: '1. O que é', items: [
          { p: 'Gerador no navegador para círculos e elipses em pixel-art (2D) e esferas e elipsoides em voxels (3D). Entram dimensões inteiras, sai um PNG. Sem instalação, sem cadastro e sem backend.' },
        ]},
        { h3: '2. Modos & formas', items: [
          { h: '2D · Círculo',   p: 'Apenas <b>Tamanho</b>. Círculo preenchido, fino ou grosso.' },
          { h: '2D · Elipse',    p: '<b>Largura</b> + <b>Altura</b> independentes. Mesmo conjunto de modos de renderização.' },
          { h: '3D · Esfera',    p: 'Apenas <b>Tamanho</b>. Esfera de voxels isométrica. <b>Corte</b> em X ou Y atravessa a figura.' },
          { h: '3D · Elipsoide', p: '<b>Largura</b> + <b>Altura</b> + <b>Profundidade</b> independentes. <b>Corte</b> no eixo escolhido.' },
        ]},
        { h3: '3. Algoritmos (somente 2D)', items: [
          { h: 'Euclidiano', p: 'Teste de distância no centro de cada pixel. Contorno mais suave.' },
          { h: 'Bresenham',  p: 'Algoritmo clássico do ponto médio com inteiros. Visual escadinha em pixel-art.' },
          { h: 'Limiar',     p: 'Teste de cobertura por canto. Silhueta mais "blocada" — toda célula com um canto dentro é preenchida.' },
        ]},
        { h3: '4. Controles', items: [
          { h: 'Modo & forma',      p: 'Os botões <b>2D / 3D</b> e <b>Círculo / Elipse</b> (ou <b>Esfera / Elipsoide</b> em 3D) no topo são a ÚNICA forma de alternar.' },
          { h: 'Corte (3D)',        p: 'O toggle <b>X / Y</b> escolhe o eixo do corte. Trocar o eixo restaura a figura automaticamente — apenas um eixo corta por vez. O máximo do slider equivale ao tamanho do eixo escolhido.' },
          { h: 'Pinçar & rotacionar', p: 'Dois dedos no canvas dão zoom. Em 3D, o ponto médio dos dedos também rotaciona a figura. A roda do mouse dá zoom em 3D; clique-arraste rotaciona.' },
          { h: 'Grade & wireframe', p: 'O botão de grade no canto superior esquerdo do canvas alterna a grade de células em 2D e o wireframe em 3D.' },
          { h: 'Idioma',            p: 'O botão de <b>idioma</b> à direita do topo (e o seletor em Configurações) troca o idioma da interface entre os disponíveis. A escolha fica salva entre as recargas.' },
          { h: 'Teclado',           p: '<span class="key">G</span> Grade &nbsp; <span class="key">C</span> Centro &nbsp; <span class="key">D</span> Baixar &nbsp; <span class="key">T</span> Tema &nbsp; <span class="key">I</span> Chip de info &nbsp; <span class="key">M</span> 2D/3D &nbsp; <span class="key">S</span> Som' },
        ]},
        { h3: '5. Técnico', items: [
          { h: 'Stack',   p: 'JavaScript puro + Canvas 2D + three.js. Sem framework, sem build.' },
          { h: 'Offline', p: 'Instalável como PWA. Depois do primeiro carregamento, não é preciso rede. Preferências persistem via <code>localStorage</code>.' },
          { h: 'Saída',   p: 'PNG com a cor de destaque sobre fundo transparente. Exportação 2D em ~2048px no eixo maior.' },
        ]},
        { h3: '6. Licença & créditos', items: [
          { h: 'Licença', p: 'Todos os direitos reservados sobre código e design — veja <code>LICENSE</code>. Atribuições de terceiros em <code>NOTICE.md</code>.' },
          { h: 'Código',  p: 'Repositório: <code>github.com/ViniSouza128/pixel-round</code>.' },
        ]},
      ],
    },
  },
};

/* ---------- STATE --------------------------------------------------------- */
let _locale = _detectLocale();

function _detectLocale(){
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && _isSupported(saved)) return saved;
  } catch(_) {}
  const nav = (navigator.language || navigator.userLanguage || '').toLowerCase();
  if (nav.startsWith('pt')) return 'pt-BR';
  return DEFAULT_LOCALE;
}

function _isSupported(code){
  return AVAILABLE_LOCALES.some(l => l.code === code);
}

function _meta(code){
  return AVAILABLE_LOCALES.find(l => l.code === code) || AVAILABLE_LOCALES[0];
}

/* ---------- PUBLIC API ---------------------------------------------------- */
window.t = function(key){
  const v = (TR[_locale] && TR[_locale][key]);
  if (v != null) return v;
  const fb = TR[DEFAULT_LOCALE] && TR[DEFAULT_LOCALE][key];
  return (fb != null) ? fb : key;
};

window.getLocale = function(){ return _locale; };
window.getAvailableLocales = function(){ return AVAILABLE_LOCALES.slice(); };

window.setLocale = function(code){
  if (!_isSupported(code)) code = DEFAULT_LOCALE;
  _locale = code;
  try { localStorage.setItem(STORAGE_KEY, code); } catch(_) {}
  _applyAll();
  if (typeof toast === 'function') toast(t('lang_changed'));
};

/* ---------- DOM APPLICATION ----------------------------------------------- */
function _applyAll(){
  _applyDocMeta();
  _applyShapeLabels();
  _applyAlgoStyleNames();
  _applyAttributes();
  _rebuildInfoPage();
  _rebuildLangPicker();
  _syncLangBtn();
  _refreshInfoChip();
  /* Re-run dynamic relabels (shape buttons pull from SHAPE_LABELS) */
  if (typeof syncShape === 'function') syncShape();
}

function _applyDocMeta(){
  const meta = _meta(_locale);
  document.title = t('doc_title');
  const html = document.documentElement;
  if (html) html.setAttribute('lang', meta.htmlLang);
  const desc = document.querySelector('meta[name="description"]');
  if (desc) desc.setAttribute('content', t('meta_desc'));
}

function _applyShapeLabels(){
  if (typeof window.SHAPE_LABELS === 'undefined') return;
  window.SHAPE_LABELS.circle['2d']  = t('shape_circle');
  window.SHAPE_LABELS.circle['3d']  = t('shape_sphere');
  window.SHAPE_LABELS.ellipse['2d'] = t('shape_ellipse');
  window.SHAPE_LABELS.ellipse['3d'] = t('shape_ellipsoid');
}

function _applyAlgoStyleNames(){
  if (typeof window.ALGO_FULL_NAME !== 'undefined'){
    window.ALGO_FULL_NAME.euclidean = t('algo_euclidean');
    window.ALGO_FULL_NAME.bresenham = t('algo_bresenham');
    window.ALGO_FULL_NAME.threshold = t('algo_threshold');
  }
  if (typeof window.STYLE3D_FULL_NAME !== 'undefined'){
    window.STYLE3D_FULL_NAME.classic = t('style_classic');
    window.STYLE3D_FULL_NAME.smooth  = t('style_smooth');
    window.STYLE3D_FULL_NAME.blocks  = t('style_blocks');
  }
}

function _applyAttributes(){
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const v = t(el.dataset.i18n);
    if (v != null) el.textContent = v;
  });
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    const v = t(el.dataset.i18nTitle);
    if (v != null){
      el.title = v;
      if (el.hasAttribute('aria-label')) el.setAttribute('aria-label', v);
    }
  });
  document.querySelectorAll('[data-i18n-aria]').forEach(el => {
    const v = t(el.dataset.i18nAria);
    if (v != null) el.setAttribute('aria-label', v);
  });
}

function _rebuildInfoPage(){
  const host = document.querySelector('.route[data-route="info"] .route-pad');
  if (!host) return;
  const info = (TR[_locale] && TR[_locale].info) || TR[DEFAULT_LOCALE].info;
  const parts = [];
  parts.push(`<h2 class="section-title">${info.h2}</h2>`);
  parts.push(`<p class="section-sub">${info.sub}</p>`);
  info.sections.forEach(sec => {
    parts.push(`<h3 class="ds-h2" style="margin-top:28px;">${sec.h3}</h3>`);
    parts.push('<div class="help-list">');
    sec.items.forEach(it => {
      parts.push('<div class="help-item">');
      if (it.h) parts.push(`<h3>${it.h}</h3>`);
      if (it.p) parts.push(`<p>${it.p}</p>`);
      parts.push('</div>');
    });
    parts.push('</div>');
  });
  host.innerHTML = parts.join('');
}

function _rebuildLangPicker(){
  const sel = document.querySelector('[data-pref="locale"]');
  if (!sel) return;
  sel.innerHTML = '';
  AVAILABLE_LOCALES.forEach(loc => {
    const opt = document.createElement('option');
    opt.value = loc.code;
    opt.textContent = loc.name;
    if (loc.code === _locale) opt.selected = true;
    sel.appendChild(opt);
  });
}

function _syncLangBtn(){
  const btn = document.querySelector('[data-act=lang]');
  if (!btn) return;
  const meta = _meta(_locale);
  const lbl = btn.querySelector('.lang-lbl');
  if (lbl) lbl.textContent = meta.label;
  btn.title = t('lang_toggle_title');
  btn.setAttribute('aria-label', t('lang_toggle_title'));
}

function _refreshInfoChip(){
  if (typeof updateInfoChip === 'function') updateInfoChip();
}

/* ---------- LANG BUTTON CLICK CYCLE --------------------------------------- */
/* Single-button cycle: cycles through AVAILABLE_LOCALES in order. */
window.cycleLocale = function(){
  const idx = AVAILABLE_LOCALES.findIndex(l => l.code === _locale);
  const next = AVAILABLE_LOCALES[(idx + 1) % AVAILABLE_LOCALES.length].code;
  setLocale(next);
};

/* ---------- INIT ---------------------------------------------------------- */
window.initI18N = function(){
  _applyAll();
};

})();
