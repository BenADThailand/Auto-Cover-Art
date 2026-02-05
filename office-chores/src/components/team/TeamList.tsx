import { useState } from 'react';
import type { TeamMember } from '../../types';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import styles from './TeamList.module.css';

interface TeamListProps {
  teamMembers: TeamMember[];
  onAdd: (name: string, color: string) => Promise<void>;
  onUpdate: (member: TeamMember) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
}

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16',
  '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6',
  '#6366f1', '#8b5cf6', '#a855f7', '#ec4899',
];

export function TeamList({ teamMembers, onAdd, onUpdate, onRemove }: TeamListProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);

  const openAddModal = () => {
    setEditingMember(null);
    setName('');
    setColor(PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)]);
    setIsModalOpen(true);
  };

  const openEditModal = (member: TeamMember) => {
    setEditingMember(member);
    setName(member.name);
    setColor(member.color);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingMember) {
      await onUpdate({ ...editingMember, name: name.trim(), color });
    } else {
      await onAdd(name.trim(), color);
    }

    setIsModalOpen(false);
  };

  const handleDelete = async () => {
    if (editingMember && confirm('Are you sure you want to remove this team member?')) {
      await onRemove(editingMember.id);
      setIsModalOpen(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>Team Members</h3>
        <Button size="sm" onClick={openAddModal}>
          + Add Member
        </Button>
      </div>

      <div className={styles.list}>
        {teamMembers.length === 0 ? (
          <p className={styles.empty}>No team members yet. Add one to get started!</p>
        ) : (
          teamMembers.map(member => (
            <div
              key={member.id}
              className={styles.member}
              onClick={() => openEditModal(member)}
            >
              <div
                className={styles.avatar}
                style={{ backgroundColor: member.color }}
              >
                {member.name.charAt(0).toUpperCase()}
              </div>
              <span className={styles.name}>{member.name}</span>
            </div>
          ))
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingMember ? 'Edit Team Member' : 'Add Team Member'}
      >
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="memberName" className={styles.label}>
              Name
            </label>
            <input
              id="memberName"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className={styles.input}
              placeholder="Enter name"
              autoFocus
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Color</label>
            <div className={styles.colorGrid}>
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  className={`${styles.colorOption} ${color === c ? styles.colorSelected : ''}`}
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>

          <div className={styles.actions}>
            {editingMember && (
              <Button type="button" variant="danger" onClick={handleDelete}>
                Delete
              </Button>
            )}
            <div className={styles.spacer} />
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim()}>
              {editingMember ? 'Save' : 'Add'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
