// A tap on the drum. Dragging is handled elsewhere and never reaches this.
// When idle, the first tap uses the same automatic-batch path as the start button.
export function sceneTapAction({ drawing, blocked }) {
  if (blocked) return 'ignore';
  if (drawing) return 'skip';
  return 'draw';
}
