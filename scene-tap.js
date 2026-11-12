// A tap on the drum. Dragging is handled elsewhere and never reaches this.
// When idle it starts the batch; during mixing it skips a wait; during the final reveal it advances.
export function sceneTapAction({ drawing, revealing, blocked }) {
  if (blocked) return 'ignore';
  if (revealing) return 'advance';
  if (drawing) return 'skip';
  return 'draw';
}
