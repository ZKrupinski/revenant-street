/* REVENANT STREET — original industrial-metal combat BGM.
 * 184 BPM instrumental by generative synthesis (not a sample of any recording).
 * Music runs on a separate HTMLAudioElement; combat SFX stay untouched.
 */
(() => {
  'use strict';
  const LOCAL = './assets/bgm/revenant-industrial-184bpm.m4a';
  const FALLBACK = 'https://d8j0ntlcm91z4.cloudfront.net/user_3KlCHKRIJO34SPkOC5UMUPo7vEp/hf_20261030_101824_01a58590-8464-4c1b-b4d9-0cfaf77e7629.m4a';
  const soundButton = document.getElementById('muteButton');
  const status = document.querySelector('header.masthead .status');
  const bgm = new Audio();
  bgm.preload = 'auto';
  bgm.loop = true;
  bgm.volume = 0;
  bgm.src = LOCAL;
  let fallbackTried = false;
  let unlocked = false;
  let started = false;
  let bgmEnabled = true;
  try { bgmEnabled = localStorage.getItem('z_bgm_enabled') !== 'false'; } catch (_) {}
  bgm.addEventListener('error', () => {
    if (fallbackTried) return;
    fallbackTried = true;
    bgm.src = FALLBACK;
    bgm.load();
    if (unlocked) void beginPlayback();
  });
  const button = document.createElement('button');
  button.type = 'button';
  button.id = 'zBgmToggle';
  button.setAttribute('aria-label', '전투 배경음악 켜기 또는 끄기');
  button.setAttribute('aria-pressed', String(bgmEnabled));
  button.title = 'ORIGINAL INDUSTRIAL METAL / 184 BPM';
  button.textContent = bgmEnabled ? 'BGM ON' : 'BGM OFF';
  button.style.cssText = 'font:900 10px Arial,sans-serif;letter-spacing:.3px;padding:5px 7px;min-height:27px;color:#f8d6dc;background:#36151bc9;border:1px solid #a54e5f;border-radius:4px;white-space:nowrap;';
  if (status) status.append(button);
  function globalSoundOn() { return !soundButton || !/\bOFF\b/.test(soundButton.textContent); }
  function gameIsPlaying() {
    try { return window.__revenant?.getState?.().gameState === 'playing'; }
    catch (_) { return false; }
  }
  function beginPlayback() {
    if (!bgmEnabled || !globalSoundOn() || document.hidden) return Promise.resolve();
    const result = bgm.play();
    if (result?.then) return result.then(() => { started = true; }).catch(() => { started = false; });
    started = true; return Promise.resolve();
  }
  function unlock() {
    unlocked = true;
    if (bgmEnabled && globalSoundOn()) void beginPlayback();
  }
  // Browsers require a real user gesture before first playback. Starting quietly on
  // the first touch lets music fade in once asynchronous game art has finished loading.
  document.addEventListener('pointerdown', unlock, { passive: true });
  document.addEventListener('keydown', unlock, { passive: true });
  button.addEventListener('click', () => {
    bgmEnabled = !bgmEnabled;
    try { localStorage.setItem('z_bgm_enabled', String(bgmEnabled)); } catch (_) {}
    button.textContent = bgmEnabled ? 'BGM ON' : 'BGM OFF';
    button.setAttribute('aria-pressed', String(bgmEnabled));
    if (bgmEnabled) unlock();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { bgm.pause(); started = false; }
    else if (unlocked) void beginPlayback();
  });
  // Non-blocking music fade. Keep the track playing quietly across reward/menu
  // transitions to avoid browser autoplay restrictions on gamepad navigation.
  let lastTime = performance.now();
  setInterval(() => {
    const now = performance.now();
    const delta = Math.min((now - lastTime) / 1000, .4);
    lastTime = now;
    const target = bgmEnabled && globalSoundOn() && !document.hidden && gameIsPlaying() ? .29 : 0;
    const step = delta * .9;
    const v = Math.max(0, Math.min(1, bgm.volume + Math.max(-step, Math.min(step, target - bgm.volume))));
    if (Math.abs(bgm.volume-v)>.0001) bgm.volume = v;
    if (target>0 && unlocked && (!started || bgm.paused)) void beginPlayback();
  }, 180);
  window.__revenantBgm = {
    getState: () => ({ enabled: bgmEnabled, playing: !bgm.paused, volume: bgm.volume, source: bgm.currentSrc || bgm.src, fallbackTried }),
    toggle: () => button.click()
  };
})();
