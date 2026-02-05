import { useState, useCallback, useMemo } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import type { View, SlotInfo } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, startOfMonth, endOfMonth, addMonths, startOfDay } from 'date-fns';
import { enUS } from 'date-fns/locale';
import type { ChoreInstance, Category, TeamMember } from '../../types';
import { ChoreEvent } from './ChoreEvent';
import { Button } from '../ui/Button';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import styles from './CalendarView.module.css';

const locales = { 'en-US': enUS };

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: ChoreInstance;
}

interface CalendarViewProps {
  getInstances: (start: Date, end: Date) => ChoreInstance[];
  categories: Category[];
  teamMembers: TeamMember[];
  onSelectSlot: (date: Date) => void;
  onSelectEvent: (instance: ChoreInstance) => void;
  onToggleCompletion: (choreId: string, date: Date, completedBy: string) => void;
}

export function CalendarView({
  getInstances,
  categories,
  teamMembers,
  onSelectSlot,
  onSelectEvent,
  onToggleCompletion,
}: CalendarViewProps) {
  const [view, setView] = useState<View>('month');
  const [date, setDate] = useState(new Date());

  const { rangeStart, rangeEnd } = useMemo(() => {
    const monthStart = startOfMonth(date);
    const monthEnd = endOfMonth(date);
    return {
      rangeStart: addMonths(monthStart, -1),
      rangeEnd: addMonths(monthEnd, 1),
    };
  }, [date]);

  const events: CalendarEvent[] = useMemo(() => {
    const instances = getInstances(rangeStart, rangeEnd);
    return instances.map(instance => ({
      id: instance.id,
      title: instance.title,
      start: startOfDay(instance.date),
      end: startOfDay(instance.date),
      resource: instance,
    }));
  }, [getInstances, rangeStart, rangeEnd]);

  const handleSelectSlot = useCallback(
    (slotInfo: SlotInfo) => {
      onSelectSlot(slotInfo.start);
    },
    [onSelectSlot]
  );

  const handleSelectEvent = useCallback(
    (event: CalendarEvent) => {
      onSelectEvent(event.resource);
    },
    [onSelectEvent]
  );

  const handleDoubleClickEvent = useCallback(
    (event: CalendarEvent) => {
      const instance = event.resource;
      const defaultMember = teamMembers[0]?.id || 'unknown';
      onToggleCompletion(instance.choreId, instance.date, defaultMember);
    },
    [onToggleCompletion, teamMembers]
  );

  const eventStyleGetter = useCallback(
    (event: CalendarEvent) => {
      const category = categories.find(c => c.id === event.resource.categoryId);
      return {
        style: {
          backgroundColor: category?.color ? `${category.color}20` : '#f3f4f6',
          borderColor: category?.color || '#6b7280',
        },
      };
    },
    [categories]
  );

  const components = useMemo(
    () => ({
      event: (props: { event: CalendarEvent }) => (
        <ChoreEvent event={{ resource: props.event.resource }} categories={categories} teamMembers={teamMembers} />
      ),
    }),
    [categories, teamMembers]
  );

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <div className={styles.navigation}>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setDate(new Date())}
          >
            Today
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setDate(d => addMonths(d, -1))}
          >
            &lt;
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setDate(d => addMonths(d, 1))}
          >
            &gt;
          </Button>
          <span className={styles.dateLabel}>
            {format(date, 'MMMM yyyy')}
          </span>
        </div>
        <div className={styles.viewSelector}>
          <Button
            size="sm"
            variant={view === 'month' ? 'primary' : 'secondary'}
            onClick={() => setView('month')}
          >
            Month
          </Button>
          <Button
            size="sm"
            variant={view === 'week' ? 'primary' : 'secondary'}
            onClick={() => setView('week')}
          >
            Week
          </Button>
        </div>
      </div>

      <div className={styles.calendarWrapper}>
        <Calendar<CalendarEvent>
          localizer={localizer}
          events={events}
          view={view}
          date={date}
          onView={setView}
          onNavigate={setDate}
          selectable
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleSelectEvent}
          onDoubleClickEvent={handleDoubleClickEvent}
          eventPropGetter={eventStyleGetter}
          components={components}
          popup
          toolbar={false}
          startAccessor="start"
          endAccessor="end"
        />
      </div>

      <div className={styles.hint}>
        Click a date to add a chore. Click a chore to edit. Double-click to mark complete.
      </div>
    </div>
  );
}
