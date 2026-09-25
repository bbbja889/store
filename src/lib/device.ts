export type Tier = 0 | 1 | 2 | 3;

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
}

export function isMobile(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && window.innerWidth < 900);
}

/** Rough GPU tier from the WebGL renderer string, memory and core count. 0 = no usable WebGL. */
export function detectTier(): { tier: Tier; renderer: string } {
  let renderer = 'unknown';
  try {
    const params = new URLSearchParams(window.location.search);
    const forced = params.get('tier');
    const canvas = document.createElement('canvas');
    const gl = (canvas.getContext('webgl2') || canvas.getContext('webgl')) as WebGLRenderingContext | null;
    if (!gl) return { tier: 0, renderer: 'none' };
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    renderer = String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    if (forced && /^[0-3]$/.test(forced)) return { tier: Number(forced) as Tier, renderer };
    const software = /swiftshader|llvmpipe|software|basic render/i.test(renderer);
    const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
    const cores = navigator.hardwareConcurrency ?? 4;
    if (software) return { tier: 1, renderer };
    if (isMobile()) {
      const strong = /adreno \(tm\) (7|8)\d\d|apple gpu|mali-g(7|9)\d|immortalis/i.test(renderer) && mem >= 6;
      return { tier: strong ? 2 : 1, renderer };
    }
    if (mem <= 4 || cores <= 4) return { tier: 2, renderer };
    return { tier: 3, renderer };
  } catch {
    return { tier: 0, renderer };
  }
}
