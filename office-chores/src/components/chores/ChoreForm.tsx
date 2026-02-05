import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import type { Chore, Category, TeamMember, RecurrenceRule } from '../../types';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { MemberSelector } from '../team/MemberSelector';
import { RecurrenceSelector } from './RecurrenceSelector';
import styles from './ChoreForm.module.css';

interface ChoreFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (chore: Omit<Chore, 'id'>) => Promise<void>;
  onUpdate: (chore: Chore) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  categories: Category[];
  teamMembers: TeamMember[];
  editingChore?: Chore | null;
  defaultDate?: Date;
}

export function ChoreForm({
  isOpen,
  onClose,
  onSave,
  onUpdate,
  onDelete,
  categories,
  teamMembers,
  editingChore,
  defaultDate,
}: ChoreFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [assignedMemberIds, setAssignedMemberIds] = useState<string[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [recurrence, setRecurrence] = useState<RecurrenceRule | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (editingChore) {
        setTitle(editingChore.title);
        setDescription(editingChore.description || '');
        setCategoryId(editingChore.categoryId);
        setAssignedMemberIds(editingChore.assignedMemberIds);
        setStartDate(editingChore.startDate);
        setEndDate(editingChore.endDate || '');
        setRecurrence(editingChore.recurrence);
      } else {
        setTitle('');
        setDescription('');
        setCategoryId(categories[0]?.id || '');
        setAssignedMemberIds([]);
        setStartDate(defaultDate ? format(defaultDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'));
        setEndDate('');
        setRecurrence(null);
      }
    }
  }, [isOpen, editingChore, categories, defaultDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !categoryId) return;

    const choreData = {
      title: title.trim(),
      description: description.trim() || undefined,
      categoryId,
      assignedMemberIds,
      startDate,
      endDate: endDate || undefined,
      recurrence,
    };

    if (editingChore) {
      await onUpdate({ ...choreData, id: editingChore.id });
    } else {
      await onSave(choreData);
    }

    onClose();
  };

  const handleDelete = async () => {
    if (editingChore && confirm('Are you sure you want to delete this chore?')) {
      await onDelete(editingChore.id);
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingChore ? 'Edit Chore' : 'Add Chore'}
    >
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.field}>
          <label htmlFor="choreTitle" className={styles.label}>
            Title *
          </label>
          <input
            id="choreTitle"
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className={styles.input}
            placeholder="e.g., Clean kitchen sink"
            autoFocus
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="choreDescription" className={styles.label}>
            Description
          </label>
          <textarea
            id="choreDescription"
            value={description}
            onChange={e => setDescription(e.target.value)}
            className={styles.textarea}
            placeholder="Add details (optional)"
            rows={2}
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="choreCategory" className={styles.label}>
            Category *
          </label>
          <select
            id="choreCategory"
            value={categoryId}
            onChange={e => setCategoryId(e.target.value)}
            className={styles.select}
          >
            {categories.length === 0 && (
              <option value="">No categories available</option>
            )}
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Assigned To</label>
          <MemberSelector
            teamMembers={teamMembers}
            selectedIds={assignedMemberIds}
            onChange={setAssignedMemberIds}
          />
        </div>

        <div className={styles.row}>
          <div className={styles.field}>
            <label htmlFor="choreStartDate" className={styles.label}>
              Start Date *
            </label>
            <input
              id="choreStartDate"
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className={styles.input}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="choreEndDate" className={styles.label}>
              End Date
            </label>
            <input
              id="choreEndDate"
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className={styles.input}
              min={startDate}
            />
          </div>
        </div>

        <div className={styles.field}>
          <RecurrenceSelector value={recurrence} onChange={setRecurrence} />
        </div>

        <div className={styles.actions}>
          {editingChore && (
            <Button type="button" variant="danger" onClick={handleDelete}>
              Delete
            </Button>
          )}
          <div className={styles.spacer} />
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={!title.trim() || !categoryId}>
            {editingChore ? 'Save' : 'Add Chore'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
