/* =============================================================================
   Pixel Round — js/i18n.js
   All Rights Reserved.

   ## Multi-locale system

   Nine locales ship in this file (≈5.0 billion native speakers combined):
     en-US  English (US)         — base / fallback for missing keys
     es-ES  Español              — ~500 M speakers
     pt-BR  Português (Brasil)   — ~210 M speakers
     fr-FR  Français             — ~300 M speakers
     de-DE  Deutsch              — ~130 M speakers
     zh-CN  简体中文              — ~1.1 B speakers
     ja-JP  日本語                — ~125 M speakers
     ru-RU  Русский              — ~150 M speakers
     ko-KR  한국어                — ~77 M speakers

   ## How to add another locale

     1. Append an entry to AVAILABLE_LOCALES with
          { code: 'xx-YY', label: 'XX-YY', name: 'native-name', htmlLang: 'xx' }
        — `code` is BCP-47, `label` is the short pill (≤5 chars), `name` is
        what shows in the Settings <select>, `htmlLang` lands on <html lang>.
     2. Add a full TR[code] block mirroring every key found in 'en-US' AND
        the structured `info` tree. Missing keys silently fall back to
        English so the app never breaks — but visible strings will look
        half-translated. Mirror EVERY key.
     3. Optionally extend `_detectLocale()` so a browser running with
        `navigator.language` starting with your language tag boots into
        your locale on first visit.

   That's it — the Settings <select>, the topbar pill and the keyboard
   cycle rebuild themselves from AVAILABLE_LOCALES on init.

   ## Architecture

     • AVAILABLE_LOCALES  — declarative registry of supported locales.
     • DEFAULT_LOCALE     — fallback when nothing else matches.
     • STORAGE_KEY        — localStorage key (`pr_locale`).
     • TR                 — { localeCode: { key → translation, …, info: {…} } }
     • t(key)             — current-locale string, falling back to English
                            then to the literal key (untranslated strings
                            stay visible during development).
     • setLocale(code)    — switches, persists, then re-applies every DOM
                            surface that reflects locale.
     • initI18N()         — called once on DOMContentLoaded.

   ## How translations reach the DOM

   Static text uses HTML attributes processed by _applyAttributes():
     data-i18n         → element.textContent
     data-i18n-title   → element.title (and aria-label when not overridden
                         by an explicit data-i18n-aria)
     data-i18n-aria    → element.aria-label

   Dynamic text comes from three canonical maps in state.js
   (SHAPE_LABELS, ALGO_FULL_NAME, STYLE3D_FULL_NAME). They live on
   `window` so this module can mutate them on locale switch. The shape
   buttons, info chip algo name and info chip style name all read from
   those maps every redraw / on every syncShape() call.

   The Info page is a structured tree (TR[locale].info) rendered to HTML
   by _rebuildInfoPage() on every setLocale() — keeps Info DOM in
   single-source-of-truth with the rest of the locale block.

   ## Notes for translators

     • Brand name "Pixel Round" is a proper noun — leave it untranslated.
     • Keyboard letters in the Info "Keyboard" line (G / C / D / T / M /
       I / S / Ctrl+Z / Ctrl+Y) stay as Latin letters: they match the
       physical key labels on a keyboard.
     • Chip labels D / R stay as math notation (they're "diameter" /
       "radius" abbreviations universally read as Latin in math).
     • Cut symbol ⟋ stays the same in every locale.
     • Native machine-translation was used as a starting point for ES /
       FR / DE / ZH / JA. Native-speaker proofreading is welcome —
       opening an issue with corrections is the easiest path.
   ============================================================================ */

