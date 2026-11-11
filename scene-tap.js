// A tap on the drum. Dragging is handled elsewhere and never reaches this.
export function sceneTapAction({ machineOn, drawing, blocked }) {
  if (blocked) return 'ignore';
  if (drawing) return 'skip';
  if (!machineOn) return 'power';
  return 'draw';
}
