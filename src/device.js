// ============================================================
// Device detection — decides control scheme & quality hints.
// ============================================================

export function detectDevice() {
  const nav = navigator;
  const hasTouch = ('ontouchstart' in window) || nav.maxTouchPoints > 0;
  const coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  const ua = (nav.userAgent || '').toLowerCase();
  const uaMobile = /android|iphone|ipad|ipod|opera mini|iemobile|mobile|blackberry/.test(ua);

  // Treat as touch-primary if it has touch AND (coarse pointer or mobile UA).
  const isTouch = hasTouch && (coarse || uaMobile);

  const isSmall = Math.min(window.innerWidth, window.innerHeight) < 560;

  // Rough device-tier for quality scaling.
  const cores = nav.hardwareConcurrency || 4;
  const lowPower = isTouch || cores <= 4;

  const dpr = Math.min(window.devicePixelRatio || 1, lowPower ? 2 : 2.5);

  return {
    isTouch,
    isMobileUA: uaMobile,
    isSmall,
    lowPower,
    dpr,
    // shadow + fog density hints
    shadows: !lowPower,
    label: isTouch ? 'Touch device detected — on-screen joystick & buttons enabled.'
                   : 'Desktop detected — keyboard & mouse controls enabled.',
  };
}
