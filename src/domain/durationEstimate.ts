export interface DurationParts {
  hours: number;
  minutes: number;
}

export function durationPartsToDecimalHours(hours: number, minutes: number): number {
  return Math.round((hours + minutes / 60) * 100) / 100;
}

export function decimalHoursToDurationParts(duration: number): DurationParts {
  let hours = Math.floor(duration);
  let minutes = Math.round((duration - hours) * 60);

  if (minutes === 60) {
    hours += 1;
    minutes = 0;
  }

  return { hours, minutes };
}

export function resolveDurationForSave(
  originalDuration: number | undefined,
  editedDuration: number | null,
): number {
  return editedDuration ?? originalDuration ?? 0;
}