(function(){

/* =============================================================================
   LOCALE REGISTRY
   Ordered for the topbar cycle: English first (default), then the most
   widely-spoken locales. Users with many locales typically use the
   Settings <select> for direct access rather than cycling — but with 9
   options the pill is still tolerable.
   ============================================================================ */
const AVAILABLE_LOCALES = [
  { code: 'en-US', label: 'EN-US', name: 'English (US)',       htmlLang: 'en'    },
  { code: 'es-ES', label: 'ES-ES', name: 'Español',            htmlLang: 'es'    },
  { code: 'pt-BR', label: 'PT-BR', name: 'Português (Brasil)', htmlLang: 'pt-BR' },
  { code: 'fr-FR', label: 'FR-FR', name: 'Français',           htmlLang: 'fr'    },
  { code: 'de-DE', label: 'DE-DE', name: 'Deutsch',            htmlLang: 'de'    },
  { code: 'zh-CN', label: 'ZH-CN', name: '简体中文',             htmlLang: 'zh-CN' },
  { code: 'ja-JP', label: 'JA-JP', name: '日本語',               htmlLang: 'ja'    },
  { code: 'ru-RU', label: 'RU-RU', name: 'Русский',             htmlLang: 'ru'    },
  { code: 'ko-KR', label: 'KO-KR', name: '한국어',               htmlLang: 'ko'    },
];
const DEFAULT_LOCALE = 'en-US';
const STORAGE_KEY    = 'pr_locale';

/* =============================================================================
   TRANSLATION TABLES
   Each locale MUST mirror every key in 'en-US'. Missing keys fall back to
   English; missing English keys return the literal key.
   ============================================================================ */
const TR = {

  /* ===========================================================================
     en-US — English (US) — base locale
     All other locales fall back to this one for missing keys.
     ========================================================================== */
  'en-US': {
    /* ---- meta (document head) ---- */
    doc_title:   'Pixel Round',
    meta_desc:   'Pixel Round — a pixel-perfect generator for circles, ellipses, spheres and ellipsoids. Vanilla JS + Canvas + three.js. Works offline.',
    brand:       'Pixel Round',
    brand_aria:  'Pixel Round home',

    /* ---- topbar button titles / aria labels ---- */
    lang_toggle_title: 'Change language',
    theme_title:       'Theme (T)',
    info_title:        'Info',
    settings_title:    'Settings',
    brand_title:       'Pixel Round',

    /* ---- mode / shape buttons (relabel on locale switch) ---- */
    mode_2d: '2D', mode_3d: '3D',
    shape_circle:    'Circle',
    shape_ellipse:   'Ellipse',
    shape_sphere:    'Sphere',
    shape_ellipsoid: 'Ellipsoid',

    /* ---- render pills (2D + 3D) ---- */
    render_filled: 'Filled',
    render_thin:   'Thin',
    render_thick:  'Thick',

    /* ---- algorithm pills (2D only) ---- */
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

    /* ---- canvas-corner button titles (also become aria-label) ---- */
    title_grid:     'Grid / Edges (G)',
    title_download: 'Download PNG (D)',
    title_center:   'Center guides (C)',
    title_overlay:  'Perfect overlay',
    title_zoom:     'Zoom top-left quadrant',
    title_infochip: 'Info chip (I)',

    /* ---- info chip row labels ---- */
    chip_d:    'D',
    chip_r:    'R',
    chip_area: 'Area',
    chip_vol:  'Vol',
    chip_algo: 'Algo',
    chip_style:'Style',

    /* ---- cut-axis button titles ---- */
    title_cut_x:    'Cut on X axis',
    title_cut_y:    'Cut on Y axis',
    title_cut_diag: 'Diagonal 45° cut (x+y plane)',

    /* ---- toasts (short feedback messages) ---- */
    undo:        'Undo',
    redo:        'Redo',
    sounds_on:   'Sounds on',
    sounds_off:  'Sounds off',
    grid_on:     'Grid on',
    grid_off:    'Grid off',
    center_on:   'Center on',
    center_off:  'Center off',
    edges_on:    'Edges on',
    edges_off:   'Edges off',
    reset:       'Reset',
    png_saved:   'PNG saved',
    lang_changed:'Language: English (US)',

    /* ---- Settings page strings ---- */
    settings_h2:         'Settings',
    settings_sub:        'Preferences persist in the browser.',
    setting_lang_lbl:    'Language',
    setting_lang_desc:   'Interface language',
    setting_theme_lbl:   'Theme',
    setting_theme_desc:  'Light or Dark',
    theme_light:         'Light',
    theme_dark:          'Dark',
    setting_sounds_lbl:  'Sounds',
    setting_sounds_desc: 'Sound feedback on interactions',
    setting_grid_lbl:    'Canvas grid',
    setting_grid_desc:   'Background helper lines (full canvas)',
    setting_center_lbl:  'Center guides',
    setting_center_desc: 'X/Y lines through the figure center',
    setting_reset_lbl:   'Reset',
    setting_reset_desc:  'Restore all settings to defaults',
    btn_reset:           'Reset',

    /* ---- Info page (structured, rendered to HTML by _rebuildInfoPage) ---- */
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
          { h: '3D · Sphere',    p: 'Single <b>Size</b>. Isometric voxel sphere. <b>Cut</b> on X, Y or ⟋ slices through.' },
          { h: '3D · Ellipsoid', p: '<b>Width</b> + <b>Height</b> + <b>Depth</b> independent. <b>Cut</b> slices on the chosen axis.' },
        ]},
        { h3: '3. Algorithms (2D only)', items: [
          { h: 'Euclidean', p: 'Distance test at pixel centres. Smoothest contour.' },
          { h: 'Bresenham', p: 'Classic integer midpoint algorithm. Stair-stepped pixel-art look.' },
          { h: 'Threshold', p: 'Corner-coverage test. Chunkier silhouette — any cell with a corner inside fills.' },
        ]},
        { h3: '4. Controls', items: [
          { h: 'Mode & shape',       p: 'The <b>2D / 3D</b> and <b>Circle / Ellipse</b> (or <b>Sphere / Ellipsoid</b> in 3D) toggles at the top are the ONLY way to switch.' },
          { h: 'Cut (3D)',           p: 'The <b>X / Y / ⟋</b> toggle chooses the slicing axis. <b>⟋</b> is a 45° diagonal through the x+y plane. Switching axis restores the full figure automatically — only one axis cuts at a time. The slider max scales to the chosen axis.' },
          { h: 'Pinch & rotate',     p: 'Two fingers on the canvas zoom. In 3D, the midpoint of the fingers also rotates the figure. Mouse wheel zooms in 3D; click-drag rotates.' },
          { h: 'Grid & edges',       p: 'The grid button in the canvas top-left toggles the cell grid in 2D and the per-voxel edge overlay in 3D (default ON).' },
          { h: 'Language',           p: 'The <b>language</b> button at the right side of the topbar (and the picker in Settings) swaps the interface between supported locales. Choice is remembered across reloads (the only persisted preference).' },
          { h: 'Undo / Redo',        p: 'Every figure-changing edit (mode, shape, render, algorithm, 3D style, sliders, cut, axis, reset) is recorded. <span class="key">Ctrl+Z</span> undoes; <span class="key">Ctrl+Y</span>, <span class="key">Ctrl+Shift+Z</span> and <span class="key">Ctrl+Alt+Z</span> all redo. Visual-only toggles (camera, edges, theme, sound, grid) are not tracked.' },
          { h: 'Keyboard',           p: '<span class="key">G</span> Grid &nbsp; <span class="key">C</span> Center &nbsp; <span class="key">D</span> Download &nbsp; <span class="key">T</span> Theme &nbsp; <span class="key">I</span> Info chip &nbsp; <span class="key">M</span> 2D/3D &nbsp; <span class="key">S</span> Sound &nbsp; <span class="key">Ctrl+Z</span> Undo &nbsp; <span class="key">Ctrl+Y</span> Redo' },
        ]},
        { h3: '5. Technical', items: [
          { h: 'Stack',   p: 'Vanilla JavaScript + Canvas 2D + three.js. No framework, no build step.' },
          { h: 'Offline', p: 'PWA-installable. Once loaded, no network is required. Only the locale persists in <code>localStorage</code>.' },
          { h: 'Output',  p: 'PNG with the accent color on transparent background. 2D exports at ~2048px on the major axis.' },
        ]},
        { h3: '6. License & credits', items: [
          { h: 'License', p: 'All Rights Reserved on code &amp; design — see <code>LICENSE</code>. Third-party attributions in <code>NOTICE.md</code>.' },
          { h: 'Source',  p: 'Repository: <code>github.com/ViniSouza128/pixel-round</code>.' },
        ]},
        { h3: '7. Documents', items: [
          { h: 'Math companion (PDF)',     p: 'In-depth derivation of equations, algorithms, voxelization, cuts and shading. <a href="docs_math/Pixel_Round_Math_en-US.pdf" target="_blank" rel="noopener">Open Pixel_Round_Math_en-US.pdf →</a>' },
          { h: 'Classroom lesson plan (PDF)', p: 'Four-period instructional sequence aligned to the Common Core State Standards. <a href="docs_aula/Plano_de_Aula_en-US.pdf" target="_blank" rel="noopener">Open Plano_de_Aula_en-US.pdf →</a>' },
          { h: 'All locales',              p: 'Both documents are available in 9 languages: <a href="docs_math/" target="_blank" rel="noopener">docs_math/</a> and <a href="docs_aula/" target="_blank" rel="noopener">docs_aula/</a>.' },
        ]},
      ],
    },
  },

  /* ===========================================================================
     es-ES — Español
     ========================================================================== */
  'es-ES': {
    doc_title:   'Pixel Round',
    meta_desc:   'Pixel Round — generador pixel-perfecto de círculos, elipses, esferas y elipsoides. JavaScript puro + Canvas + three.js. Funciona sin conexión.',
    brand:       'Pixel Round',
    brand_aria:  'Inicio de Pixel Round',

    lang_toggle_title: 'Cambiar idioma',
    theme_title:       'Tema (T)',
    info_title:        'Información',
    settings_title:    'Ajustes',
    brand_title:       'Pixel Round',

    mode_2d: '2D', mode_3d: '3D',
    shape_circle:    'Círculo',
    shape_ellipse:   'Elipse',
    shape_sphere:    'Esfera',
    shape_ellipsoid: 'Elipsoide',

    render_filled: 'Relleno',
    render_thin:   'Fino',
    render_thick:  'Grueso',

    algo_euclidean: 'Euclidiano',
    algo_bresenham: 'Bresenham',
    algo_threshold: 'Umbral',

    style_classic: 'Clásico',
    style_smooth:  'Suave',
    style_blocks:  'Bloques',

    lbl_size:   'Tamaño',
    lbl_width:  'Ancho',
    lbl_height: 'Alto',
    lbl_depth:  'Profundidad',
    lbl_cut:    'Corte',

    title_grid:     'Cuadrícula / Aristas (G)',
    title_download: 'Descargar PNG (D)',
    title_center:   'Guías centrales (C)',
    title_overlay:  'Superposición perfecta',
    title_zoom:     'Acercar al cuadrante superior izquierdo',
    title_infochip: 'Ficha de información (I)',

    chip_d:    'D',
    chip_r:    'R',
    chip_area: 'Área',
    chip_vol:  'Vol',
    chip_algo: 'Algo',
    chip_style:'Estilo',

    title_cut_x:    'Cortar en el eje X',
    title_cut_y:    'Cortar en el eje Y',
    title_cut_diag: 'Corte diagonal 45° (plano x+y)',

    undo:        'Deshacer',
    redo:        'Rehacer',
    sounds_on:   'Sonidos activados',
    sounds_off:  'Sonidos desactivados',
    grid_on:     'Cuadrícula activada',
    grid_off:    'Cuadrícula desactivada',
    center_on:   'Centro activado',
    center_off:  'Centro desactivado',
    edges_on:    'Aristas activadas',
    edges_off:   'Aristas desactivadas',
    reset:       'Restablecido',
    png_saved:   'PNG guardado',
    lang_changed:'Idioma: Español',

    settings_h2:         'Ajustes',
    settings_sub:        'Las preferencias se guardan en el navegador.',
    setting_lang_lbl:    'Idioma',
    setting_lang_desc:   'Idioma de la interfaz',
    setting_theme_lbl:   'Tema',
    setting_theme_desc:  'Claro u Oscuro',
    theme_light:         'Claro',
    theme_dark:          'Oscuro',
    setting_sounds_lbl:  'Sonidos',
    setting_sounds_desc: 'Retroalimentación sonora en las interacciones',
    setting_grid_lbl:    'Cuadrícula del lienzo',
    setting_grid_desc:   'Líneas auxiliares de fondo (lienzo completo)',
    setting_center_lbl:  'Guías centrales',
    setting_center_desc: 'Líneas X/Y por el centro de la figura',
    setting_reset_lbl:   'Restablecer',
    setting_reset_desc:  'Restaurar todos los ajustes a sus valores predeterminados',
    btn_reset:           'Restablecer',

    info: {
      h2:  'Información',
      sub: 'Un generador pixel-perfecto de círculos, elipses, esferas y elipsoides.',
      sections: [
        { h3: '1. Qué es', items: [
          { p: 'Generador en el navegador para círculos y elipses en pixel-art (2D) y esferas y elipsoides en voxels (3D). Entran dimensiones enteras, sale un PNG. Sin instalación, sin cuenta, sin backend.' },
        ]},
        { h3: '2. Modos y formas', items: [
          { h: '2D · Círculo',   p: 'Solo <b>Tamaño</b>. Círculo relleno, fino o grueso.' },
          { h: '2D · Elipse',    p: '<b>Ancho</b> + <b>Alto</b> independientes. Mismo conjunto de modos de renderizado.' },
          { h: '3D · Esfera',    p: 'Solo <b>Tamaño</b>. Esfera de voxels isométrica. <b>Corte</b> en X, Y o ⟋ atraviesa la figura.' },
          { h: '3D · Elipsoide', p: '<b>Ancho</b> + <b>Alto</b> + <b>Profundidad</b> independientes. <b>Corte</b> en el eje elegido.' },
        ]},
        { h3: '3. Algoritmos (solo 2D)', items: [
          { h: 'Euclidiano', p: 'Prueba de distancia en el centro de cada píxel. Contorno más suave.' },
          { h: 'Bresenham',  p: 'Algoritmo clásico del punto medio con enteros. Aspecto escalonado de pixel-art.' },
          { h: 'Umbral',     p: 'Prueba de cobertura por esquina. Silueta más "blocada" — toda celda con una esquina dentro se rellena.' },
        ]},
        { h3: '4. Controles', items: [
          { h: 'Modo y forma',          p: 'Los botones <b>2D / 3D</b> y <b>Círculo / Elipse</b> (o <b>Esfera / Elipsoide</b> en 3D) arriba son la ÚNICA forma de cambiar.' },
          { h: 'Corte (3D)',            p: 'El conmutador <b>X / Y / ⟋</b> elige el eje del corte. <b>⟋</b> es una diagonal de 45° en el plano x+y. Cambiar el eje restaura la figura automáticamente — solo un eje corta a la vez. El máximo del slider se ajusta al eje elegido.' },
          { h: 'Pellizcar y rotar',     p: 'Dos dedos en el lienzo dan zoom. En 3D, el punto medio de los dedos también rota la figura. La rueda del ratón da zoom en 3D; clic y arrastrar rota.' },
          { h: 'Cuadrícula y aristas',  p: 'El botón de cuadrícula en la esquina superior izquierda del lienzo alterna la cuadrícula de celdas en 2D y la superposición de aristas por voxel en 3D (predeterminado ACTIVADO).' },
          { h: 'Idioma',                p: 'El botón de <b>idioma</b> a la derecha del topbar (y el selector en Ajustes) cambia el idioma de la interfaz entre los disponibles. La elección se recuerda entre recargas (la única preferencia persistente).' },
          { h: 'Deshacer / Rehacer',    p: 'Cada edición que cambia la figura (modo, forma, renderizado, algoritmo, estilo 3D, sliders, corte, eje, restablecer) se registra. <span class="key">Ctrl+Z</span> deshace; <span class="key">Ctrl+Y</span>, <span class="key">Ctrl+Shift+Z</span> y <span class="key">Ctrl+Alt+Z</span> rehacen. Los toggles visuales (cámara, aristas, tema, sonido, cuadrícula) no se rastrean.' },
          { h: 'Teclado',               p: '<span class="key">G</span> Cuadrícula &nbsp; <span class="key">C</span> Centro &nbsp; <span class="key">D</span> Descargar &nbsp; <span class="key">T</span> Tema &nbsp; <span class="key">I</span> Ficha de info &nbsp; <span class="key">M</span> 2D/3D &nbsp; <span class="key">S</span> Sonido &nbsp; <span class="key">Ctrl+Z</span> Deshacer &nbsp; <span class="key">Ctrl+Y</span> Rehacer' },
        ]},
        { h3: '5. Técnico', items: [
          { h: 'Stack',         p: 'JavaScript puro + Canvas 2D + three.js. Sin framework, sin paso de build.' },
          { h: 'Sin conexión',  p: 'Instalable como PWA. Después del primer carga, no se necesita red. Solo el idioma persiste en <code>localStorage</code>.' },
          { h: 'Salida',        p: 'PNG con el color de acento sobre fondo transparente. Exportación 2D en ~2048px en el eje mayor.' },
        ]},
        { h3: '6. Licencia y créditos', items: [
          { h: 'Licencia',  p: 'Todos los derechos reservados sobre código y diseño — ver <code>LICENSE</code>. Atribuciones de terceros en <code>NOTICE.md</code>.' },
          { h: 'Código',    p: 'Repositorio: <code>github.com/ViniSouza128/pixel-round</code>.' },
        ]},
        { h3: '7. Documentos', items: [
          { h: 'Documento matemático (PDF)',  p: 'Desarrollo en profundidad de ecuaciones, algoritmos, voxelización, cortes y sombreado. <a href="docs_math/Pixel_Round_Math_es-ES.pdf" target="_blank" rel="noopener">Abrir Pixel_Round_Math_es-ES.pdf →</a>' },
          { h: 'Situación de aprendizaje (PDF)', p: 'Secuencia de cuatro sesiones alineada a la LOMLOE (2.º de Bachillerato). <a href="docs_aula/Plano_de_Aula_es-ES.pdf" target="_blank" rel="noopener">Abrir Plano_de_Aula_es-ES.pdf →</a>' },
          { h: 'Todos los idiomas',           p: 'Ambos documentos están disponibles en 9 idiomas: <a href="docs_math/" target="_blank" rel="noopener">docs_math/</a> y <a href="docs_aula/" target="_blank" rel="noopener">docs_aula/</a>.' },
        ]},
      ],
    },
  },

  /* ===========================================================================
     pt-BR — Português (Brasil)
     ========================================================================== */
  'pt-BR': {
    doc_title:   'Pixel Round',
    meta_desc:   'Pixel Round — gerador pixel-perfeito de círculos, elipses, esferas e elipsoides. JavaScript puro + Canvas + three.js. Funciona offline.',
    brand:       'Pixel Round',
    brand_aria:  'Página inicial do Pixel Round',

    lang_toggle_title: 'Mudar idioma',
    theme_title:       'Tema (T)',
    info_title:        'Informações',
    settings_title:    'Configurações',
    brand_title:       'Pixel Round',

    mode_2d: '2D', mode_3d: '3D',
    shape_circle:    'Círculo',
    shape_ellipse:   'Elipse',
    shape_sphere:    'Esfera',
    shape_ellipsoid: 'Elipsoide',

    render_filled: 'Preenchido',
    render_thin:   'Fino',
    render_thick:  'Grosso',

    algo_euclidean: 'Euclidiano',
    algo_bresenham: 'Bresenham',
    algo_threshold: 'Limiar',

    style_classic: 'Clássico',
    style_smooth:  'Suave',
    style_blocks:  'Blocos',

    lbl_size:   'Tamanho',
    lbl_width:  'Largura',
    lbl_height: 'Altura',
    lbl_depth:  'Profundidade',
    lbl_cut:    'Corte',

    title_grid:     'Grade / Arestas (G)',
    title_download: 'Baixar PNG (D)',
    title_center:   'Guias de centro (C)',
    title_overlay:  'Sobreposição perfeita',
    title_zoom:     'Zoom no quadrante superior esquerdo',
    title_infochip: 'Chip de informações (I)',

    chip_d:    'D',
    chip_r:    'R',
    chip_area: 'Área',
    chip_vol:  'Vol',
    chip_algo: 'Algo',
    chip_style:'Estilo',

    title_cut_x:    'Cortar no eixo X',
    title_cut_y:    'Cortar no eixo Y',
    title_cut_diag: 'Corte diagonal 45° (plano x+y)',

    undo:        'Desfazer',
    redo:        'Refazer',
    sounds_on:   'Sons ativados',
    sounds_off:  'Sons desativados',
    grid_on:     'Grade ativada',
    grid_off:    'Grade desativada',
    center_on:   'Centro ativado',
    center_off:  'Centro desativado',
    edges_on:    'Arestas ativadas',
    edges_off:   'Arestas desativadas',
    reset:       'Reiniciado',
    png_saved:   'PNG salvo',
    lang_changed:'Idioma: Português (Brasil)',

    settings_h2:         'Configurações',
    settings_sub:        'As preferências ficam salvas no navegador.',
    setting_lang_lbl:    'Idioma',
    setting_lang_desc:   'Idioma da interface',
    setting_theme_lbl:   'Tema',
    setting_theme_desc:  'Claro ou Escuro',
    theme_light:         'Claro',
    theme_dark:          'Escuro',
    setting_sounds_lbl:  'Sons',
    setting_sounds_desc: 'Feedback sonoro nas interações',
    setting_grid_lbl:    'Grade do canvas',
    setting_grid_desc:   'Linhas auxiliares de fundo (canvas completo)',
    setting_center_lbl:  'Guias de centro',
    setting_center_desc: 'Linhas X/Y pelo centro da figura',
    setting_reset_lbl:   'Reiniciar',
    setting_reset_desc:  'Restaurar todas as configurações ao padrão',
    btn_reset:           'Reiniciar',

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
          { h: '3D · Esfera',    p: 'Apenas <b>Tamanho</b>. Esfera de voxels isométrica. <b>Corte</b> em X, Y ou ⟋ atravessa a figura.' },
          { h: '3D · Elipsoide', p: '<b>Largura</b> + <b>Altura</b> + <b>Profundidade</b> independentes. <b>Corte</b> no eixo escolhido.' },
        ]},
        { h3: '3. Algoritmos (somente 2D)', items: [
          { h: 'Euclidiano', p: 'Teste de distância no centro de cada pixel. Contorno mais suave.' },
          { h: 'Bresenham',  p: 'Algoritmo clássico do ponto médio com inteiros. Visual escadinha em pixel-art.' },
          { h: 'Limiar',     p: 'Teste de cobertura por canto. Silhueta mais "blocada" — toda célula com um canto dentro é preenchida.' },
        ]},
        { h3: '4. Controles', items: [
          { h: 'Modo & forma',        p: 'Os botões <b>2D / 3D</b> e <b>Círculo / Elipse</b> (ou <b>Esfera / Elipsoide</b> em 3D) no topo são a ÚNICA forma de alternar.' },
          { h: 'Corte (3D)',          p: 'O toggle <b>X / Y / ⟋</b> escolhe o eixo do corte. <b>⟋</b> é uma diagonal 45° no plano x+y. Trocar o eixo restaura a figura automaticamente — apenas um eixo corta por vez. O máximo do slider se ajusta ao eixo escolhido.' },
          { h: 'Pinçar & rotacionar', p: 'Dois dedos no canvas dão zoom. Em 3D, o ponto médio dos dedos também rotaciona a figura. A roda do mouse dá zoom em 3D; clique-arraste rotaciona.' },
          { h: 'Grade & arestas',     p: 'O botão de grade no canto superior esquerdo do canvas alterna a grade de células em 2D e a sobreposição de arestas por voxel em 3D (padrão LIGADO).' },
          { h: 'Idioma',              p: 'O botão de <b>idioma</b> à direita do topo (e o seletor em Configurações) troca o idioma da interface entre os disponíveis. A escolha fica salva entre as recargas (a única preferência persistida).' },
          { h: 'Desfazer / Refazer',  p: 'Toda alteração da figura (modo, forma, renderização, algoritmo, estilo 3D, sliders, corte, eixo, reiniciar) é registrada. <span class="key">Ctrl+Z</span> desfaz; <span class="key">Ctrl+Y</span>, <span class="key">Ctrl+Shift+Z</span> e <span class="key">Ctrl+Alt+Z</span> refazem. Toggles visuais (câmera, arestas, tema, som, grade) não entram no histórico.' },
          { h: 'Teclado',             p: '<span class="key">G</span> Grade &nbsp; <span class="key">C</span> Centro &nbsp; <span class="key">D</span> Baixar &nbsp; <span class="key">T</span> Tema &nbsp; <span class="key">I</span> Chip de info &nbsp; <span class="key">M</span> 2D/3D &nbsp; <span class="key">S</span> Som &nbsp; <span class="key">Ctrl+Z</span> Desfazer &nbsp; <span class="key">Ctrl+Y</span> Refazer' },
        ]},
        { h3: '5. Técnico', items: [
          { h: 'Stack',   p: 'JavaScript puro + Canvas 2D + three.js. Sem framework, sem build.' },
          { h: 'Offline', p: 'Instalável como PWA. Depois do primeiro carregamento, não é preciso rede. Apenas o idioma fica salvo em <code>localStorage</code>.' },
          { h: 'Saída',   p: 'PNG com a cor de destaque sobre fundo transparente. Exportação 2D em ~2048px no eixo maior.' },
        ]},
        { h3: '6. Licença & créditos', items: [
          { h: 'Licença', p: 'Todos os direitos reservados sobre código e design — veja <code>LICENSE</code>. Atribuições de terceiros em <code>NOTICE.md</code>.' },
          { h: 'Código',  p: 'Repositório: <code>github.com/ViniSouza128/pixel-round</code>.' },
        ]},
        { h3: '7. Documentos', items: [
          { h: 'Documento matemático (PDF)', p: 'Desenvolvimento completo das equações, algoritmos, voxelização, cortes e sombreamento. <a href="docs_math/Pixel_Round_Math_pt-BR.pdf" target="_blank" rel="noopener">Abrir Pixel_Round_Math_pt-BR.pdf →</a>' },
          { h: 'Plano de aula (PDF)',        p: 'Sequência didática de quatro aulas para o 3.º ano do Ensino Médio, alinhada à BNCC. <a href="docs_aula/Plano_de_Aula_pt-BR.pdf" target="_blank" rel="noopener">Abrir Plano_de_Aula_pt-BR.pdf →</a>' },
          { h: 'Outros idiomas',             p: 'Ambos os documentos estão disponíveis em 9 idiomas: <a href="docs_math/" target="_blank" rel="noopener">docs_math/</a> e <a href="docs_aula/" target="_blank" rel="noopener">docs_aula/</a>.' },
        ]},
      ],
    },
  },

  /* ===========================================================================
     fr-FR — Français
     ========================================================================== */
  'fr-FR': {
    doc_title:   'Pixel Round',
    meta_desc:   'Pixel Round — générateur pixel-perfect de cercles, ellipses, sphères et ellipsoïdes. JavaScript pur + Canvas + three.js. Fonctionne hors ligne.',
    brand:       'Pixel Round',
    brand_aria:  'Accueil Pixel Round',

    lang_toggle_title: 'Changer la langue',
    theme_title:       'Thème (T)',
    info_title:        'Infos',
    settings_title:    'Réglages',
    brand_title:       'Pixel Round',

    mode_2d: '2D', mode_3d: '3D',
    shape_circle:    'Cercle',
    shape_ellipse:   'Ellipse',
    shape_sphere:    'Sphère',
    shape_ellipsoid: 'Ellipsoïde',

    render_filled: 'Plein',
    render_thin:   'Fin',
    render_thick:  'Épais',

    algo_euclidean: 'Euclidien',
    algo_bresenham: 'Bresenham',
    algo_threshold: 'Seuil',

    style_classic: 'Classique',
    style_smooth:  'Lisse',
    style_blocks:  'Blocs',

    lbl_size:   'Taille',
    lbl_width:  'Largeur',
    lbl_height: 'Hauteur',
    lbl_depth:  'Profondeur',
    lbl_cut:    'Coupe',

    title_grid:     'Grille / Arêtes (G)',
    title_download: 'Télécharger PNG (D)',
    title_center:   'Repères centraux (C)',
    title_overlay:  'Superposition parfaite',
    title_zoom:     'Zoom sur le quadrant supérieur gauche',
    title_infochip: "Bulle d'info (I)",

    chip_d:    'D',
    chip_r:    'R',
    chip_area: 'Aire',
    chip_vol:  'Vol',
    chip_algo: 'Algo',
    chip_style:'Style',

    title_cut_x:    "Couper selon l'axe X",
    title_cut_y:    "Couper selon l'axe Y",
    title_cut_diag: 'Coupe diagonale 45° (plan x+y)',

    undo:        'Annuler',
    redo:        'Rétablir',
    sounds_on:   'Sons activés',
    sounds_off:  'Sons désactivés',
    grid_on:     'Grille activée',
    grid_off:    'Grille désactivée',
    center_on:   'Centre activé',
    center_off:  'Centre désactivé',
    edges_on:    'Arêtes activées',
    edges_off:   'Arêtes désactivées',
    reset:       'Réinitialisé',
    png_saved:   'PNG enregistré',
    lang_changed:'Langue : Français',

    settings_h2:         'Réglages',
    settings_sub:        'Les préférences sont enregistrées dans le navigateur.',
    setting_lang_lbl:    'Langue',
    setting_lang_desc:   "Langue de l'interface",
    setting_theme_lbl:   'Thème',
    setting_theme_desc:  'Clair ou Sombre',
    theme_light:         'Clair',
    theme_dark:          'Sombre',
    setting_sounds_lbl:  'Sons',
    setting_sounds_desc: 'Retour sonore sur les interactions',
    setting_grid_lbl:    'Grille du canvas',
    setting_grid_desc:   "Lignes d'aide en arrière-plan (canvas complet)",
    setting_center_lbl:  'Repères centraux',
    setting_center_desc: 'Lignes X/Y par le centre de la figure',
    setting_reset_lbl:   'Réinitialiser',
    setting_reset_desc:  'Restaurer tous les réglages par défaut',
    btn_reset:           'Réinitialiser',

    info: {
      h2:  'Infos',
      sub: 'Un générateur pixel-perfect de cercles, ellipses, sphères et ellipsoïdes.',
      sections: [
        { h3: "1. Qu'est-ce que c'est", items: [
          { p: "Générateur dans le navigateur pour cercles et ellipses en pixel-art (2D) et sphères et ellipsoïdes en voxels (3D). Entrez des dimensions entières, sortez un PNG. Sans installation, sans compte, sans backend." },
        ]},
        { h3: '2. Modes & formes', items: [
          { h: '2D · Cercle',     p: '<b>Taille</b> uniquement. Cercle plein, fin ou épais.' },
          { h: '2D · Ellipse',    p: '<b>Largeur</b> + <b>Hauteur</b> indépendantes. Même jeu de modes de rendu.' },
          { h: '3D · Sphère',     p: '<b>Taille</b> uniquement. Sphère de voxels isométrique. <b>Coupe</b> en X, Y ou ⟋ traverse la figure.' },
          { h: '3D · Ellipsoïde', p: '<b>Largeur</b> + <b>Hauteur</b> + <b>Profondeur</b> indépendantes. <b>Coupe</b> sur l\'axe choisi.' },
        ]},
        { h3: '3. Algorithmes (2D uniquement)', items: [
          { h: 'Euclidien', p: 'Test de distance au centre de chaque pixel. Contour le plus lisse.' },
          { h: 'Bresenham', p: 'Algorithme classique du point milieu en entiers. Aspect "marches" du pixel-art.' },
          { h: 'Seuil',     p: 'Test de couverture par coin. Silhouette plus massive — toute case avec un coin à l\'intérieur est remplie.' },
        ]},
        { h3: '4. Contrôles', items: [
          { h: 'Mode & forme',       p: 'Les bascules <b>2D / 3D</b> et <b>Cercle / Ellipse</b> (ou <b>Sphère / Ellipsoïde</b> en 3D) en haut sont la SEULE façon de basculer.' },
          { h: 'Coupe (3D)',         p: 'La bascule <b>X / Y / ⟋</b> choisit l\'axe de coupe. <b>⟋</b> est une diagonale 45° dans le plan x+y. Changer d\'axe restaure la figure automatiquement — un seul axe coupe à la fois. Le max du slider s\'adapte à l\'axe choisi.' },
          { h: 'Pincer & tourner',   p: 'Deux doigts sur le canvas zooment. En 3D, le milieu des doigts fait aussi tourner la figure. La molette zoome en 3D ; clic-glisser tourne.' },
          { h: 'Grille & arêtes',    p: 'Le bouton grille en haut à gauche du canvas bascule la grille de cellules en 2D et la superposition d\'arêtes par voxel en 3D (par défaut ACTIVÉ).' },
          { h: 'Langue',             p: 'Le bouton <b>langue</b> à droite du topbar (et le sélecteur dans Réglages) change la langue de l\'interface parmi celles disponibles. Le choix est conservé entre les rechargements (la seule préférence persistante).' },
          { h: 'Annuler / Rétablir', p: 'Chaque édition modifiant la figure (mode, forme, rendu, algorithme, style 3D, sliders, coupe, axe, réinitialisation) est enregistrée. <span class="key">Ctrl+Z</span> annule ; <span class="key">Ctrl+Y</span>, <span class="key">Ctrl+Shift+Z</span> et <span class="key">Ctrl+Alt+Z</span> rétablissent. Les bascules purement visuelles (caméra, arêtes, thème, son, grille) ne sont pas suivies.' },
          { h: 'Clavier',            p: '<span class="key">G</span> Grille &nbsp; <span class="key">C</span> Centre &nbsp; <span class="key">D</span> Télécharger &nbsp; <span class="key">T</span> Thème &nbsp; <span class="key">I</span> Bulle d\'info &nbsp; <span class="key">M</span> 2D/3D &nbsp; <span class="key">S</span> Son &nbsp; <span class="key">Ctrl+Z</span> Annuler &nbsp; <span class="key">Ctrl+Y</span> Rétablir' },
        ]},
        { h3: '5. Technique', items: [
          { h: 'Stack',       p: 'JavaScript pur + Canvas 2D + three.js. Pas de framework, pas d\'étape de build.' },
          { h: 'Hors ligne',  p: 'Installable comme PWA. Une fois chargé, aucun réseau requis. Seule la langue persiste dans <code>localStorage</code>.' },
          { h: 'Sortie',      p: 'PNG avec la couleur d\'accent sur fond transparent. Export 2D à ~2048px sur l\'axe majeur.' },
        ]},
        { h3: '6. Licence & crédits', items: [
          { h: 'Licence', p: 'Tous droits réservés sur le code et le design — voir <code>LICENSE</code>. Attributions tierces dans <code>NOTICE.md</code>.' },
          { h: 'Source',  p: 'Dépôt : <code>github.com/ViniSouza128/pixel-round</code>.' },
        ]},
        { h3: '7. Documents', items: [
          { h: 'Document mathématique (PDF)', p: 'Développement complet des équations, des algorithmes, de la voxelisation, des coupes et de l\'ombrage. <a href="docs_math/Pixel_Round_Math_fr-FR.pdf" target="_blank" rel="noopener">Ouvrir Pixel_Round_Math_fr-FR.pdf →</a>' },
          { h: 'Séquence pédagogique (PDF)',  p: 'Séance de quatre cours pour la classe de Terminale, spécialité Mathématiques. <a href="docs_aula/Plano_de_Aula_fr-FR.pdf" target="_blank" rel="noopener">Ouvrir Plano_de_Aula_fr-FR.pdf →</a>' },
          { h: 'Autres langues',              p: 'Les deux documents sont disponibles en 9 langues : <a href="docs_math/" target="_blank" rel="noopener">docs_math/</a> et <a href="docs_aula/" target="_blank" rel="noopener">docs_aula/</a>.' },
        ]},
      ],
    },
  },

  /* ===========================================================================
     de-DE — Deutsch
     ========================================================================== */
  'de-DE': {
    doc_title:   'Pixel Round',
    meta_desc:   'Pixel Round — pixelgenauer Generator für Kreise, Ellipsen, Kugeln und Ellipsoide. Vanilla JS + Canvas + three.js. Funktioniert offline.',
    brand:       'Pixel Round',
    brand_aria:  'Pixel Round Startseite',

    lang_toggle_title: 'Sprache ändern',
    theme_title:       'Thema (T)',
    info_title:        'Info',
    settings_title:    'Einstellungen',
    brand_title:       'Pixel Round',

    mode_2d: '2D', mode_3d: '3D',
    shape_circle:    'Kreis',
    shape_ellipse:   'Ellipse',
    shape_sphere:    'Kugel',
    shape_ellipsoid: 'Ellipsoid',

    render_filled: 'Gefüllt',
    render_thin:   'Dünn',
    render_thick:  'Dick',

    algo_euclidean: 'Euklidisch',
    algo_bresenham: 'Bresenham',
    algo_threshold: 'Schwelle',

    style_classic: 'Klassisch',
    style_smooth:  'Glatt',
    style_blocks:  'Blöcke',

    lbl_size:   'Größe',
    lbl_width:  'Breite',
    lbl_height: 'Höhe',
    lbl_depth:  'Tiefe',
    lbl_cut:    'Schnitt',

    title_grid:     'Raster / Kanten (G)',
    title_download: 'PNG herunterladen (D)',
    title_center:   'Mittelachsen (C)',
    title_overlay:  'Perfekte Überlagerung',
    title_zoom:     'Zoom auf oberen linken Quadrant',
    title_infochip: 'Info-Chip (I)',

    chip_d:    'D',
    chip_r:    'R',
    chip_area: 'Fläche',
    chip_vol:  'Vol',
    chip_algo: 'Algo',
    chip_style:'Stil',

    title_cut_x:    'Schnitt auf X-Achse',
    title_cut_y:    'Schnitt auf Y-Achse',
    title_cut_diag: 'Diagonaler 45°-Schnitt (x+y-Ebene)',

    undo:        'Rückgängig',
    redo:        'Wiederherstellen',
    sounds_on:   'Töne an',
    sounds_off:  'Töne aus',
    grid_on:     'Raster an',
    grid_off:    'Raster aus',
    center_on:   'Mitte an',
    center_off:  'Mitte aus',
    edges_on:    'Kanten an',
    edges_off:   'Kanten aus',
    reset:       'Zurückgesetzt',
    png_saved:   'PNG gespeichert',
    lang_changed:'Sprache: Deutsch',

    settings_h2:         'Einstellungen',
    settings_sub:        'Einstellungen bleiben im Browser gespeichert.',
    setting_lang_lbl:    'Sprache',
    setting_lang_desc:   'Sprache der Oberfläche',
    setting_theme_lbl:   'Thema',
    setting_theme_desc:  'Hell oder Dunkel',
    theme_light:         'Hell',
    theme_dark:          'Dunkel',
    setting_sounds_lbl:  'Töne',
    setting_sounds_desc: 'Akustische Rückmeldung bei Interaktionen',
    setting_grid_lbl:    'Canvas-Raster',
    setting_grid_desc:   'Hilfslinien im Hintergrund (gesamter Canvas)',
    setting_center_lbl:  'Mittelachsen',
    setting_center_desc: 'X/Y-Linien durch die Figurmitte',
    setting_reset_lbl:   'Zurücksetzen',
    setting_reset_desc:  'Alle Einstellungen auf Standardwerte zurücksetzen',
    btn_reset:           'Zurücksetzen',

    info: {
      h2:  'Info',
      sub: 'Ein pixelgenauer Generator für Kreise, Ellipsen, Kugeln und Ellipsoide.',
      sections: [
        { h3: '1. Was es ist', items: [
          { p: 'Browserbasierter Generator für Pixel-Kreise und -Ellipsen (2D) sowie Voxel-Kugeln und -Ellipsoide (3D). Ganzzahlige Maße rein, PNG raus. Keine Installation, kein Konto, kein Backend.' },
        ]},
        { h3: '2. Modi & Formen', items: [
          { h: '2D · Kreis',     p: 'Nur <b>Größe</b>. Gefüllter, dünner oder dicker Pixelkreis.' },
          { h: '2D · Ellipse',   p: '<b>Breite</b> + <b>Höhe</b> unabhängig. Gleiche Render-Modi.' },
          { h: '3D · Kugel',     p: 'Nur <b>Größe</b>. Isometrische Voxelkugel. <b>Schnitt</b> auf X, Y oder ⟋ schneidet durch.' },
          { h: '3D · Ellipsoid', p: '<b>Breite</b> + <b>Höhe</b> + <b>Tiefe</b> unabhängig. <b>Schnitt</b> auf der gewählten Achse.' },
        ]},
        { h3: '3. Algorithmen (nur 2D)', items: [
          { h: 'Euklidisch', p: 'Distanztest am Pixelzentrum. Glattester Umriss.' },
          { h: 'Bresenham',  p: 'Klassischer Ganzzahl-Mittelpunkt-Algorithmus. Treppen-Look im Pixel-Art-Stil.' },
          { h: 'Schwelle',   p: 'Eckenüberdeckungstest. Klobigere Silhouette — jede Zelle mit einer Ecke innen wird gefüllt.' },
        ]},
        { h3: '4. Steuerung', items: [
          { h: 'Modus & Form',         p: 'Die Schalter <b>2D / 3D</b> und <b>Kreis / Ellipse</b> (oder <b>Kugel / Ellipsoid</b> in 3D) oben sind die EINZIGE Umschaltung.' },
          { h: 'Schnitt (3D)',         p: 'Der Schalter <b>X / Y / ⟋</b> wählt die Schnittachse. <b>⟋</b> ist ein 45°-Diagonalschnitt in der x+y-Ebene. Achsenwechsel stellt die Figur automatisch wieder her — nur eine Achse schneidet auf einmal. Das Slider-Maximum skaliert mit der gewählten Achse.' },
          { h: 'Pinch & rotieren',     p: 'Zwei Finger zoomen den Canvas. In 3D rotiert der Mittelpunkt der Finger auch die Figur. Mausrad zoomt in 3D; Klick-Ziehen rotiert.' },
          { h: 'Raster & Kanten',      p: 'Die Rastertaste oben links am Canvas schaltet das Zellenraster in 2D und die Kantenüberlagerung pro Voxel in 3D (Standard EIN).' },
          { h: 'Sprache',              p: 'Die <b>Sprach</b>-Taste rechts in der Topbar (und der Auswähler in den Einstellungen) wechselt die Oberflächensprache zwischen den verfügbaren Sprachen. Die Auswahl bleibt über Neuladen hinweg erhalten (die einzige persistente Einstellung).' },
          { h: 'Rückgängig / Wiederh.',p: 'Jede figurändernde Bearbeitung (Modus, Form, Rendering, Algorithmus, 3D-Stil, Slider, Schnitt, Achse, Zurücksetzen) wird aufgezeichnet. <span class="key">Strg+Z</span> macht rückgängig; <span class="key">Strg+Y</span>, <span class="key">Strg+Shift+Z</span> und <span class="key">Strg+Alt+Z</span> stellen wieder her. Rein visuelle Schalter (Kamera, Kanten, Thema, Ton, Raster) werden nicht erfasst.' },
          { h: 'Tastatur',             p: '<span class="key">G</span> Raster &nbsp; <span class="key">C</span> Mitte &nbsp; <span class="key">D</span> Download &nbsp; <span class="key">T</span> Thema &nbsp; <span class="key">I</span> Info-Chip &nbsp; <span class="key">M</span> 2D/3D &nbsp; <span class="key">S</span> Ton &nbsp; <span class="key">Strg+Z</span> Rückgängig &nbsp; <span class="key">Strg+Y</span> Wiederh.' },
        ]},
        { h3: '5. Technisch', items: [
          { h: 'Stack',    p: 'Vanilla JavaScript + Canvas 2D + three.js. Kein Framework, kein Build-Schritt.' },
          { h: 'Offline',  p: 'Als PWA installierbar. Nach dem Laden ist kein Netzwerk nötig. Nur die Sprache bleibt in <code>localStorage</code> gespeichert.' },
          { h: 'Ausgabe',  p: 'PNG mit Akzentfarbe auf transparentem Hintergrund. 2D-Export bei ~2048px auf der Hauptachse.' },
        ]},
        { h3: '6. Lizenz & Credits', items: [
          { h: 'Lizenz', p: 'Alle Rechte vorbehalten für Code und Design — siehe <code>LICENSE</code>. Drittanbieter-Hinweise in <code>NOTICE.md</code>.' },
          { h: 'Quelle', p: 'Repository: <code>github.com/ViniSouza128/pixel-round</code>.' },
        ]},
        { h3: '7. Dokumente', items: [
          { h: 'Mathematischer Begleittext (PDF)', p: 'Ausführliche Herleitung der Gleichungen, Algorithmen, Voxelisierung, Schnitte und Schattierung. <a href="docs_math/Pixel_Round_Math_de-DE.pdf" target="_blank" rel="noopener">Pixel_Round_Math_de-DE.pdf öffnen →</a>' },
          { h: 'Unterrichtssequenz (PDF)',         p: 'Vier Doppelstunden für die gymnasiale Oberstufe (Q2). <a href="docs_aula/Plano_de_Aula_de-DE.pdf" target="_blank" rel="noopener">Plano_de_Aula_de-DE.pdf öffnen →</a>' },
          { h: 'Alle Sprachen',                    p: 'Beide Dokumente liegen in 9 Sprachen vor: <a href="docs_math/" target="_blank" rel="noopener">docs_math/</a> und <a href="docs_aula/" target="_blank" rel="noopener">docs_aula/</a>.' },
        ]},
      ],
    },
  },

  /* ===========================================================================
     zh-CN — 简体中文
     ========================================================================== */
  'zh-CN': {
    doc_title:   'Pixel Round',
    meta_desc:   'Pixel Round — 像素完美的圆、椭圆、球体和椭球体生成器。原生 JS + Canvas + three.js。可离线使用。',
    brand:       'Pixel Round',
    brand_aria:  'Pixel Round 主页',

    lang_toggle_title: '切换语言',
    theme_title:       '主题 (T)',
    info_title:        '信息',
    settings_title:    '设置',
    brand_title:       'Pixel Round',

    mode_2d: '2D', mode_3d: '3D',
    shape_circle:    '圆',
    shape_ellipse:   '椭圆',
    shape_sphere:    '球体',
    shape_ellipsoid: '椭球体',

    render_filled: '填充',
    render_thin:   '细',
    render_thick:  '粗',

    algo_euclidean: '欧几里得',
    algo_bresenham: '布雷森汉姆',
    algo_threshold: '阈值',

    style_classic: '经典',
    style_smooth:  '平滑',
    style_blocks:  '方块',

    lbl_size:   '尺寸',
    lbl_width:  '宽度',
    lbl_height: '高度',
    lbl_depth:  '深度',
    lbl_cut:    '切割',

    title_grid:     '网格 / 边线 (G)',
    title_download: '下载 PNG (D)',
    title_center:   '中心参考线 (C)',
    title_overlay:  '完美叠加',
    title_zoom:     '放大左上象限',
    title_infochip: '信息卡 (I)',

    chip_d:    'D',
    chip_r:    'R',
    chip_area: '面积',
    chip_vol:  '体积',
    chip_algo: '算法',
    chip_style:'样式',

    title_cut_x:    '沿 X 轴切割',
    title_cut_y:    '沿 Y 轴切割',
    title_cut_diag: '对角 45° 切割（x+y 平面）',

    undo:        '撤销',
    redo:        '重做',
    sounds_on:   '声音已开',
    sounds_off:  '声音已关',
    grid_on:     '网格已开',
    grid_off:    '网格已关',
    center_on:   '中心已开',
    center_off:  '中心已关',
    edges_on:    '边线已开',
    edges_off:   '边线已关',
    reset:       '已重置',
    png_saved:   'PNG 已保存',
    lang_changed:'语言：简体中文',

    settings_h2:         '设置',
    settings_sub:        '偏好设置保存在浏览器中。',
    setting_lang_lbl:    '语言',
    setting_lang_desc:   '界面语言',
    setting_theme_lbl:   '主题',
    setting_theme_desc:  '浅色或深色',
    theme_light:         '浅色',
    theme_dark:          '深色',
    setting_sounds_lbl:  '声音',
    setting_sounds_desc: '交互的声音反馈',
    setting_grid_lbl:    '画布网格',
    setting_grid_desc:   '背景辅助线（整个画布）',
    setting_center_lbl:  '中心参考线',
    setting_center_desc: '穿过图形中心的 X/Y 线',
    setting_reset_lbl:   '重置',
    setting_reset_desc:  '将所有设置恢复为默认值',
    btn_reset:           '重置',

    info: {
      h2:  '信息',
      sub: '一个像素完美的圆、椭圆、球体和椭球体生成器。',
      sections: [
        { h3: '1. 这是什么', items: [
          { p: '基于浏览器的像素画圆和椭圆（2D）以及体素球体和椭球体（3D）生成器。输入整数尺寸，输出 PNG。无需安装、无需账号、无需后端。' },
        ]},
        { h3: '2. 模式与形状', items: [
          { h: '2D · 圆',     p: '仅 <b>尺寸</b>。填充、细或粗的像素圆。' },
          { h: '2D · 椭圆',   p: '<b>宽度</b> + <b>高度</b> 独立。相同的渲染模式集。' },
          { h: '3D · 球体',   p: '仅 <b>尺寸</b>。等距体素球体。<b>切割</b> X、Y 或 ⟋ 穿过图形。' },
          { h: '3D · 椭球体', p: '<b>宽度</b> + <b>高度</b> + <b>深度</b> 独立。<b>切割</b> 在所选轴上。' },
        ]},
        { h3: '3. 算法（仅 2D）', items: [
          { h: '欧几里得',     p: '在像素中心进行距离测试。轮廓最平滑。' },
          { h: '布雷森汉姆',   p: '经典的整数中点算法。像素画的阶梯外观。' },
          { h: '阈值',         p: '角点覆盖测试。轮廓更块状 — 任何内部有角点的单元格都会填充。' },
        ]},
        { h3: '4. 控制', items: [
          { h: '模式与形状',   p: '顶部的 <b>2D / 3D</b> 和 <b>圆 / 椭圆</b>（在 3D 中为 <b>球体 / 椭球体</b>）切换按钮是唯一的切换方式。' },
          { h: '切割（3D）',    p: '<b>X / Y / ⟋</b> 切换选择切割轴。<b>⟋</b> 是 x+y 平面上的 45° 对角线。切换轴会自动恢复完整图形 — 一次只有一个轴在切割。滑块最大值随所选轴缩放。' },
          { h: '捏合与旋转',   p: '在画布上用两根手指缩放。在 3D 中，手指的中点也会旋转图形。3D 中鼠标滚轮缩放；点击拖动旋转。' },
          { h: '网格与边线',   p: '画布左上角的网格按钮在 2D 中切换单元格网格，在 3D 中切换每个体素的边线叠加（默认开启）。' },
          { h: '语言',         p: '顶部栏右侧的<b>语言</b>按钮（以及设置中的选择器）在受支持的语言之间切换界面语言。选择在重新加载后保留（唯一持久化的偏好）。' },
          { h: '撤销 / 重做',   p: '每次改变图形的编辑（模式、形状、渲染、算法、3D 样式、滑块、切割、轴、重置）都会被记录。<span class="key">Ctrl+Z</span> 撤销；<span class="key">Ctrl+Y</span>、<span class="key">Ctrl+Shift+Z</span> 和 <span class="key">Ctrl+Alt+Z</span> 都重做。仅视觉的切换（相机、边线、主题、声音、网格）不会被跟踪。' },
          { h: '键盘',         p: '<span class="key">G</span> 网格 &nbsp; <span class="key">C</span> 中心 &nbsp; <span class="key">D</span> 下载 &nbsp; <span class="key">T</span> 主题 &nbsp; <span class="key">I</span> 信息卡 &nbsp; <span class="key">M</span> 2D/3D &nbsp; <span class="key">S</span> 声音 &nbsp; <span class="key">Ctrl+Z</span> 撤销 &nbsp; <span class="key">Ctrl+Y</span> 重做' },
        ]},
        { h3: '5. 技术', items: [
          { h: '技术栈', p: '原生 JavaScript + Canvas 2D + three.js。无框架、无构建步骤。' },
          { h: '离线',   p: '可作为 PWA 安装。加载后无需网络。仅语言保留在 <code>localStorage</code> 中。' },
          { h: '输出',   p: '透明背景上带强调色的 PNG。2D 在主轴上以 ~2048 像素导出。' },
        ]},
        { h3: '6. 许可与致谢', items: [
          { h: '许可', p: '代码和设计保留所有权利 — 见 <code>LICENSE</code>。第三方归属见 <code>NOTICE.md</code>。' },
          { h: '源码', p: '仓库：<code>github.com/ViniSouza128/pixel-round</code>。' },
        ]},
        { h3: '7. 文档', items: [
          { h: '数学技术文档 (PDF)', p: '完整推导方程、三种算法、体素化、切割与着色。<a href="docs_math/Pixel_Round_Math_zh-CN.pdf" target="_blank" rel="noopener">打开 Pixel_Round_Math_zh-CN.pdf →</a>' },
          { h: '教学设计 (PDF)',     p: '面向普通高中三年级（高三）数学的四课时教学设计。<a href="docs_aula/Plano_de_Aula_zh-CN.pdf" target="_blank" rel="noopener">打开 Plano_de_Aula_zh-CN.pdf →</a>' },
          { h: '其他语言版本',       p: '两份文档均提供 9 种语言：<a href="docs_math/" target="_blank" rel="noopener">docs_math/</a> 与 <a href="docs_aula/" target="_blank" rel="noopener">docs_aula/</a>。' },
        ]},
      ],
    },
  },

  /* ===========================================================================
     ja-JP — 日本語
     ========================================================================== */
  'ja-JP': {
    doc_title:   'Pixel Round',
    meta_desc:   'Pixel Round — 円・楕円・球・楕円体のピクセルパーフェクトジェネレーター。Vanilla JS + Canvas + three.js。オフラインで動作。',
    brand:       'Pixel Round',
    brand_aria:  'Pixel Round ホーム',

    lang_toggle_title: '言語を変更',
    theme_title:       'テーマ (T)',
    info_title:        '情報',
    settings_title:    '設定',
    brand_title:       'Pixel Round',

    mode_2d: '2D', mode_3d: '3D',
    shape_circle:    '円',
    shape_ellipse:   '楕円',
    shape_sphere:    '球',
    shape_ellipsoid: '楕円体',

    render_filled: '塗りつぶし',
    render_thin:   '細',
    render_thick:  '太',

    algo_euclidean: 'ユークリッド',
    algo_bresenham: 'ブレゼンハム',
    algo_threshold: 'しきい値',

    style_classic: 'クラシック',
    style_smooth:  'なめらか',
    style_blocks:  'ブロック',

    lbl_size:   'サイズ',
    lbl_width:  '幅',
    lbl_height: '高さ',
    lbl_depth:  '奥行き',
    lbl_cut:    'カット',

    title_grid:     'グリッド / エッジ (G)',
    title_download: 'PNG をダウンロード (D)',
    title_center:   '中心ガイド (C)',
    title_overlay:  '完全オーバーレイ',
    title_zoom:     '左上の象限にズーム',
    title_infochip: '情報チップ (I)',

    chip_d:    'D',
    chip_r:    'R',
    chip_area: '面積',
    chip_vol:  '体積',
    chip_algo: 'アルゴ',
    chip_style:'スタイル',

    title_cut_x:    'X 軸でカット',
    title_cut_y:    'Y 軸でカット',
    title_cut_diag: '45° 対角カット (x+y 平面)',

    undo:        '元に戻す',
    redo:        'やり直す',
    sounds_on:   'サウンド ON',
    sounds_off:  'サウンド OFF',
    grid_on:     'グリッド ON',
    grid_off:    'グリッド OFF',
    center_on:   '中心 ON',
    center_off:  '中心 OFF',
    edges_on:    'エッジ ON',
    edges_off:   'エッジ OFF',
    reset:       'リセット',
    png_saved:   'PNG を保存しました',
    lang_changed:'言語：日本語',

    settings_h2:         '設定',
    settings_sub:        '設定はブラウザに保存されます。',
    setting_lang_lbl:    '言語',
    setting_lang_desc:   'インターフェース言語',
    setting_theme_lbl:   'テーマ',
    setting_theme_desc:  'ライトまたはダーク',
    theme_light:         'ライト',
    theme_dark:          'ダーク',
    setting_sounds_lbl:  'サウンド',
    setting_sounds_desc: '操作のサウンドフィードバック',
    setting_grid_lbl:    'キャンバスグリッド',
    setting_grid_desc:   '背景の補助線（キャンバス全体）',
    setting_center_lbl:  '中心ガイド',
    setting_center_desc: '図形の中心を通る X/Y 線',
    setting_reset_lbl:   'リセット',
    setting_reset_desc:  'すべての設定を既定値に戻す',
    btn_reset:           'リセット',

    info: {
      h2:  '情報',
      sub: '円・楕円・球・楕円体のピクセルパーフェクトジェネレーター。',
      sections: [
        { h3: '1. これは何か', items: [
          { p: 'ピクセルアートの円と楕円（2D）、ボクセルの球と楕円体（3D）を生成するブラウザベースのツール。整数の寸法を入れると PNG が出ます。インストール不要、アカウント不要、バックエンド不要。' },
        ]},
        { h3: '2. モードと形状', items: [
          { h: '2D · 円',     p: '<b>サイズ</b> のみ。塗りつぶし・細・太のピクセル円。' },
          { h: '2D · 楕円',    p: '<b>幅</b> + <b>高さ</b> 独立。同じレンダリングモードセット。' },
          { h: '3D · 球',      p: '<b>サイズ</b> のみ。アイソメトリックなボクセル球。<b>カット</b> X、Y、⟋ で図形を切り抜き。' },
          { h: '3D · 楕円体',  p: '<b>幅</b> + <b>高さ</b> + <b>奥行き</b> 独立。<b>カット</b> は選択した軸で。' },
        ]},
        { h3: '3. アルゴリズム（2D のみ）', items: [
          { h: 'ユークリッド', p: 'ピクセル中心での距離テスト。最もなめらかな輪郭。' },
          { h: 'ブレゼンハム', p: '古典的な整数中点アルゴリズム。階段状のピクセルアート風。' },
          { h: 'しきい値',     p: 'コーナーカバレッジテスト。よりブロック状のシルエット — 内側にコーナーがあるセルはすべて塗りつぶし。' },
        ]},
        { h3: '4. 操作', items: [
          { h: 'モードと形状',          p: '上部の <b>2D / 3D</b> と <b>円 / 楕円</b>（3D では <b>球 / 楕円体</b>）トグルが切り替えの唯一の方法です。' },
          { h: 'カット (3D)',           p: '<b>X / Y / ⟋</b> トグルでカット軸を選択。<b>⟋</b> は x+y 平面の 45° 対角線。軸を切り替えると図形は自動的に復元されます — 一度に一つの軸だけがカットします。スライダーの最大値は選択した軸に合わせて調整されます。' },
          { h: 'ピンチと回転',          p: 'キャンバスで指 2 本でズーム。3D では指の中点が図形も回転させます。3D ではマウスホイールでズーム、クリックドラッグで回転。' },
          { h: 'グリッドとエッジ',      p: 'キャンバス左上のグリッドボタンは 2D ではセルグリッドを、3D ではボクセルごとのエッジオーバーレイ（既定 ON）を切り替えます。' },
          { h: '言語',                  p: 'トップバー右側の<b>言語</b>ボタン（および設定のピッカー）でサポートされている言語間でインターフェースを切り替えます。選択はリロード後も保持されます（唯一の永続化される設定）。' },
          { h: '元に戻す / やり直し',   p: '図形を変更するすべての編集（モード、形状、レンダリング、アルゴリズム、3D スタイル、スライダー、カット、軸、リセット）が記録されます。<span class="key">Ctrl+Z</span> で元に戻す。<span class="key">Ctrl+Y</span>、<span class="key">Ctrl+Shift+Z</span>、<span class="key">Ctrl+Alt+Z</span> すべてやり直しです。視覚のみのトグル（カメラ、エッジ、テーマ、サウンド、グリッド）は追跡されません。' },
          { h: 'キーボード',            p: '<span class="key">G</span> グリッド &nbsp; <span class="key">C</span> 中心 &nbsp; <span class="key">D</span> ダウンロード &nbsp; <span class="key">T</span> テーマ &nbsp; <span class="key">I</span> 情報チップ &nbsp; <span class="key">M</span> 2D/3D &nbsp; <span class="key">S</span> サウンド &nbsp; <span class="key">Ctrl+Z</span> 元に戻す &nbsp; <span class="key">Ctrl+Y</span> やり直し' },
        ]},
        { h3: '5. 技術', items: [
          { h: 'スタック',   p: 'Vanilla JavaScript + Canvas 2D + three.js。フレームワークなし、ビルドステップなし。' },
          { h: 'オフライン', p: 'PWA としてインストール可能。読み込み後はネットワーク不要。言語のみ <code>localStorage</code> に保持されます。' },
          { h: '出力',       p: '透明背景にアクセントカラーの PNG。2D は主軸で約 2048px でエクスポート。' },
        ]},
        { h3: '6. ライセンスとクレジット', items: [
          { h: 'ライセンス', p: 'コードとデザインの全著作権を保有 — <code>LICENSE</code> を参照。サードパーティの帰属は <code>NOTICE.md</code> に。' },
          { h: 'ソース',     p: 'リポジトリ：<code>github.com/ViniSouza128/pixel-round</code>。' },
        ]},
        { h3: '7. ドキュメント', items: [
          { h: '数学解説 (PDF)', p: '方程式・3アルゴリズム・ボクセル化・切断・シェーディングの詳細な導出。<a href="docs_math/Pixel_Round_Math_ja-JP.pdf" target="_blank" rel="noopener">Pixel_Round_Math_ja-JP.pdf を開く →</a>' },
          { h: '学習指導案 (PDF)', p: '高等学校第3学年数学のための4単位時間の学習指導案。<a href="docs_aula/Plano_de_Aula_ja-JP.pdf" target="_blank" rel="noopener">Plano_de_Aula_ja-JP.pdf を開く →</a>' },
          { h: '他の言語',       p: 'どちらの文書も9言語で利用可能：<a href="docs_math/" target="_blank" rel="noopener">docs_math/</a> と <a href="docs_aula/" target="_blank" rel="noopener">docs_aula/</a>。' },
        ]},
      ],
    },
  },

  /* ===========================================================================
     ru-RU — Русский
     ========================================================================== */
  'ru-RU': {
    doc_title:   'Pixel Round',
    meta_desc:   'Pixel Round — пиксельно-точный генератор кругов, эллипсов, сфер и эллипсоидов. Vanilla JS + Canvas + three.js. Работает офлайн.',
    brand:       'Pixel Round',
    brand_aria:  'Домашняя страница Pixel Round',

    lang_toggle_title: 'Сменить язык',
    theme_title:       'Тема (T)',
    info_title:        'Инфо',
    settings_title:    'Настройки',
    brand_title:       'Pixel Round',

    mode_2d: '2D', mode_3d: '3D',
    shape_circle:    'Круг',
    shape_ellipse:   'Эллипс',
    shape_sphere:    'Сфера',
    shape_ellipsoid: 'Эллипсоид',

    render_filled: 'Заливка',
    render_thin:   'Тонкий',
    render_thick:  'Толстый',

    algo_euclidean: 'Евклидов',
    algo_bresenham: 'Брезенхэм',
    algo_threshold: 'Порог',

    style_classic: 'Классик',
    style_smooth:  'Плавный',
    style_blocks:  'Блоки',

    lbl_size:   'Размер',
    lbl_width:  'Ширина',
    lbl_height: 'Высота',
    lbl_depth:  'Глубина',
    lbl_cut:    'Срез',

    title_grid:     'Сетка / Рёбра (G)',
    title_download: 'Скачать PNG (D)',
    title_center:   'Осевые линии (C)',
    title_overlay:  'Идеальный контур',
    title_zoom:     'Увеличить верхний левый квадрант',
    title_infochip: 'Инфо-чип (I)',

    chip_d:    'D',
    chip_r:    'R',
    chip_area: 'Площадь',
    chip_vol:  'Объём',
    chip_algo: 'Алго',
    chip_style:'Стиль',

    title_cut_x:    'Срез по оси X',
    title_cut_y:    'Срез по оси Y',
    title_cut_diag: 'Диагональный срез 45° (плоскость x+y)',

    undo:        'Отменить',
    redo:        'Повторить',
    sounds_on:   'Звук включён',
    sounds_off:  'Звук выключен',
    grid_on:     'Сетка включена',
    grid_off:    'Сетка выключена',
    center_on:   'Центр включён',
    center_off:  'Центр выключен',
    edges_on:    'Рёбра включены',
    edges_off:   'Рёбра выключены',
    reset:       'Сброс',
    png_saved:   'PNG сохранён',
    lang_changed:'Язык: Русский',

    settings_h2:         'Настройки',
    settings_sub:        'Настройки сохраняются в браузере.',
    setting_lang_lbl:    'Язык',
    setting_lang_desc:   'Язык интерфейса',
    setting_theme_lbl:   'Тема',
    setting_theme_desc:  'Светлая или тёмная',
    theme_light:         'Светлая',
    theme_dark:          'Тёмная',
    setting_sounds_lbl:  'Звуки',
    setting_sounds_desc: 'Звуковой отклик на действия',
    setting_grid_lbl:    'Сетка холста',
    setting_grid_desc:   'Вспомогательные линии фона (весь холст)',
    setting_center_lbl:  'Осевые линии',
    setting_center_desc: 'Линии X/Y через центр фигуры',
    setting_reset_lbl:   'Сброс',
    setting_reset_desc:  'Восстановить все настройки по умолчанию',
    btn_reset:           'Сбросить',

    info: {
      h2:  'Инфо',
      sub: 'Пиксельно-точный генератор кругов, эллипсов, сфер и эллипсоидов.',
      sections: [
        { h3: '1. Что это', items: [
          { p: 'Браузерный генератор кругов и эллипсов в пиксель-арте (2D) и воксельных сфер и эллипсоидов (3D). Вводите целые числа — получаете PNG. Без установки, без аккаунта, без бэкенда.' },
        ]},
        { h3: '2. Режимы и фигуры', items: [
          { h: '2D · Круг',      p: 'Только <b>Размер</b>. Залитый, тонкий или толстый пиксельный круг.' },
          { h: '2D · Эллипс',    p: '<b>Ширина</b> + <b>Высота</b> независимо. Те же режимы отрисовки.' },
          { h: '3D · Сфера',     p: 'Только <b>Размер</b>. Изометрическая воксельная сфера. <b>Срез</b> по X, Y или ⟋ разрезает фигуру.' },
          { h: '3D · Эллипсоид', p: '<b>Ширина</b> + <b>Высота</b> + <b>Глубина</b> независимо. <b>Срез</b> по выбранной оси.' },
        ]},
        { h3: '3. Алгоритмы (только 2D)', items: [
          { h: 'Евклидов',  p: 'Тест расстояния в центре пикселя. Самый плавный контур.' },
          { h: 'Брезенхэм', p: 'Классический алгоритм средней точки. Ступенчатый вид пиксель-арта.' },
          { h: 'Порог',     p: 'Тест покрытия угла. Более «блочный» силуэт — заполняется любая ячейка с углом внутри.' },
        ]},
        { h3: '4. Управление', items: [
          { h: 'Режим и фигура',       p: 'Кнопки <b>2D / 3D</b> и <b>Круг / Эллипс</b> (или <b>Сфера / Эллипсоид</b> в 3D) сверху — ЕДИНСТВЕННЫЙ способ переключения.' },
          { h: 'Срез (3D)',            p: 'Переключатель <b>X / Y / ⟋</b> выбирает ось среза. <b>⟋</b> — диагональ 45° в плоскости x+y. Смена оси автоматически восстанавливает фигуру — одновременно режет только одна ось. Максимум слайдера масштабируется под выбранную ось.' },
          { h: 'Щипок и поворот',      p: 'Два пальца на холсте — зум. В 3D средняя точка пальцев также вращает фигуру. Колёсико мыши — зум в 3D; перетаскивание — поворот.' },
          { h: 'Сетка и рёбра',        p: 'Кнопка сетки в верхнем левом углу холста переключает сетку ячеек в 2D и наложение рёбер на воксел в 3D (по умолчанию ВКЛ).' },
          { h: 'Язык',                 p: 'Кнопка <b>язык</b> справа в топбаре (и выбор в Настройках) переключает язык интерфейса между доступными. Выбор сохраняется между перезагрузками (единственная сохраняемая настройка).' },
          { h: 'Отменить / Повторить', p: 'Каждое изменение фигуры (режим, форма, отрисовка, алгоритм, стиль 3D, слайдеры, срез, ось, сброс) записывается. <span class="key">Ctrl+Z</span> отменяет; <span class="key">Ctrl+Y</span>, <span class="key">Ctrl+Shift+Z</span> и <span class="key">Ctrl+Alt+Z</span> — повтор. Визуальные переключатели (камера, рёбра, тема, звук, сетка) не отслеживаются.' },
          { h: 'Клавиши',              p: '<span class="key">G</span> Сетка &nbsp; <span class="key">C</span> Центр &nbsp; <span class="key">D</span> Скачать &nbsp; <span class="key">T</span> Тема &nbsp; <span class="key">I</span> Инфо-чип &nbsp; <span class="key">M</span> 2D/3D &nbsp; <span class="key">S</span> Звук &nbsp; <span class="key">Ctrl+Z</span> Отменить &nbsp; <span class="key">Ctrl+Y</span> Повторить' },
        ]},
        { h3: '5. Технологии', items: [
          { h: 'Стек',    p: 'Vanilla JavaScript + Canvas 2D + three.js. Без фреймворка, без сборки.' },
          { h: 'Офлайн',  p: 'Устанавливается как PWA. После первой загрузки сеть не нужна. Только язык сохраняется в <code>localStorage</code>.' },
          { h: 'Экспорт', p: 'PNG с акцентным цветом на прозрачном фоне. 2D экспортируется в ~2048px по главной оси.' },
        ]},
        { h3: '6. Лицензия и авторы', items: [
          { h: 'Лицензия', p: 'Все права на код и дизайн защищены — см. <code>LICENSE</code>. Сторонние упоминания в <code>NOTICE.md</code>.' },
          { h: 'Источник', p: 'Репозиторий: <code>github.com/ViniSouza128/pixel-round</code>.' },
        ]},
        { h3: '7. Документы', items: [
          { h: 'Математическое сопровождение (PDF)', p: 'Подробный вывод уравнений, трёх алгоритмов, вокселизации, сечений и затенения. <a href="docs_math/Pixel_Round_Math_ru-RU.pdf" target="_blank" rel="noopener">Открыть Pixel_Round_Math_ru-RU.pdf →</a>' },
          { h: 'Технологическая карта урока (PDF)',  p: 'Четыре урока для 11 класса средней общеобразовательной школы. <a href="docs_aula/Plano_de_Aula_ru-RU.pdf" target="_blank" rel="noopener">Открыть Plano_de_Aula_ru-RU.pdf →</a>' },
          { h: 'Другие языки',                       p: 'Оба документа доступны на 9 языках: <a href="docs_math/" target="_blank" rel="noopener">docs_math/</a> и <a href="docs_aula/" target="_blank" rel="noopener">docs_aula/</a>.' },
        ]},
      ],
    },
  },

  /* ===========================================================================
     ko-KR — 한국어
     ========================================================================== */
  'ko-KR': {
    doc_title:   'Pixel Round',
    meta_desc:   'Pixel Round — 원, 타원, 구, 타원체를 위한 픽셀 정밀 생성기. 바닐라 JS + Canvas + three.js. 오프라인 작동.',
    brand:       'Pixel Round',
    brand_aria:  'Pixel Round 홈',

    lang_toggle_title: '언어 변경',
    theme_title:       '테마 (T)',
    info_title:        '정보',
    settings_title:    '설정',
    brand_title:       'Pixel Round',

    mode_2d: '2D', mode_3d: '3D',
    shape_circle:    '원',
    shape_ellipse:   '타원',
    shape_sphere:    '구',
    shape_ellipsoid: '타원체',

    render_filled: '채우기',
    render_thin:   '얇게',
    render_thick:  '굵게',

    algo_euclidean: '유클리드',
    algo_bresenham: '브레젠험',
    algo_threshold: '임계값',

    style_classic: '클래식',
    style_smooth:  '부드럽게',
    style_blocks:  '블록',

    lbl_size:   '크기',
    lbl_width:  '너비',
    lbl_height: '높이',
    lbl_depth:  '깊이',
    lbl_cut:    '자르기',

    title_grid:     '격자 / 모서리 (G)',
    title_download: 'PNG 다운로드 (D)',
    title_center:   '중심 가이드 (C)',
    title_overlay:  '완벽한 오버레이',
    title_zoom:     '왼쪽 상단 사분면 확대',
    title_infochip: '정보 칩 (I)',

    chip_d:    'D',
    chip_r:    'R',
    chip_area: '넓이',
    chip_vol:  '부피',
    chip_algo: '알고',
    chip_style:'스타일',

    title_cut_x:    'X축으로 자르기',
    title_cut_y:    'Y축으로 자르기',
    title_cut_diag: '45° 대각선 자르기 (x+y 평면)',

    undo:        '실행 취소',
    redo:        '다시 실행',
    sounds_on:   '소리 켜짐',
    sounds_off:  '소리 꺼짐',
    grid_on:     '격자 켜짐',
    grid_off:    '격자 꺼짐',
    center_on:   '중심 켜짐',
    center_off:  '중심 꺼짐',
    edges_on:    '모서리 켜짐',
    edges_off:   '모서리 꺼짐',
    reset:       '초기화',
    png_saved:   'PNG 저장됨',
    lang_changed:'언어: 한국어',

    settings_h2:         '설정',
    settings_sub:        '설정은 브라우저에 저장됩니다.',
    setting_lang_lbl:    '언어',
    setting_lang_desc:   '인터페이스 언어',
    setting_theme_lbl:   '테마',
    setting_theme_desc:  '밝거나 어둡게',
    theme_light:         '밝게',
    theme_dark:          '어둡게',
    setting_sounds_lbl:  '소리',
    setting_sounds_desc: '인터랙션 소리 피드백',
    setting_grid_lbl:    '캔버스 격자',
    setting_grid_desc:   '배경 보조선 (전체 캔버스)',
    setting_center_lbl:  '중심 가이드',
    setting_center_desc: '도형 중심을 통과하는 X/Y 선',
    setting_reset_lbl:   '초기화',
    setting_reset_desc:  '모든 설정을 기본값으로 복원',
    btn_reset:           '초기화',

    info: {
      h2:  '정보',
      sub: '원, 타원, 구, 타원체를 위한 픽셀 정밀 생성기.',
      sections: [
        { h3: '1. 무엇인가', items: [
          { p: '픽셀 아트 원과 타원(2D), 복셀 구와 타원체(3D)를 생성하는 브라우저 기반 도구. 정수 치수를 입력하면 PNG가 출력됩니다. 설치 불필요, 계정 불필요, 백엔드 불필요.' },
        ]},
        { h3: '2. 모드 & 도형', items: [
          { h: '2D · 원',     p: '<b>크기</b>만 사용. 채우기, 얇게 또는 굵게 픽셀 원.' },
          { h: '2D · 타원',   p: '<b>너비</b> + <b>높이</b> 독립적. 동일한 렌더 모드 세트.' },
          { h: '3D · 구',     p: '<b>크기</b>만 사용. 등축 복셀 구. <b>자르기</b> X, Y 또는 ⟋로 도형을 절단.' },
          { h: '3D · 타원체', p: '<b>너비</b> + <b>높이</b> + <b>깊이</b> 독립적. 선택한 축으로 <b>자르기</b>.' },
        ]},
        { h3: '3. 알고리즘 (2D 전용)', items: [
          { h: '유클리드', p: '픽셀 중심에서 거리 테스트. 가장 부드러운 윤곽.' },
          { h: '브레젠험', p: '고전적인 정수 중점 알고리즘. 픽셀 아트 계단 형태.' },
          { h: '임계값',   p: '모서리 커버리지 테스트. 더 두꺼운 실루엣 — 내부에 모서리가 있는 모든 셀이 채워짐.' },
        ]},
        { h3: '4. 조작', items: [
          { h: '모드 & 도형',           p: '상단의 <b>2D / 3D</b> 및 <b>원 / 타원</b>(3D에서는 <b>구 / 타원체</b>) 토글이 유일한 전환 방법입니다.' },
          { h: '자르기 (3D)',           p: '<b>X / Y / ⟋</b> 토글로 자르기 축을 선택. <b>⟋</b>는 x+y 평면의 45° 대각선. 축 전환 시 도형이 자동으로 복원됩니다 — 한 번에 한 축만 자릅니다. 슬라이더 최대값이 선택된 축에 맞게 조정됩니다.' },
          { h: '핀치 & 회전',           p: '캔버스에 두 손가락으로 확대/축소. 3D에서는 손가락 중점이 도형을 회전시킵니다. 3D에서 마우스 휠로 줌, 클릭 드래그로 회전.' },
          { h: '격자 & 모서리',         p: '캔버스 왼쪽 상단의 격자 버튼은 2D에서는 셀 격자를, 3D에서는 복셀별 모서리 오버레이를 전환합니다(기본값 켜짐).' },
          { h: '언어',                  p: '상단 바 오른쪽의 <b>언어</b> 버튼(및 설정의 선택기)으로 지원되는 언어 간에 인터페이스를 전환합니다. 선택 사항은 새로 고침 후에도 유지됩니다(유일하게 지속되는 설정).' },
          { h: '실행 취소 / 다시 실행', p: '도형을 변경하는 모든 편집(모드, 도형, 렌더, 알고리즘, 3D 스타일, 슬라이더, 자르기, 축, 초기화)이 기록됩니다. <span class="key">Ctrl+Z</span>로 실행 취소; <span class="key">Ctrl+Y</span>, <span class="key">Ctrl+Shift+Z</span>, <span class="key">Ctrl+Alt+Z</span>로 다시 실행. 시각적 토글(카메라, 모서리, 테마, 소리, 격자)은 추적되지 않습니다.' },
          { h: '키보드',                p: '<span class="key">G</span> 격자 &nbsp; <span class="key">C</span> 중심 &nbsp; <span class="key">D</span> 다운로드 &nbsp; <span class="key">T</span> 테마 &nbsp; <span class="key">I</span> 정보 칩 &nbsp; <span class="key">M</span> 2D/3D &nbsp; <span class="key">S</span> 소리 &nbsp; <span class="key">Ctrl+Z</span> 실행 취소 &nbsp; <span class="key">Ctrl+Y</span> 다시 실행' },
        ]},
        { h3: '5. 기술', items: [
          { h: '스택',   p: '바닐라 JavaScript + Canvas 2D + three.js. 프레임워크 없음, 빌드 단계 없음.' },
          { h: '오프라인', p: 'PWA로 설치 가능. 로드 후 네트워크 불필요. 언어만 <code>localStorage</code>에 저장됩니다.' },
          { h: '출력',   p: '투명 배경에 강조 색상 PNG. 2D는 주축에서 ~2048px로 내보냅니다.' },
        ]},
        { h3: '6. 라이선스 & 크레딧', items: [
          { h: '라이선스', p: '코드 및 디자인의 모든 권리 보유 — <code>LICENSE</code> 참조. 타사 저작권은 <code>NOTICE.md</code>에 있습니다.' },
          { h: '소스',     p: '저장소: <code>github.com/ViniSouza128/pixel-round</code>.' },
        ]},
        { h3: '7. 문서', items: [
          { h: '수학 기술 문서 (PDF)', p: '방정식, 세 가지 알고리즘, 복셀화, 절단, 음영 처리의 상세한 유도. <a href="docs_math/Pixel_Round_Math_ko-KR.pdf" target="_blank" rel="noopener">Pixel_Round_Math_ko-KR.pdf 열기 →</a>' },
          { h: '수업 지도안 (PDF)',    p: '고등학교 3학년 수학과를 위한 4차시 수업 지도안. <a href="docs_aula/Plano_de_Aula_ko-KR.pdf" target="_blank" rel="noopener">Plano_de_Aula_ko-KR.pdf 열기 →</a>' },
          { h: '다른 언어',            p: '두 문서 모두 9개 언어로 제공됩니다: <a href="docs_math/" target="_blank" rel="noopener">docs_math/</a> 및 <a href="docs_aula/" target="_blank" rel="noopener">docs_aula/</a>.' },
        ]},
      ],
    },
  },

};

