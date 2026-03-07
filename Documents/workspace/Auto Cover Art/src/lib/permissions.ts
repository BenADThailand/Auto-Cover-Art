import type { User, FieldChange } from '../types';

interface OwnableItem {
  createdBy?: string;
  uploadedBy?: string;
}

export function isAdmin(user: User | null): boolean {
  return user?.role === 'ADMIN';
}

export function canEdit(user: User | null, item: OwnableItem): boolean {
  if (!user) return false;
  if (user.role === 'ADMIN') return true;
  return item.createdBy === user.id || item.uploadedBy === user.id;
}

export function canDelete(user: User | null, item: OwnableItem): boolean {
  return canEdit(user, item);
}

const SKIP_FIELDS = new Set(['editHistory', 'updatedAt', 'id']);

export function computeDiff(
  oldObj: Record<string, unknown>,
  newObj: Record<string, unknown>
): FieldChange[] {
  const changes: FieldChange[] = [];
  const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);

  for (const key of allKeys) {
    if (SKIP_FIELDS.has(key)) continue;
    const oldVal = oldObj[key];
    const newVal = newObj[key];
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      changes.push({ field: key, oldValue: oldVal, newValue: newVal });
    }
  }

  return changes;
}
