(() => {
  'use strict';
  // Keep the music player in the top page so chapter changes do not restart it.
  let shared = null;
  try { if (window.parent !== window) shared = window.parent.GameBGM; } catch (_) {}
  if (shared) {
    window.GameBGM = shared;
    for (const event of ['pointerdown', 'touchstart', 'keydown'])
      window.addEventListener(event, () => window.GameBGM.unlock(), { passive: true });
    return;
  }
  const base = new URL('.', document.currentScript.src);
  const files = { calm: 'bgm/calm.mp3', disaster: 'bgm/disaster.mp3',
    duel: 'bgm/duel.mp3', dialogue: 'bgm/dialogue.mp3' };
  const level = Math.pow(10, -4 / 20); // Four decibels below the supplied files.
  let current = null, previous = null, fade = null;
  let paused = false, hidden = document.hidden;

  function stop(track) {
    if (!track) return;
    track.audio.pause();
    track.audio.currentTime = 0;
  }
  function tick(now) {
    if (!fade) return;
    const interval = now - (fade.last ?? now);
    fade.last = now;
    if (paused || hidden) { fade.start += interval; requestAnimationFrame(tick); return; }
    const p = Math.min(1, (now - fade.start) / fade.duration);
    if (fade.to === current) current.audio.volume = level * p;
    if (fade.from && fade.from === previous) previous.audio.volume = fade.fromVolume * (1 - p);
    if (p < 1) requestAnimationFrame(tick);
    else { stop(previous); previous = null; fade = null; }
  }
  function unlock() {
    if (!current || paused || hidden || current.starting) return;
    const target = current;
    if (!target.audio.paused && (fade || target.started)) return;
    target.starting = true;
    target.audio.play().then(() => {
      target.starting = false;
      if (target !== current) { stop(target); return; }
      if (!target.started) {
        target.started = true;
        fade = { to: target, from: previous, fromVolume: previous?.audio.volume || 0,
          start: performance.now(), duration: target.fast ? 180 : 800 };
        requestAnimationFrame(tick);
      }
    }).catch(() => { target.starting = false; });
  }
  function set(name, fast = false) {
    if (!files[name] || current?.name === name) return;
    stop(previous);
    previous = current;
    fade = null;
    const audio = new Audio(new URL(files[name], base));
    audio.preload = 'auto';
    audio.loop = true;
    audio.volume = 0;
    current = { name, audio, fast, started: false, starting: false };
    unlock();
  }
  function pause(on) {
    paused = !!on;
    if (paused) { current?.audio.pause(); previous?.audio.pause(); }
    else { if (previous && !hidden) previous.audio.play().catch(() => {}); unlock(); }
  }
  document.addEventListener('visibilitychange', () => {
    hidden = document.hidden;
    if (hidden) { current?.audio.pause(); previous?.audio.pause(); }
    else if (!paused) { previous?.audio.play().catch(() => {}); unlock(); }
  });
  for (const event of ['pointerdown', 'touchstart', 'keydown'])
    window.addEventListener(event, unlock, { passive: true });
  window.GameBGM = { set, pause, unlock,
    get current() { return current?.name || null; },
    get volume() { return current?.audio.volume || 0; } };
})();