/* =============================================================================
   RUNTIME STATE
   ============================================================================ */
let _locale = _detectLocale();

/* Picks an initial locale:
   1. localStorage value if it's a supported code (user explicitly chose
      it on a previous visit).
   2. The first supported locale whose prefix matches navigator.language
      (e.g. browser set to fr-CA matches our fr-FR via the 'fr' prefix).
   3. DEFAULT_LOCALE as last resort. */
function _detectLocale(){
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && _isSupported(saved)) return saved;
  } catch(_) {}
  const nav = (navigator.language || navigator.userLanguage || '').toLowerCase();
  if (nav){
    for (const loc of AVAILABLE_LOCALES){
      const prefix = loc.code.toLowerCase().split('-')[0];
      if (nav.startsWith(prefix)) return loc.code;
    }
  }
  return DEFAULT_LOCALE;
}

function _isSupported(code){
  return AVAILABLE_LOCALES.some(l => l.code === code);
}

/* Looks up a locale entry by code; falls back to the first entry (English)
   if the code is unknown so callers can rely on a non-null return. */
function _meta(code){
  return AVAILABLE_LOCALES.find(l => l.code === code) || AVAILABLE_LOCALES[0];
}

/* =============================================================================
   PUBLIC API — exposed on `window` so other scripts (state.js, ui.js,
   canvas2d.js, main.js) can call them as bare identifiers.
   ============================================================================ */

