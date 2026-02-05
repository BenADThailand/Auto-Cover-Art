import type { TeamMember } from '../../types';
import styles from './MemberSelector.module.css';

interface MemberSelectorProps {
  teamMembers: TeamMember[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

export function MemberSelector({ teamMembers, selectedIds, onChange }: MemberSelectorProps) {
  const toggleMember = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter(i => i !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  if (teamMembers.length === 0) {
    return (
      <p className={styles.empty}>
        No team members available. Add team members first.
      </p>
    );
  }

  return (
    <div className={styles.container}>
      {teamMembers.map(member => (
        <button
          key={member.id}
          type="button"
          className={`${styles.member} ${
            selectedIds.includes(member.id) ? styles.selected : ''
          }`}
          onClick={() => toggleMember(member.id)}
        >
          <div
            className={styles.avatar}
            style={{ backgroundColor: member.color }}
          >
            {member.name.charAt(0).toUpperCase()}
          </div>
          <span className={styles.name}>{member.name}</span>
          {selectedIds.includes(member.id) && (
            <span className={styles.check}>✓</span>
          )}
        </button>
      ))}
    </div>
  );
}
