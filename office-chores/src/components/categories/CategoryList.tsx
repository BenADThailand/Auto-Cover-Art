import { useState } from 'react';
import type { Category } from '../../types';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import styles from './CategoryList.module.css';

interface CategoryListProps {
  categories: Category[];
  onAdd: (name: string, color: string) => Promise<void>;
  onUpdate: (category: Category) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
}

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16',
  '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6',
  '#6366f1', '#8b5cf6', '#a855f7', '#ec4899',
];

export function CategoryList({ categories, onAdd, onUpdate, onRemove }: CategoryListProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);

  const openAddModal = () => {
    setEditingCategory(null);
    setName('');
    setColor(PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)]);
    setIsModalOpen(true);
  };

  const openEditModal = (category: Category) => {
    setEditingCategory(category);
    setName(category.name);
    setColor(category.color);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingCategory) {
      await onUpdate({ ...editingCategory, name: name.trim(), color });
    } else {
      await onAdd(name.trim(), color);
    }

    setIsModalOpen(false);
  };

  const handleDelete = async () => {
    if (editingCategory && confirm('Are you sure you want to remove this category?')) {
      await onRemove(editingCategory.id);
      setIsModalOpen(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>Categories</h3>
        <Button size="sm" onClick={openAddModal}>
          + Add Category
        </Button>
      </div>

      <div className={styles.list}>
        {categories.length === 0 ? (
          <p className={styles.empty}>No categories yet. Add one to get started!</p>
        ) : (
          categories.map(category => (
            <div
              key={category.id}
              className={styles.category}
              onClick={() => openEditModal(category)}
            >
              <div
                className={styles.colorDot}
                style={{ backgroundColor: category.color }}
              />
              <span className={styles.name}>{category.name}</span>
            </div>
          ))
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCategory ? 'Edit Category' : 'Add Category'}
      >
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="categoryName" className={styles.label}>
              Name
            </label>
            <input
              id="categoryName"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className={styles.input}
              placeholder="Enter category name"
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
            {editingCategory && (
              <Button type="button" variant="danger" onClick={handleDelete}>
                Delete
              </Button>
            )}
            <div className={styles.spacer} />
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim()}>
              {editingCategory ? 'Save' : 'Add'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