/* t(key) → string for the current locale, with two fallback steps so
   the app never renders `undefined`:
     1. TR[currentLocale][key]
     2. TR['en-US'][key]
     3. the literal key (so an untranslated string is visible during
        development instead of silently disappearing). */
window.t = function(key){
  const v = (TR[_locale] && TR[_locale][key]);
  if (v != null) return v;
  const fb = TR[DEFAULT_LOCALE] && TR[DEFAULT_LOCALE][key];
  return (fb != null) ? fb : key;
};

window.getLocale          = function(){ return _locale; };
window.getAvailableLocales= function(){ return AVAILABLE_LOCALES.slice(); };

/* setLocale(code) — switches, persists, and re-applies every locale-
   sensitive DOM surface. Tolerates unknown codes (falls back to default). */
window.setLocale = function(code){
  if (!_isSupported(code)) code = DEFAULT_LOCALE;
  _locale = code;
  try { localStorage.setItem(STORAGE_KEY, code); } catch(_) {}
  _applyAll();
  if (typeof toast === 'function') toast(t('lang_changed'));
};

/* =============================================================================
   DOM APPLICATION
   _applyAll() is the single entry point that walks every surface that
   needs to reflect the current locale. It runs on:
     - initI18N()         (DOMContentLoaded)
     - setLocale(...)     (user picked a different language)
   ============================================================================ */
