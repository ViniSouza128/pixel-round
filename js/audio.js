/* =============================================================================
   Pixel Round — js/audio.js
   All Rights Reserved.

   Lightweight WebAudio sound engine. All sounds are synthesized at runtime
   (sine waves) — no external audio assets. Global toggle is persisted in
   localStorage. Gains are kept low (≤.04) to stay polite by default.
   ============================================================================ */

const Sfx = (() => {
  let ctx = null;
  let on  = true;

  // Lazy AudioContext creation (browsers require user gesture)
  function ensure(){
    if (ctx) return ctx;
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); }
    catch(_) { ctx = null; }
    return ctx;
  }

  function tone({freq=600, dur=.06, type='sine', gain=.025} = {}){
    if (!on) return;
    const c = ensure(); if (!c) return;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.value = gain;
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
    o.connect(g); g.connect(c.destination);
    o.start();
    o.stop(c.currentTime + dur);
  }

  function chord(freqs, opts = {}){
    freqs.forEach((f, i) => setTimeout(() => tone({...opts, freq:f}), i * 40));
  }

  // Public API — one method per UI affordance
  return {
    setEnabled(v){ on = !!v; },
    isEnabled(){ return on; },
    loadPref(){ /* session-only — no persistence */ },

    click:   () => tone({freq:620,  dur:.05, gain:.025}),
    hover:   () => tone({freq:1100, dur:.02, gain:.012}),
    open:    () => chord([480, 640],   {dur:.08, gain:.03}),
    close:   () => chord([640, 480],   {dur:.07, gain:.028}),
    ok:      () => chord([520, 720, 920], {dur:.07, gain:.028}),
    error:   () => tone({freq:200,  dur:.16, gain:.035}),
    pop:     () => { tone({freq:680, dur:.05, gain:.025}); setTimeout(() => tone({freq:980, dur:.05, gain:.022}), 35); },
    tick:    () => tone({freq:1300, dur:.012, gain:.01}),
  };
})();
