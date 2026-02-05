import type { RecurrenceRule } from '../../types';
import styles from './RecurrenceSelector.module.css';

interface RecurrenceSelectorProps {
  value: RecurrenceRule | null;
  onChange: (rule: RecurrenceRule | null) => void;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function RecurrenceSelector({ value, onChange }: RecurrenceSelectorProps) {
  const type = value?.type ?? 'none';

  const handleTypeChange = (newType: string) => {
    if (newType === 'none') {
      onChange(null);
      return;
    }

    const baseRule: RecurrenceRule = {
      type: newType as 'daily' | 'weekly' | 'monthly',
      interval: 1,
    };

    if (newType === 'weekly') {
      baseRule.daysOfWeek = [new Date().getDay()];
    } else if (newType === 'monthly') {
      baseRule.dayOfMonth = new Date().getDate();
    }

    onChange(baseRule);
  };

  const handleIntervalChange = (interval: number) => {
    if (!value) return;
    onChange({ ...value, interval: Math.max(1, interval) });
  };

  const handleDayToggle = (day: number) => {
    if (!value || value.type !== 'weekly') return;

    const currentDays = value.daysOfWeek || [];
    const newDays = currentDays.includes(day)
      ? currentDays.filter(d => d !== day)
      : [...currentDays, day].sort();

    if (newDays.length === 0) {
      newDays.push(day);
    }

    onChange({ ...value, daysOfWeek: newDays });
  };

  const handleDayOfMonthChange = (day: number) => {
    if (!value || value.type !== 'monthly') return;
    onChange({ ...value, dayOfMonth: Math.min(28, Math.max(1, day)) });
  };

  return (
    <div className={styles.container}>
      <div className={styles.typeSelector}>
        <label className={styles.label}>Repeat</label>
        <select
          value={type}
          onChange={e => handleTypeChange(e.target.value)}
          className={styles.select}
        >
          <option value="none">Does not repeat</option>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
        </select>
      </div>

      {value && (
        <>
          <div className={styles.intervalRow}>
            <span className={styles.intervalLabel}>Every</span>
            <input
              type="number"
              min="1"
              value={value.interval}
              onChange={e => handleIntervalChange(parseInt(e.target.value) || 1)}
              className={styles.intervalInput}
            />
            <span className={styles.intervalLabel}>
              {value.type === 'daily' && (value.interval === 1 ? 'day' : 'days')}
              {value.type === 'weekly' && (value.interval === 1 ? 'week' : 'weeks')}
              {value.type === 'monthly' && (value.interval === 1 ? 'month' : 'months')}
            </span>
          </div>

          {value.type === 'weekly' && (
            <div className={styles.daysSelector}>
              <label className={styles.label}>On days</label>
              <div className={styles.daysGrid}>
                {DAY_NAMES.map((name, index) => (
                  <button
                    key={name}
                    type="button"
                    className={`${styles.dayButton} ${
                      value.daysOfWeek?.includes(index) ? styles.daySelected : ''
                    }`}
                    onClick={() => handleDayToggle(index)}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {value.type === 'monthly' && (
            <div className={styles.dayOfMonthSelector}>
              <label className={styles.label}>On day</label>
              <input
                type="number"
                min="1"
                max="28"
                value={value.dayOfMonth || 1}
                onChange={e => handleDayOfMonthChange(parseInt(e.target.value) || 1)}
                className={styles.intervalInput}
              />
              <span className={styles.hint}>of the month</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