function _applyAll(){
  _applyDocMeta();         // <title>, <html lang>, meta description
  _applyShapeLabels();     // SHAPE_LABELS map (read by syncShape)
  _applyAlgoStyleNames();  // ALGO_FULL_NAME / STYLE3D_FULL_NAME (info chip)
  _applyAttributes();      // data-i18n / data-i18n-title / data-i18n-aria
  _rebuildInfoPage();      // Info route HTML tree
  _rebuildLangPicker();    // Settings <select>
  _syncLangBtn();          // Topbar pill label + title
  _refreshInfoChip();      // Re-renders the chip (Area/Algo vs Vol/Style)
  /* Re-run syncShape so the shape-buttons pick up the new SHAPE_LABELS. */
  if (typeof syncShape === 'function') syncShape();
}

/* Document-level metadata: page title, html lang, meta description. */
function _applyDocMeta(){
  const meta = _meta(_locale);
  document.title = t('doc_title');
  const html = document.documentElement;
  if (html) html.setAttribute('lang', meta.htmlLang);
  const desc = document.querySelector('meta[name="description"]');
  if (desc) desc.setAttribute('content', t('meta_desc'));
}

/* Mutates the canonical shape-label map in state.js. The shape buttons
   read this map via syncShape() on every redraw. Pre-condition: state.js
   has assigned the map to `window.SHAPE_LABELS` (see state.js comment for
   why a bare `const` would NOT be reachable here). */
