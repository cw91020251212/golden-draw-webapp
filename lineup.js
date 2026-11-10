// Final reveal, copied from the 2008 TVB Mark Six card (第61期):
// the six regular numbers sit in one flat horizontal row, sorted small to
// large, and the special number sits centred underneath them on its own.

export const LINEUP_GAP = 0.36;
export const LINEUP_DROP = 0.62;

export function lineupSlots(mainNumbers, specialNumber, center) {
  const sorted = [...mainNumbers].sort((a, b) => a - b);
  const row = sorted.map((n, i) => ({
    n,
    position: [
      center[0] + (i - (sorted.length - 1) / 2) * LINEUP_GAP,
      center[1],
      center[2]
    ]
  }));
  return {
    row,
    extra: {
      n: specialNumber,
      position: [center[0], center[1] - LINEUP_DROP, center[2]]
    }
  };
}
