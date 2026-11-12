export function shouldShowStageActions({ drawActive = false, immersive = false, compactViewport = false } = {}) {
  return Boolean(immersive || (drawActive && compactViewport));
}

export function fullscreenButtonState(active) {
  return active
    ? { text: '退出全螢幕', ariaLabel: '退出全螢幕或沉浸模式', pressed: 'true' }
    : { text: '全螢幕', ariaLabel: '進入全螢幕', pressed: 'false' };
}