function _applyShapeLabels(){
  if (typeof window.SHAPE_LABELS === 'undefined') return;
  window.SHAPE_LABELS.circle['2d']  = t('shape_circle');
  window.SHAPE_LABELS.circle['3d']  = t('shape_sphere');
  window.SHAPE_LABELS.ellipse['2d'] = t('shape_ellipse');
  window.SHAPE_LABELS.ellipse['3d'] = t('shape_ellipsoid');
}

/* Mutates the canonical algorithm and 3D-style label maps. Read by the
   info chip in canvas2d.js → updateInfoChip(). Like _applyShapeLabels,
   these MUST be on `window` to be reachable from this IIFE scope. */
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

/* Walks every element that opts into translation via the three i18n
   attributes:
     data-i18n         → textContent
     data-i18n-title   → title (mirrored to aria-label only when there's
                         no separate data-i18n-aria — otherwise the title
                         translation would clobber a dedicated aria one)
     data-i18n-aria    → aria-label */
function _applyAttributes(){
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const v = t(el.dataset.i18n);
    if (v != null) el.textContent = v;
  });
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    const v = t(el.dataset.i18nTitle);
    if (v != null){
      el.title = v;
      if (el.hasAttribute('aria-label') && !el.hasAttribute('data-i18n-aria')){
        el.setAttribute('aria-label', v);
      }
    }
  });
  document.querySelectorAll('[data-i18n-aria]').forEach(el => {
    const v = t(el.dataset.i18nAria);
    if (v != null) el.setAttribute('aria-label', v);
  });
}

