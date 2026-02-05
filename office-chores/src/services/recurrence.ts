import {
  addDays,
  addWeeks,
  addMonths,
  startOfDay,
  isBefore,
  isAfter,
  isSameDay,
  getDay,
  setDate,
  format,
} from 'date-fns';
import type { Chore, ChoreCompletion, ChoreInstance, RecurrenceRule } from '../types';

function getNextOccurrence(
  currentDate: Date,
  rule: RecurrenceRule,
  startDate: Date
): Date | null {
  switch (rule.type) {
    case 'daily':
      return addDays(currentDate, rule.interval);

    case 'weekly': {
      if (!rule.daysOfWeek || rule.daysOfWeek.length === 0) {
        return addWeeks(currentDate, rule.interval);
      }

      let nextDate = addDays(currentDate, 1);
      const sortedDays = [...rule.daysOfWeek].sort((a, b) => a - b);

      for (let i = 0; i < 7 * rule.interval + 7; i++) {
        const dayOfWeek = getDay(nextDate);
        if (sortedDays.includes(dayOfWeek)) {
          return nextDate;
        }
        nextDate = addDays(nextDate, 1);
      }
      return null;
    }

    case 'monthly': {
      const dayOfMonth = rule.dayOfMonth || startDate.getDate();
      let nextDate = addMonths(currentDate, rule.interval);
      nextDate = setDate(nextDate, Math.min(dayOfMonth, 28));
      return nextDate;
    }

    default:
      return null;
  }
}

export function generateChoreInstances(
  chores: Chore[],
  completions: ChoreCompletion[],
  rangeStart: Date,
  rangeEnd: Date
): ChoreInstance[] {
  const instances: ChoreInstance[] = [];
  const rangeStartDay = startOfDay(rangeStart);
  const rangeEndDay = startOfDay(rangeEnd);

  for (const chore of chores) {
    const choreStart = startOfDay(new Date(chore.startDate));
    const choreEnd = chore.endDate ? startOfDay(new Date(chore.endDate)) : null;

    if (choreEnd && isBefore(choreEnd, rangeStartDay)) {
      continue;
    }

    if (isAfter(choreStart, rangeEndDay)) {
      continue;
    }

    if (!chore.recurrence) {
      if (
        (isSameDay(choreStart, rangeStartDay) || isAfter(choreStart, rangeStartDay)) &&
        (isSameDay(choreStart, rangeEndDay) || isBefore(choreStart, rangeEndDay))
      ) {
        const dateStr = format(choreStart, 'yyyy-MM-dd');
        const completion = completions.find(
          c => c.choreId === chore.id && c.date === dateStr
        );

        instances.push({
          id: `${chore.id}-${dateStr}`,
          choreId: chore.id,
          title: chore.title,
          description: chore.description,
          categoryId: chore.categoryId,
          assignedMemberIds: chore.assignedMemberIds,
          date: choreStart,
          isCompleted: !!completion,
          completedBy: completion?.completedBy,
        });
      }
      continue;
    }

    let currentDate = choreStart;
    const effectiveStart = isBefore(choreStart, rangeStartDay) ? rangeStartDay : choreStart;

    while (isBefore(currentDate, effectiveStart) && !isSameDay(currentDate, effectiveStart)) {
      const next = getNextOccurrence(currentDate, chore.recurrence, choreStart);
      if (!next || isAfter(next, rangeEndDay)) break;
      currentDate = next;
    }

    if (isBefore(currentDate, rangeStartDay))  {
      currentDate = choreStart;
      let iterCount = 0;
      while (isBefore(currentDate, rangeStartDay) && iterCount < 1000) {
        const next = getNextOccurrence(currentDate, chore.recurrence, choreStart);
        if (!next) break;
        if (isSameDay(next, rangeStartDay) || isAfter(next, rangeStartDay)) {
          currentDate = next;
          break;
        }
        currentDate = next;
        iterCount++;
      }
    }

    let iterCount = 0;
    while (
      (isSameDay(currentDate, rangeEndDay) || isBefore(currentDate, rangeEndDay)) &&
      iterCount < 366
    ) {
      if (
        (isSameDay(currentDate, rangeStartDay) || isAfter(currentDate, rangeStartDay)) &&
        (isSameDay(currentDate, choreStart) || isAfter(currentDate, choreStart))
      ) {
        if (!choreEnd || isSameDay(currentDate, choreEnd) || isBefore(currentDate, choreEnd)) {
          const dateStr = format(currentDate, 'yyyy-MM-dd');
          const completion = completions.find(
            c => c.choreId === chore.id && c.date === dateStr
          );

          instances.push({
            id: `${chore.id}-${dateStr}`,
            choreId: chore.id,
            title: chore.title,
            description: chore.description,
            categoryId: chore.categoryId,
            assignedMemberIds: chore.assignedMemberIds,
            date: new Date(currentDate),
            isCompleted: !!completion,
            completedBy: completion?.completedBy,
          });
        }
      }

      const next = getNextOccurrence(currentDate, chore.recurrence, choreStart);
      if (!next) break;
      currentDate = next;
      iterCount++;
    }
  }

  return instances.sort((a, b) => a.date.getTime() - b.date.getTime());
}

export function formatRecurrenceRule(rule: RecurrenceRule | null): string {
  if (!rule) return 'One-time';

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  switch (rule.type) {
    case 'daily':
      return rule.interval === 1 ? 'Daily' : `Every ${rule.interval} days`;

    case 'weekly':
      if (rule.daysOfWeek && rule.daysOfWeek.length > 0) {
        const days = rule.daysOfWeek.map(d => dayNames[d]).join(', ');
        return rule.interval === 1
          ? `Weekly on ${days}`
          : `Every ${rule.interval} weeks on ${days}`;
      }
      return rule.interval === 1 ? 'Weekly' : `Every ${rule.interval} weeks`;

    case 'monthly':
      const dayText = rule.dayOfMonth ? `on day ${rule.dayOfMonth}` : '';
      return rule.interval === 1
        ? `Monthly ${dayText}`
        : `Every ${rule.interval} months ${dayText}`;

    default:
      return 'Custom';
  }
}
