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

    /* ---- Info page (structured, rendered to HTML by _rebuildInfoPage) ----
       Six-section layout designed for scanning: Quick start → Documents
       (PDFs surfaced near the top so they're easy to find) → Shapes →
       Algorithms → Controls → About. Each card stays at ≤2 short sentences;
       deeper theory lives in the math/lesson PDFs to avoid duplicating
       long-form content across 9 locales. */
    info: {
      h2:  'Info',
      sub: 'A pixel-perfect generator for circles, ellipses, spheres and ellipsoids — built for pixel art, voxel art and the classroom.',
      sections: [
        { h3: '1. Quick start', items: [
          { p: '<b>1.</b> Pick a mode and shape at the top — <b>2D / 3D</b>, then <b>Circle / Ellipse</b> (or <b>Sphere / Ellipsoid</b> in 3D). <br><b>2.</b> Drag the sliders to set the integer dimensions. <br><b>3.</b> Hit the download icon on the canvas to save a transparent-background PNG.' },
        ]},
        { h3: '2. Documents', items: [
          { h: 'Math companion (PDF)',        p: 'Full derivation of equations, algorithms, voxelization, cuts and shading. <a href="docs_math/Pixel_Round_Math_en-US.pdf" target="_blank" rel="noopener">Open Pixel_Round_Math_en-US.pdf →</a>' },
          { h: 'Classroom lesson plan (PDF)', p: 'Four-period instructional sequence aligned to the Common Core State Standards. <a href="docs_aula/Plano_de_Aula_en-US.pdf" target="_blank" rel="noopener">Open Plano_de_Aula_en-US.pdf →</a>' },
          { h: 'All 9 locales',               p: 'Both documents are available in 9 languages — browse <a href="docs_math/" target="_blank" rel="noopener">docs_math/</a> and <a href="docs_aula/" target="_blank" rel="noopener">docs_aula/</a>.' },
        ]},
        { h3: '3. Shapes', items: [
          { h: '2D · Circle',    p: 'Uses <b>Size</b>. Filled, thin or thick contour.' },
          { h: '2D · Ellipse',   p: 'Uses <b>Width</b> + <b>Height</b>. Same render modes.' },
          { h: '3D · Sphere',    p: 'Uses <b>Size</b>. Add <b>Cut</b> on X, Y or ⟋ to slice through.' },
          { h: '3D · Ellipsoid', p: 'Uses <b>Width</b> + <b>Height</b> + <b>Depth</b>, plus <b>Cut</b> on the chosen axis.' },
        ]},
        { h3: '4. Algorithms (2D)', items: [
          { h: 'Euclidean', p: 'Distance test at pixel centres. Smoothest contour.' },
          { h: 'Bresenham', p: 'Integer midpoint algorithm. Stair-stepped pixel-art look.' },
          { h: 'Threshold', p: 'Corner-coverage test. Chunkiest silhouette — any cell with a corner inside fills.' },
        ]},
        { h3: '5. Controls', items: [
          { h: 'Cut (3D)',       p: '<b>X / Y / ⟋</b> picks the slice axis — <b>⟋</b> is a 45° diagonal in the x+y plane. Switching axis preserves the proportional cut; the slider max scales to the chosen axis.' },
          { h: 'Pinch & rotate', p: 'Two fingers zoom the canvas. In 3D the finger midpoint also rotates. Mouse wheel zooms, click-drag rotates.' },
          { h: 'Grid & guides',  p: 'Top-left canvas button toggles the cell grid (2D) or per-voxel edges (3D). Bottom-right toggles the center guides (2D).' },
          { h: 'Keyboard',       p: '<span class="key">G</span> Grid &nbsp; <span class="key">C</span> Center &nbsp; <span class="key">D</span> Download &nbsp; <span class="key">T</span> Theme &nbsp; <span class="key">I</span> Info chip &nbsp; <span class="key">M</span> 2D/3D &nbsp; <span class="key">S</span> Sound &nbsp; <span class="key">Ctrl+Z</span> Undo &nbsp; <span class="key">Ctrl+Y</span> Redo' },
        ]},
        { h3: '6. About', items: [
          { h: 'Stack & offline',  p: 'Vanilla JavaScript + Canvas 2D + three.js. No framework, no build step. PWA-installable — works offline. Only the chosen locale persists in <code>localStorage</code>.' },
          { h: 'Output',           p: 'PNG with the accent color on a transparent background. 2D exports at ~2048px on the major axis.' },
          { h: 'License & source', p: 'All Rights Reserved on code &amp; design — see <code>LICENSE</code>. Third-party attributions in <code>NOTICE.md</code>. Repository: <code>github.com/ViniSouza128/pixel-round</code>.' },
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
      sub: 'Un generador pixel-perfecto de círculos, elipses, esferas y elipsoides — pensado para pixel art, voxel art y el aula.',
      sections: [
        { h3: '1. Inicio rápido', items: [
          { p: '<b>1.</b> Elige modo y forma arriba — <b>2D / 3D</b>, luego <b>Círculo / Elipse</b> (o <b>Esfera / Elipsoide</b> en 3D). <br><b>2.</b> Arrastra los sliders para fijar las dimensiones enteras. <br><b>3.</b> Pulsa el icono de descarga sobre el lienzo para guardar un PNG con fondo transparente.' },
        ]},
        { h3: '2. Documentos', items: [
          { h: 'Documento matemático (PDF)',     p: 'Desarrollo completo de ecuaciones, algoritmos, voxelización, cortes y sombreado. <a href="docs_math/Pixel_Round_Math_es-ES.pdf" target="_blank" rel="noopener">Abrir Pixel_Round_Math_es-ES.pdf →</a>' },
          { h: 'Situación de aprendizaje (PDF)', p: 'Secuencia de cuatro sesiones alineada a la LOMLOE (2.º de Bachillerato). <a href="docs_aula/Plano_de_Aula_es-ES.pdf" target="_blank" rel="noopener">Abrir Plano_de_Aula_es-ES.pdf →</a>' },
          { h: 'Los 9 idiomas',                  p: 'Ambos documentos están disponibles en 9 idiomas — explora <a href="docs_math/" target="_blank" rel="noopener">docs_math/</a> y <a href="docs_aula/" target="_blank" rel="noopener">docs_aula/</a>.' },
        ]},
        { h3: '3. Formas', items: [
          { h: '2D · Círculo',   p: 'Usa <b>Tamaño</b>. Contorno relleno, fino o grueso.' },
          { h: '2D · Elipse',    p: 'Usa <b>Ancho</b> + <b>Alto</b>. Mismos modos de renderizado.' },
          { h: '3D · Esfera',    p: 'Usa <b>Tamaño</b>. Añade <b>Corte</b> en X, Y o ⟋ para atravesarla.' },
          { h: '3D · Elipsoide', p: 'Usa <b>Ancho</b> + <b>Alto</b> + <b>Profundidad</b>, más <b>Corte</b> en el eje elegido.' },
        ]},
        { h3: '4. Algoritmos (solo 2D)', items: [
          { h: 'Euclidiano', p: 'Prueba de distancia en el centro del píxel. Contorno más suave.' },
          { h: 'Bresenham',  p: 'Algoritmo clásico del punto medio con enteros. Aspecto escalonado de pixel-art.' },
          { h: 'Umbral',     p: 'Prueba de cobertura por esquina. Silueta más "blocada" — toda celda con una esquina dentro se rellena.' },
        ]},
        { h3: '5. Controles', items: [
          { h: 'Corte (3D)',         p: '<b>X / Y / ⟋</b> elige el eje del corte — <b>⟋</b> es una diagonal de 45° en el plano x+y. Cambiar el eje conserva el corte proporcional; el máximo del slider se ajusta al eje elegido.' },
          { h: 'Pellizcar y rotar',  p: 'Dos dedos en el lienzo dan zoom. En 3D, el punto medio de los dedos también rota la figura. La rueda hace zoom, clic y arrastrar rota.' },
          { h: 'Cuadrícula y guías', p: 'El botón superior izquierdo del lienzo alterna la cuadrícula (2D) o las aristas por voxel (3D). El inferior derecho alterna las guías centrales (2D).' },
          { h: 'Teclado',            p: '<span class="key">G</span> Cuadrícula &nbsp; <span class="key">C</span> Centro &nbsp; <span class="key">D</span> Descargar &nbsp; <span class="key">T</span> Tema &nbsp; <span class="key">I</span> Ficha de info &nbsp; <span class="key">M</span> 2D/3D &nbsp; <span class="key">S</span> Sonido &nbsp; <span class="key">Ctrl+Z</span> Deshacer &nbsp; <span class="key">Ctrl+Y</span> Rehacer' },
        ]},
        { h3: '6. Acerca de', items: [
          { h: 'Stack y sin conexión', p: 'JavaScript puro + Canvas 2D + three.js. Sin framework, sin paso de build. Instalable como PWA — funciona sin conexión. Solo el idioma elegido persiste en <code>localStorage</code>.' },
          { h: 'Salida',               p: 'PNG con el color de acento sobre fondo transparente. Exportación 2D en ~2048px en el eje mayor.' },
          { h: 'Licencia y código',    p: 'Todos los derechos reservados sobre código y diseño — ver <code>LICENSE</code>. Atribuciones de terceros en <code>NOTICE.md</code>. Repositorio: <code>github.com/ViniSouza128/pixel-round</code>.' },
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
      sub: 'Um gerador pixel-perfeito de círculos, elipses, esferas e elipsoides — feito para pixel art, voxel art e a sala de aula.',
      sections: [
        { h3: '1. Início rápido', items: [
          { p: '<b>1.</b> Escolha o modo e a forma no topo — <b>2D / 3D</b>, depois <b>Círculo / Elipse</b> (ou <b>Esfera / Elipsoide</b> em 3D). <br><b>2.</b> Arraste os sliders para definir as dimensões inteiras. <br><b>3.</b> Toque no ícone de download sobre o canvas para salvar um PNG com fundo transparente.' },
        ]},
        { h3: '2. Documentos', items: [
          { h: 'Documento matemático (PDF)', p: 'Desenvolvimento completo das equações, algoritmos, voxelização, cortes e sombreamento. <a href="docs_math/Pixel_Round_Math_pt-BR.pdf" target="_blank" rel="noopener">Abrir Pixel_Round_Math_pt-BR.pdf →</a>' },
          { h: 'Plano de aula (PDF)',        p: 'Sequência didática de quatro aulas para o 3.º ano do Ensino Médio, alinhada à BNCC. <a href="docs_aula/Plano_de_Aula_pt-BR.pdf" target="_blank" rel="noopener">Abrir Plano_de_Aula_pt-BR.pdf →</a>' },
          { h: 'Todos os 9 idiomas',         p: 'Ambos os documentos estão disponíveis em 9 idiomas — explore <a href="docs_math/" target="_blank" rel="noopener">docs_math/</a> e <a href="docs_aula/" target="_blank" rel="noopener">docs_aula/</a>.' },
        ]},
        { h3: '3. Formas', items: [
          { h: '2D · Círculo',   p: 'Usa <b>Tamanho</b>. Contorno preenchido, fino ou grosso.' },
          { h: '2D · Elipse',    p: 'Usa <b>Largura</b> + <b>Altura</b>. Mesmos modos de renderização.' },
          { h: '3D · Esfera',    p: 'Usa <b>Tamanho</b>. Adicione <b>Corte</b> em X, Y ou ⟋ para atravessá-la.' },
          { h: '3D · Elipsoide', p: 'Usa <b>Largura</b> + <b>Altura</b> + <b>Profundidade</b>, mais <b>Corte</b> no eixo escolhido.' },
        ]},
        { h3: '4. Algoritmos (somente 2D)', items: [
          { h: 'Euclidiano', p: 'Teste de distância no centro do pixel. Contorno mais suave.' },
          { h: 'Bresenham',  p: 'Algoritmo clássico do ponto médio com inteiros. Visual escadinha de pixel-art.' },
          { h: 'Limiar',     p: 'Teste de cobertura por canto. Silhueta mais "blocada" — toda célula com um canto dentro é preenchida.' },
        ]},
        { h3: '5. Controles', items: [
          { h: 'Corte (3D)',          p: '<b>X / Y / ⟋</b> escolhe o eixo do corte — <b>⟋</b> é uma diagonal 45° no plano x+y. Trocar o eixo preserva o corte proporcional; o máximo do slider se ajusta ao eixo escolhido.' },
          { h: 'Pinçar e rotacionar', p: 'Dois dedos no canvas dão zoom. Em 3D o ponto médio dos dedos também rotaciona a figura. A roda do mouse dá zoom, clique-arraste rotaciona.' },
          { h: 'Grade e guias',       p: 'O botão superior esquerdo do canvas alterna a grade (2D) ou as arestas por voxel (3D). O inferior direito alterna as guias centrais (2D).' },
          { h: 'Teclado',             p: '<span class="key">G</span> Grade &nbsp; <span class="key">C</span> Centro &nbsp; <span class="key">D</span> Baixar &nbsp; <span class="key">T</span> Tema &nbsp; <span class="key">I</span> Chip de info &nbsp; <span class="key">M</span> 2D/3D &nbsp; <span class="key">S</span> Som &nbsp; <span class="key">Ctrl+Z</span> Desfazer &nbsp; <span class="key">Ctrl+Y</span> Refazer' },
        ]},
        { h3: '6. Sobre', items: [
          { h: 'Stack e offline',  p: 'JavaScript puro + Canvas 2D + three.js. Sem framework, sem build. Instalável como PWA — funciona offline. Apenas o idioma escolhido persiste em <code>localStorage</code>.' },
          { h: 'Saída',            p: 'PNG com a cor de destaque sobre fundo transparente. Exportação 2D em ~2048px no eixo maior.' },
          { h: 'Licença e código', p: 'Todos os direitos reservados sobre código e design — veja <code>LICENSE</code>. Atribuições de terceiros em <code>NOTICE.md</code>. Repositório: <code>github.com/ViniSouza128/pixel-round</code>.' },
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
      sub: 'Un générateur pixel-perfect de cercles, ellipses, sphères et ellipsoïdes — pensé pour le pixel art, le voxel art et la classe.',
      sections: [
        { h3: '1. Démarrage rapide', items: [
          { p: '<b>1.</b> Choisissez le mode et la forme en haut — <b>2D / 3D</b>, puis <b>Cercle / Ellipse</b> (ou <b>Sphère / Ellipsoïde</b> en 3D). <br><b>2.</b> Faites glisser les sliders pour fixer les dimensions entières. <br><b>3.</b> Appuyez sur l\'icône de téléchargement au-dessus du canvas pour enregistrer un PNG à fond transparent.' },
        ]},
        { h3: '2. Documents', items: [
          { h: 'Document mathématique (PDF)', p: 'Développement complet des équations, des algorithmes, de la voxélisation, des coupes et de l\'ombrage. <a href="docs_math/Pixel_Round_Math_fr-FR.pdf" target="_blank" rel="noopener">Ouvrir Pixel_Round_Math_fr-FR.pdf →</a>' },
          { h: 'Séquence pédagogique (PDF)',  p: 'Séance de quatre cours pour la classe de Terminale, spécialité Mathématiques. <a href="docs_aula/Plano_de_Aula_fr-FR.pdf" target="_blank" rel="noopener">Ouvrir Plano_de_Aula_fr-FR.pdf →</a>' },
          { h: 'Les 9 langues',               p: 'Les deux documents sont disponibles en 9 langues — parcourez <a href="docs_math/" target="_blank" rel="noopener">docs_math/</a> et <a href="docs_aula/" target="_blank" rel="noopener">docs_aula/</a>.' },
        ]},
        { h3: '3. Formes', items: [
          { h: '2D · Cercle',     p: 'Utilise <b>Taille</b>. Contour plein, fin ou épais.' },
          { h: '2D · Ellipse',    p: 'Utilise <b>Largeur</b> + <b>Hauteur</b>. Mêmes modes de rendu.' },
          { h: '3D · Sphère',     p: 'Utilise <b>Taille</b>. Ajoutez <b>Coupe</b> en X, Y ou ⟋ pour la traverser.' },
          { h: '3D · Ellipsoïde', p: 'Utilise <b>Largeur</b> + <b>Hauteur</b> + <b>Profondeur</b>, plus <b>Coupe</b> sur l\'axe choisi.' },
        ]},
        { h3: '4. Algorithmes (2D uniquement)', items: [
          { h: 'Euclidien', p: 'Test de distance au centre du pixel. Contour le plus lisse.' },
          { h: 'Bresenham', p: 'Algorithme classique du point milieu en entiers. Aspect "marches" du pixel-art.' },
          { h: 'Seuil',     p: 'Test de couverture par coin. Silhouette la plus massive — toute case avec un coin à l\'intérieur est remplie.' },
        ]},
        { h3: '5. Contrôles', items: [
          { h: 'Coupe (3D)',         p: '<b>X / Y / ⟋</b> choisit l\'axe de coupe — <b>⟋</b> est une diagonale 45° dans le plan x+y. Changer d\'axe conserve la coupe proportionnelle ; le max du slider s\'adapte à l\'axe choisi.' },
          { h: 'Pincer et tourner',  p: 'Deux doigts sur le canvas zooment. En 3D, le milieu des doigts fait aussi tourner. La molette zoome, clic-glisser tourne.' },
          { h: 'Grille et repères',  p: 'Le bouton en haut à gauche du canvas bascule la grille (2D) ou les arêtes par voxel (3D). Celui en bas à droite bascule les repères centraux (2D).' },
          { h: 'Clavier',            p: '<span class="key">G</span> Grille &nbsp; <span class="key">C</span> Centre &nbsp; <span class="key">D</span> Télécharger &nbsp; <span class="key">T</span> Thème &nbsp; <span class="key">I</span> Bulle d\'info &nbsp; <span class="key">M</span> 2D/3D &nbsp; <span class="key">S</span> Son &nbsp; <span class="key">Ctrl+Z</span> Annuler &nbsp; <span class="key">Ctrl+Y</span> Rétablir' },
        ]},
        { h3: '6. À propos', items: [
          { h: 'Stack et hors ligne', p: 'JavaScript pur + Canvas 2D + three.js. Pas de framework, pas d\'étape de build. Installable comme PWA — fonctionne hors ligne. Seule la langue choisie persiste dans <code>localStorage</code>.' },
          { h: 'Sortie',              p: 'PNG avec la couleur d\'accent sur fond transparent. Export 2D à ~2048px sur l\'axe majeur.' },
          { h: 'Licence et source',   p: 'Tous droits réservés sur le code et le design — voir <code>LICENSE</code>. Attributions tierces dans <code>NOTICE.md</code>. Dépôt : <code>github.com/ViniSouza128/pixel-round</code>.' },
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
      sub: 'Ein pixelgenauer Generator für Kreise, Ellipsen, Kugeln und Ellipsoide — gemacht für Pixel-Art, Voxel-Art und den Unterricht.',
      sections: [
        { h3: '1. Schnellstart', items: [
          { p: '<b>1.</b> Modus und Form oben wählen — <b>2D / 3D</b>, dann <b>Kreis / Ellipse</b> (oder <b>Kugel / Ellipsoid</b> in 3D). <br><b>2.</b> Die Slider ziehen, um die ganzzahligen Maße festzulegen. <br><b>3.</b> Auf das Download-Symbol über dem Canvas tippen, um ein PNG mit transparentem Hintergrund zu speichern.' },
        ]},
        { h3: '2. Dokumente', items: [
          { h: 'Mathematischer Begleittext (PDF)', p: 'Ausführliche Herleitung der Gleichungen, Algorithmen, Voxelisierung, Schnitte und Schattierung. <a href="docs_math/Pixel_Round_Math_de-DE.pdf" target="_blank" rel="noopener">Pixel_Round_Math_de-DE.pdf öffnen →</a>' },
          { h: 'Unterrichtssequenz (PDF)',         p: 'Vier Doppelstunden für die gymnasiale Oberstufe (Q2). <a href="docs_aula/Plano_de_Aula_de-DE.pdf" target="_blank" rel="noopener">Plano_de_Aula_de-DE.pdf öffnen →</a>' },
          { h: 'Alle 9 Sprachen',                  p: 'Beide Dokumente liegen in 9 Sprachen vor — durchstöbern: <a href="docs_math/" target="_blank" rel="noopener">docs_math/</a> und <a href="docs_aula/" target="_blank" rel="noopener">docs_aula/</a>.' },
        ]},
        { h3: '3. Formen', items: [
          { h: '2D · Kreis',     p: 'Nutzt <b>Größe</b>. Gefüllter, dünner oder dicker Umriss.' },
          { h: '2D · Ellipse',   p: 'Nutzt <b>Breite</b> + <b>Höhe</b>. Gleiche Render-Modi.' },
          { h: '3D · Kugel',     p: 'Nutzt <b>Größe</b>. Mit <b>Schnitt</b> auf X, Y oder ⟋ wird durchgeschnitten.' },
          { h: '3D · Ellipsoid', p: 'Nutzt <b>Breite</b> + <b>Höhe</b> + <b>Tiefe</b>, plus <b>Schnitt</b> auf der gewählten Achse.' },
        ]},
        { h3: '4. Algorithmen (nur 2D)', items: [
          { h: 'Euklidisch', p: 'Distanztest am Pixelzentrum. Glattester Umriss.' },
          { h: 'Bresenham',  p: 'Klassischer Ganzzahl-Mittelpunkt-Algorithmus. Treppen-Look im Pixel-Art-Stil.' },
          { h: 'Schwelle',   p: 'Eckenüberdeckungstest. Klobigste Silhouette — jede Zelle mit einer Ecke innen wird gefüllt.' },
        ]},
        { h3: '5. Steuerung', items: [
          { h: 'Schnitt (3D)',          p: '<b>X / Y / ⟋</b> wählt die Schnittachse — <b>⟋</b> ist ein 45°-Diagonalschnitt in der x+y-Ebene. Achsenwechsel erhält den proportionalen Schnitt; das Slider-Maximum skaliert mit der gewählten Achse.' },
          { h: 'Pinch & rotieren',      p: 'Zwei Finger zoomen den Canvas. In 3D rotiert der Mittelpunkt der Finger auch die Figur. Mausrad zoomt, Klick-Ziehen rotiert.' },
          { h: 'Raster & Mittelachsen', p: 'Die Taste oben links am Canvas schaltet das Raster (2D) bzw. die Voxel-Kanten (3D). Unten rechts schaltet die Mittelachsen (2D).' },
          { h: 'Tastatur',              p: '<span class="key">G</span> Raster &nbsp; <span class="key">C</span> Mitte &nbsp; <span class="key">D</span> Download &nbsp; <span class="key">T</span> Thema &nbsp; <span class="key">I</span> Info-Chip &nbsp; <span class="key">M</span> 2D/3D &nbsp; <span class="key">S</span> Ton &nbsp; <span class="key">Strg+Z</span> Rückgängig &nbsp; <span class="key">Strg+Y</span> Wiederh.' },
        ]},
        { h3: '6. Über', items: [
          { h: 'Stack & Offline', p: 'Vanilla JavaScript + Canvas 2D + three.js. Kein Framework, kein Build-Schritt. Als PWA installierbar — offline nutzbar. Nur die gewählte Sprache bleibt in <code>localStorage</code>.' },
          { h: 'Ausgabe',         p: 'PNG mit Akzentfarbe auf transparentem Hintergrund. 2D-Export bei ~2048px auf der Hauptachse.' },
          { h: 'Lizenz & Quelle', p: 'Alle Rechte vorbehalten für Code und Design — siehe <code>LICENSE</code>. Drittanbieter-Hinweise in <code>NOTICE.md</code>. Repository: <code>github.com/ViniSouza128/pixel-round</code>.' },
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
      sub: '一个像素完美的圆、椭圆、球体和椭球体生成器 — 为像素艺术、体素艺术和课堂教学而设计。',
      sections: [
        { h3: '1. 快速开始', items: [
          { p: '<b>1.</b> 在顶部选择模式与形状 — <b>2D / 3D</b>，然后 <b>圆 / 椭圆</b>（在 3D 中为 <b>球体 / 椭球体</b>）。<br><b>2.</b> 拖动滑块设置整数尺寸。<br><b>3.</b> 点击画布上的下载图标，保存透明背景的 PNG。' },
        ]},
        { h3: '2. 文档', items: [
          { h: '数学技术文档 (PDF)', p: '完整推导方程、三种算法、体素化、切割与着色。<a href="docs_math/Pixel_Round_Math_zh-CN.pdf" target="_blank" rel="noopener">打开 Pixel_Round_Math_zh-CN.pdf →</a>' },
          { h: '教学设计 (PDF)',     p: '面向普通高中三年级（高三）数学的四课时教学设计。<a href="docs_aula/Plano_de_Aula_zh-CN.pdf" target="_blank" rel="noopener">打开 Plano_de_Aula_zh-CN.pdf →</a>' },
          { h: '全部 9 种语言',       p: '两份文档均提供 9 种语言 — 浏览 <a href="docs_math/" target="_blank" rel="noopener">docs_math/</a> 与 <a href="docs_aula/" target="_blank" rel="noopener">docs_aula/</a>。' },
        ]},
        { h3: '3. 形状', items: [
          { h: '2D · 圆',     p: '使用 <b>尺寸</b>。填充、细或粗的轮廓。' },
          { h: '2D · 椭圆',   p: '使用 <b>宽度</b> + <b>高度</b>。相同的渲染模式。' },
          { h: '3D · 球体',   p: '使用 <b>尺寸</b>。<b>切割</b> X、Y 或 ⟋ 可穿透切片。' },
          { h: '3D · 椭球体', p: '使用 <b>宽度</b> + <b>高度</b> + <b>深度</b>，并在所选轴上 <b>切割</b>。' },
        ]},
        { h3: '4. 算法（仅 2D）', items: [
          { h: '欧几里得',   p: '在像素中心进行距离测试。轮廓最平滑。' },
          { h: '布雷森汉姆', p: '经典的整数中点算法。像素画的阶梯外观。' },
          { h: '阈值',       p: '角点覆盖测试。轮廓最块状 — 任何内部有角点的单元格都会填充。' },
        ]},
        { h3: '5. 控制', items: [
          { h: '切割（3D）',   p: '<b>X / Y / ⟋</b> 选择切割轴 — <b>⟋</b> 是 x+y 平面上的 45° 对角线。切换轴时保留比例切割；滑块最大值会按所选轴缩放。' },
          { h: '捏合与旋转',   p: '在画布上用两根手指缩放。3D 中手指中点也会旋转图形。鼠标滚轮缩放，点击拖动旋转。' },
          { h: '网格与参考线', p: '画布左上角按钮在 2D 中切换单元格网格，在 3D 中切换每个体素的边线。右下角切换中心参考线（2D）。' },
          { h: '键盘',         p: '<span class="key">G</span> 网格 &nbsp; <span class="key">C</span> 中心 &nbsp; <span class="key">D</span> 下载 &nbsp; <span class="key">T</span> 主题 &nbsp; <span class="key">I</span> 信息卡 &nbsp; <span class="key">M</span> 2D/3D &nbsp; <span class="key">S</span> 声音 &nbsp; <span class="key">Ctrl+Z</span> 撤销 &nbsp; <span class="key">Ctrl+Y</span> 重做' },
        ]},
        { h3: '6. 关于', items: [
          { h: '技术栈与离线', p: '原生 JavaScript + Canvas 2D + three.js。无框架、无构建步骤。可作为 PWA 安装 — 可离线使用。仅所选语言保留在 <code>localStorage</code> 中。' },
          { h: '输出',         p: '透明背景上带强调色的 PNG。2D 在主轴上以 ~2048 像素导出。' },
          { h: '许可与源码',   p: '代码和设计保留所有权利 — 见 <code>LICENSE</code>。第三方归属见 <code>NOTICE.md</code>。仓库：<code>github.com/ViniSouza128/pixel-round</code>。' },
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
      sub: '円・楕円・球・楕円体のピクセルパーフェクトジェネレーター — ピクセルアート、ボクセルアート、授業向け。',
      sections: [
        { h3: '1. クイックスタート', items: [
          { p: '<b>1.</b> 上部でモードと形状を選択 — <b>2D / 3D</b>、続いて <b>円 / 楕円</b>（3D では <b>球 / 楕円体</b>）。<br><b>2.</b> スライダーを動かして整数の寸法を設定。<br><b>3.</b> キャンバス上のダウンロードアイコンをタップして、透明背景の PNG を保存。' },
        ]},
        { h3: '2. ドキュメント', items: [
          { h: '数学解説 (PDF)',    p: '方程式・3アルゴリズム・ボクセル化・切断・シェーディングの詳細な導出。<a href="docs_math/Pixel_Round_Math_ja-JP.pdf" target="_blank" rel="noopener">Pixel_Round_Math_ja-JP.pdf を開く →</a>' },
          { h: '学習指導案 (PDF)',  p: '高等学校第3学年数学のための4単位時間の学習指導案。<a href="docs_aula/Plano_de_Aula_ja-JP.pdf" target="_blank" rel="noopener">Plano_de_Aula_ja-JP.pdf を開く →</a>' },
          { h: '9言語すべて',        p: 'どちらの文書も9言語で利用可能 — <a href="docs_math/" target="_blank" rel="noopener">docs_math/</a> と <a href="docs_aula/" target="_blank" rel="noopener">docs_aula/</a> を参照。' },
        ]},
        { h3: '3. 形状', items: [
          { h: '2D · 円',     p: '<b>サイズ</b> を使用。塗りつぶし・細・太の輪郭。' },
          { h: '2D · 楕円',    p: '<b>幅</b> + <b>高さ</b> を使用。同じレンダリングモード。' },
          { h: '3D · 球',      p: '<b>サイズ</b> を使用。<b>カット</b> X・Y・⟋ で切り抜き。' },
          { h: '3D · 楕円体',  p: '<b>幅</b> + <b>高さ</b> + <b>奥行き</b>、選択した軸で <b>カット</b>。' },
        ]},
        { h3: '4. アルゴリズム（2D のみ）', items: [
          { h: 'ユークリッド', p: 'ピクセル中心での距離テスト。最もなめらかな輪郭。' },
          { h: 'ブレゼンハム', p: '古典的な整数中点アルゴリズム。階段状のピクセルアート風。' },
          { h: 'しきい値',     p: 'コーナーカバレッジテスト。最もブロック状のシルエット — 内側にコーナーがあるセルはすべて塗りつぶし。' },
        ]},
        { h3: '5. 操作', items: [
          { h: 'カット (3D)',      p: '<b>X / Y / ⟋</b> でカット軸を選択 — <b>⟋</b> は x+y 平面の 45° 対角線。軸を切り替えると比率カットが保たれ、スライダー最大値は選択軸に合わせて調整されます。' },
          { h: 'ピンチと回転',     p: 'キャンバスで指 2 本でズーム。3D では指の中点が図形も回転させます。マウスホイールでズーム、クリックドラッグで回転。' },
          { h: 'グリッドとガイド', p: 'キャンバス左上のボタンは 2D ではセルグリッドを、3D ではボクセルエッジを切り替えます。右下は中心ガイド（2D）を切り替え。' },
          { h: 'キーボード',       p: '<span class="key">G</span> グリッド &nbsp; <span class="key">C</span> 中心 &nbsp; <span class="key">D</span> ダウンロード &nbsp; <span class="key">T</span> テーマ &nbsp; <span class="key">I</span> 情報チップ &nbsp; <span class="key">M</span> 2D/3D &nbsp; <span class="key">S</span> サウンド &nbsp; <span class="key">Ctrl+Z</span> 元に戻す &nbsp; <span class="key">Ctrl+Y</span> やり直し' },
        ]},
        { h3: '6. このアプリ', items: [
          { h: 'スタックとオフライン', p: 'Vanilla JavaScript + Canvas 2D + three.js。フレームワークなし、ビルドステップなし。PWA としてインストール可能 — オフラインで動作。言語のみ <code>localStorage</code> に保持されます。' },
          { h: '出力',                 p: '透明背景にアクセントカラーの PNG。2D は主軸で約 2048px でエクスポート。' },
          { h: 'ライセンスとソース',   p: 'コードとデザインの全著作権を保有 — <code>LICENSE</code> を参照。サードパーティの帰属は <code>NOTICE.md</code> に。リポジトリ：<code>github.com/ViniSouza128/pixel-round</code>。' },
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
      sub: 'Пиксельно-точный генератор кругов, эллипсов, сфер и эллипсоидов — для пиксель-арта, воксель-арта и уроков.',
      sections: [
        { h3: '1. Быстрый старт', items: [
          { p: '<b>1.</b> Выберите режим и фигуру сверху — <b>2D / 3D</b>, затем <b>Круг / Эллипс</b> (или <b>Сфера / Эллипсоид</b> в 3D). <br><b>2.</b> Двигайте слайдеры, чтобы задать целочисленные размеры. <br><b>3.</b> Нажмите иконку загрузки над холстом, чтобы сохранить PNG с прозрачным фоном.' },
        ]},
        { h3: '2. Документы', items: [
          { h: 'Математическое сопровождение (PDF)', p: 'Подробный вывод уравнений, трёх алгоритмов, вокселизации, сечений и затенения. <a href="docs_math/Pixel_Round_Math_ru-RU.pdf" target="_blank" rel="noopener">Открыть Pixel_Round_Math_ru-RU.pdf →</a>' },
          { h: 'Технологическая карта урока (PDF)',  p: 'Четыре урока для 11 класса средней общеобразовательной школы. <a href="docs_aula/Plano_de_Aula_ru-RU.pdf" target="_blank" rel="noopener">Открыть Plano_de_Aula_ru-RU.pdf →</a>' },
          { h: 'Все 9 языков',                       p: 'Оба документа доступны на 9 языках — смотрите <a href="docs_math/" target="_blank" rel="noopener">docs_math/</a> и <a href="docs_aula/" target="_blank" rel="noopener">docs_aula/</a>.' },
        ]},
        { h3: '3. Фигуры', items: [
          { h: '2D · Круг',      p: 'Использует <b>Размер</b>. Залитый, тонкий или толстый контур.' },
          { h: '2D · Эллипс',    p: 'Использует <b>Ширину</b> + <b>Высоту</b>. Те же режимы отрисовки.' },
          { h: '3D · Сфера',     p: 'Использует <b>Размер</b>. <b>Срез</b> по X, Y или ⟋ разрезает фигуру.' },
          { h: '3D · Эллипсоид', p: 'Использует <b>Ширину</b> + <b>Высоту</b> + <b>Глубину</b>, плюс <b>Срез</b> по выбранной оси.' },
        ]},
        { h3: '4. Алгоритмы (только 2D)', items: [
          { h: 'Евклидов',  p: 'Тест расстояния в центре пикселя. Самый плавный контур.' },
          { h: 'Брезенхэм', p: 'Классический алгоритм средней точки. Ступенчатый вид пиксель-арта.' },
          { h: 'Порог',     p: 'Тест покрытия угла. Самый «блочный» силуэт — заполняется любая ячейка с углом внутри.' },
        ]},
        { h3: '5. Управление', items: [
          { h: 'Срез (3D)',            p: '<b>X / Y / ⟋</b> выбирает ось среза — <b>⟋</b> — диагональ 45° в плоскости x+y. Смена оси сохраняет пропорциональный срез; максимум слайдера масштабируется под выбранную ось.' },
          { h: 'Щипок и поворот',      p: 'Два пальца на холсте — зум. В 3D средняя точка пальцев также вращает фигуру. Колёсико мыши — зум, перетаскивание — поворот.' },
          { h: 'Сетка и направляющие', p: 'Кнопка в левом верхнем углу холста переключает сетку (2D) или рёбра вокселя (3D). В правом нижнем — осевые направляющие (2D).' },
          { h: 'Клавиши',              p: '<span class="key">G</span> Сетка &nbsp; <span class="key">C</span> Центр &nbsp; <span class="key">D</span> Скачать &nbsp; <span class="key">T</span> Тема &nbsp; <span class="key">I</span> Инфо-чип &nbsp; <span class="key">M</span> 2D/3D &nbsp; <span class="key">S</span> Звук &nbsp; <span class="key">Ctrl+Z</span> Отменить &nbsp; <span class="key">Ctrl+Y</span> Повторить' },
        ]},
        { h3: '6. О приложении', items: [
          { h: 'Стек и офлайн',  p: 'Vanilla JavaScript + Canvas 2D + three.js. Без фреймворка, без сборки. Устанавливается как PWA — работает офлайн. Только язык сохраняется в <code>localStorage</code>.' },
          { h: 'Экспорт',        p: 'PNG с акцентным цветом на прозрачном фоне. 2D экспортируется в ~2048px по главной оси.' },
          { h: 'Лицензия и код', p: 'Все права на код и дизайн защищены — см. <code>LICENSE</code>. Сторонние упоминания в <code>NOTICE.md</code>. Репозиторий: <code>github.com/ViniSouza128/pixel-round</code>.' },
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
      sub: '원, 타원, 구, 타원체를 위한 픽셀 정밀 생성기 — 픽셀 아트, 복셀 아트, 교실 수업용.',
      sections: [
        { h3: '1. 빠른 시작', items: [
          { p: '<b>1.</b> 상단에서 모드와 도형을 선택 — <b>2D / 3D</b>, 그다음 <b>원 / 타원</b> (3D에서는 <b>구 / 타원체</b>). <br><b>2.</b> 슬라이더를 드래그하여 정수 치수를 설정. <br><b>3.</b> 캔버스 위의 다운로드 아이콘을 눌러 투명 배경 PNG 저장.' },
        ]},
        { h3: '2. 문서', items: [
          { h: '수학 기술 문서 (PDF)', p: '방정식, 세 가지 알고리즘, 복셀화, 절단, 음영 처리의 상세한 유도. <a href="docs_math/Pixel_Round_Math_ko-KR.pdf" target="_blank" rel="noopener">Pixel_Round_Math_ko-KR.pdf 열기 →</a>' },
          { h: '수업 지도안 (PDF)',    p: '고등학교 3학년 수학과를 위한 4차시 수업 지도안. <a href="docs_aula/Plano_de_Aula_ko-KR.pdf" target="_blank" rel="noopener">Plano_de_Aula_ko-KR.pdf 열기 →</a>' },
          { h: '9개 언어 모두',         p: '두 문서 모두 9개 언어로 제공 — <a href="docs_math/" target="_blank" rel="noopener">docs_math/</a> 및 <a href="docs_aula/" target="_blank" rel="noopener">docs_aula/</a> 참조.' },
        ]},
        { h3: '3. 도형', items: [
          { h: '2D · 원',     p: '<b>크기</b>를 사용. 채우기, 얇게 또는 굵게 윤곽.' },
          { h: '2D · 타원',   p: '<b>너비</b> + <b>높이</b>를 사용. 동일한 렌더 모드.' },
          { h: '3D · 구',     p: '<b>크기</b>를 사용. <b>자르기</b> X, Y 또는 ⟋로 절단.' },
          { h: '3D · 타원체', p: '<b>너비</b> + <b>높이</b> + <b>깊이</b>, 선택한 축에서 <b>자르기</b>.' },
        ]},
        { h3: '4. 알고리즘 (2D 전용)', items: [
          { h: '유클리드', p: '픽셀 중심에서 거리 테스트. 가장 부드러운 윤곽.' },
          { h: '브레젠험', p: '고전적인 정수 중점 알고리즘. 픽셀 아트 계단 형태.' },
          { h: '임계값',   p: '모서리 커버리지 테스트. 가장 두꺼운 실루엣 — 내부에 모서리가 있는 모든 셀이 채워짐.' },
        ]},
        { h3: '5. 조작', items: [
          { h: '자르기 (3D)',  p: '<b>X / Y / ⟋</b>로 자르기 축을 선택 — <b>⟋</b>는 x+y 평면의 45° 대각선. 축 전환 시 비율 자르기가 유지되며 슬라이더 최대값은 선택된 축에 맞게 조정.' },
          { h: '핀치 & 회전',  p: '캔버스에 두 손가락으로 확대/축소. 3D에서는 손가락 중점이 도형을 회전. 마우스 휠로 줌, 클릭 드래그로 회전.' },
          { h: '격자 & 가이드', p: '캔버스 왼쪽 상단 버튼은 2D에서는 셀 격자를, 3D에서는 복셀별 모서리를 전환. 오른쪽 하단은 중심 가이드(2D)를 전환.' },
          { h: '키보드',       p: '<span class="key">G</span> 격자 &nbsp; <span class="key">C</span> 중심 &nbsp; <span class="key">D</span> 다운로드 &nbsp; <span class="key">T</span> 테마 &nbsp; <span class="key">I</span> 정보 칩 &nbsp; <span class="key">M</span> 2D/3D &nbsp; <span class="key">S</span> 소리 &nbsp; <span class="key">Ctrl+Z</span> 실행 취소 &nbsp; <span class="key">Ctrl+Y</span> 다시 실행' },
        ]},
        { h3: '6. 정보', items: [
          { h: '스택 & 오프라인', p: '바닐라 JavaScript + Canvas 2D + three.js. 프레임워크 없음, 빌드 단계 없음. PWA로 설치 가능 — 오프라인 작동. 언어만 <code>localStorage</code>에 저장.' },
          { h: '출력',           p: '투명 배경에 강조 색상 PNG. 2D는 주축에서 ~2048px로 내보냄.' },
          { h: '라이선스 & 소스', p: '코드 및 디자인의 모든 권리 보유 — <code>LICENSE</code> 참조. 타사 저작권은 <code>NOTICE.md</code>에 있습니다. 저장소: <code>github.com/ViniSouza128/pixel-round</code>.' },
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