/* Re-renders the Info route from TR[locale].info — a structured tree of
   sections, each containing items with optional sub-heading + paragraph.
   The HTML strings inside `p`/`h` fields are written by hand in the TR
   blocks above (they contain inline <b>/<code>/<span> markup), so this
   function trusts them and does NOT escape them. */
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

/* Settings page <select> — rebuilt from AVAILABLE_LOCALES every locale
   switch so new locales added at runtime would also appear. The current
   locale's <option> is marked `selected`. */
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

/* Topbar pill — shows the short label (e.g. "EN", "PT-BR", "ZH") and
   gets its title/aria-label refreshed for screen readers. */
function _syncLangBtn(){
  const btn = document.querySelector('[data-act=lang]');
  if (!btn) return;
  const meta = _meta(_locale);
  const lbl = btn.querySelector('.lang-lbl');
  if (lbl) lbl.textContent = meta.label;
  btn.title = t('lang_toggle_title');
  btn.setAttribute('aria-label', t('lang_toggle_title'));
}

/* Re-renders the info chip so the row labels (Area/Algo in 2D vs Vol/
   Style in 3D) match the new locale. The chip is owned by canvas2d.js
   which exposes updateInfoChip as a global. */
function _refreshInfoChip(){
  if (typeof updateInfoChip === 'function') updateInfoChip();
}

/* =============================================================================
   TOPBAR PILL CYCLE
   Click the lang pill to advance to the next locale in AVAILABLE_LOCALES.
   With 7 locales the cycle gets long — the Settings <select> is the
   preferred path for direct jumps. We keep the pill behaviour because
   most users actually use 1–2 locales and the cycle is fastest for them.
   ============================================================================ */
window.cycleLocale = function(){
  const idx = AVAILABLE_LOCALES.findIndex(l => l.code === _locale);
  const next = AVAILABLE_LOCALES[(idx + 1) % AVAILABLE_LOCALES.length].code;
  setLocale(next);
};

/* =============================================================================
   INIT — called once from main.js on DOMContentLoaded, AFTER
   applyLoadedPrefsToUI() so the initial UI rendered from HTML is already
   in place and only needs to be rewritten in the chosen locale.
   ============================================================================ */
window.initI18N = function(){
  _applyAll();
};

})();
