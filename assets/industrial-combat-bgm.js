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
  let ready = false, preparing = null, objectUrl = null, playPending = null;
  // Fetch the complete file, then play from a local blob: no combat-time buffering.
  function prepare() {
    if (ready) return Promise.resolve();
    if (preparing) return preparing;
    preparing = (async () => {
      let lastError;
      for (const source of [LOCAL, FALLBACK]) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 45000);
        try {
          const response = await fetch(source, { signal: controller.signal });
          if (!response.ok) throw Error('HTTP ' + response.status);
          const blob = await response.blob();
          if (!blob.size) throw Error('Empty music file');
          if (objectUrl) URL.revokeObjectURL(objectUrl);
          objectUrl = URL.createObjectURL(blob);
          await new Promise((resolve, reject) => {
            const timer = setTimeout(() => finish(Error('음악 재생 준비 시간 초과')), 15000);
            function finish(error) {
              clearTimeout(timer);
              bgm.removeEventListener('canplay', onReady);
              bgm.removeEventListener('error', onError);
              error ? reject(error) : resolve();
            }
            const onReady = () => finish();
            const onError = () => finish(Error('음악 파일을 재생할 수 없습니다'));
            bgm.addEventListener('canplay', onReady);
            bgm.addEventListener('error', onError);
            bgm.src = objectUrl; bgm.load();
          });
          fallbackTried = source === FALLBACK;
          ready = true; return;
        } catch (error) { lastError = error; }
        finally { clearTimeout(timeout); }
      }
      throw Error('음악 로딩 실패. 다시 불러오기를 눌러주세요. ' + (lastError?.message || ''));
    })().finally(() => { preparing = null; });
    return preparing;
  }
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
  // Keep the same audio stream playing during mid-run and between-wave upgrades.
  // Reduce only the music level; combat sound effects are handled separately.
  function gameMusicVolume() {
    try {
      const state = window.__revenant?.getMusicState?.();
      if (state === 'playing') return .29;
      if (state === 'reward') return .21;
    } catch (_) {}
    return 0;
  }
  function beginPlayback() {
    if (!bgmEnabled || !globalSoundOn() || document.hidden) return Promise.resolve();
    if (playPending) return playPending;
    if (!bgm.paused) return Promise.resolve();
    const result = bgm.play();
    if (result?.then) return playPending = result.then(() => { started = true; }).catch(() => { started = false; }).finally(() => { playPending = null; });
    started = true; return Promise.resolve();
  }
  function unlock() {
    if (unlocked && !bgm.paused) return;
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
  // Fade the music down gently while choosing upgrades, then restore combat
  // volume without pausing, restarting, or seeking in the underlying audio.
  let lastTime = performance.now();
  setInterval(() => {
    const now = performance.now();
    const delta = Math.min((now - lastTime) / 1000, .4);
    lastTime = now;
    const target = bgmEnabled && globalSoundOn() && !document.hidden ? gameMusicVolume() : 0;
    const step = delta * .3;
    const v = Math.max(0, Math.min(1, bgm.volume + Math.max(-step, Math.min(step, target - bgm.volume))));
    if (Math.abs(bgm.volume-v)>.0001) bgm.volume = v;
    if (target>0 && unlocked && (!started || bgm.paused)) void beginPlayback();
  }, 180);
  window.__revenantBgm = {
    prepare, beginPlayback,
    getState: () => ({ ready, loading: !!preparing, enabled: bgmEnabled, playing: !bgm.paused, volume: bgm.volume, source: bgm.currentSrc || bgm.src, fallbackTried }),
    toggle: () => button.click()
  };
  void prepare().catch(() => {});
})();
