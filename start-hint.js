export const START_HINT_KEY = 'golden-draw-started-once';
export const START_HINT_LABEL = '輕觸圓鼓開機';

export function shouldShowStartHint(stored) {
  return stored !== '1';
}

export function startHintStoredValue() {
  return '1';
}
