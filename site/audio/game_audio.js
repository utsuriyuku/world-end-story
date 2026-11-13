(function () {
  'use strict';
  const files = {
    heal: 'heal.mp3', coin: 'coin.mp3', cloth: 'cloth.mp3',
    stone_move: 'stone_move.mp3', stone_drop: 'stone_drop.mp3',
    fire: 'fire.mp3', steps: 'steps.mp3', waves: 'waves.mp3',
    rockfall: 'rockfall.mp3', door: 'door.mp3', pencil: 'pencil.mp3',
    paper: 'paper.mp3', tram: 'tram.mp3'
  };
  const levels = {
    heal: .28, coin: .34, cloth: .24, stone_move: .29,
    stone_drop: .34, fire: .13, steps: .12, waves: .27,
    rockfall: .32, door: .24, pencil: .12, paper: .18, tram: .12
  };
  const gain = Math.pow(10, 2 / 20); // Raise every sound effect by 2 dB.
  const limits = { heal: 2, coin: 1.3, cloth: 1.4, stone_move: 1.5,
    stone_drop: 1.6, fire: 3, steps: 4.8, waves: 6.5, rockfall: 4,
    door: 3.6, pencil: 4.5, paper: 1.1, tram: 7.5 };
  const active = new Map(), last = new Map();
  const loops = new Set(['fire', 'pencil']);
  let paused = false, hidden = document.hidden;
  function stop(cue) {
    const instance = active.get(cue);
    if (!instance) return;
    clearTimeout(instance.timer);
    instance.audio.pause();
    instance.audio.currentTime = 0;
    active.delete(cue);
  }
  function play(cue) {
    if (!files[cue] || paused || hidden) return;
    const now = performance.now();
    if (now - (last.get(cue) || -10000) < (cue === 'steps' ? 650 : 230)) return;
    last.set(cue, now);
    stop(cue);
    const audio = new Audio(new URL(files[cue], document.currentScript?.src || new URL('../audio/', location.href)));
    audio.volume = Math.min(1, levels[cue] * gain);
    audio.preload = 'auto';
    audio.loop = loops.has(cue);
    const instance = { audio, timer: cue === 'fire' ? null : setTimeout(() => stop(cue), limits[cue] * 1000) };
    active.set(cue, instance);
    audio.onended = () => { if (active.get(cue) === instance) active.delete(cue); };
    audio.play().catch(() => stop(cue));
  }
  function pause(on) {
    paused = !!on;
    if (paused) for (const cue of [...active.keys()]) stop(cue);
  }
  window.GameAudio = { play, stop, pause };
  document.addEventListener('visibilitychange', () => {
    hidden = document.hidden;
    if (hidden) for (const cue of [...active.keys()]) stop(cue);
  });
})();
