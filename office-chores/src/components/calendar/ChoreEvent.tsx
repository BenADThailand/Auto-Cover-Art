import type { ChoreInstance, Category, TeamMember } from '../../types';
import styles from './ChoreEvent.module.css';

interface ChoreEventProps {
  event: {
    resource: ChoreInstance;
  };
  categories: Category[];
  teamMembers: TeamMember[];
}

export function ChoreEvent({ event, categories, teamMembers }: ChoreEventProps) {
  const instance = event.resource;
  const category = categories.find(c => c.id === instance.categoryId);
  const assignedMembers = teamMembers.filter(m =>
    instance.assignedMemberIds.includes(m.id)
  );

  return (
    <div
      className={`${styles.event} ${instance.isCompleted ? styles.completed : ''}`}
      style={{
        borderLeftColor: category?.color || '#6b7280',
      }}
    >
      <div className={styles.title}>{instance.title}</div>
      {assignedMembers.length > 0 && (
        <div className={styles.assignees}>
          {assignedMembers.map(member => (
            <div
              key={member.id}
              className={styles.assignee}
              style={{ backgroundColor: member.color }}
              title={member.name}
            >
              {member.name.charAt(0)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
