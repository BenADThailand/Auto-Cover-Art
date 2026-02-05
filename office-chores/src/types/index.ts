export interface TeamMember {
  id: string;
  name: string;
  color: string;
}

export interface Category {
  id: string;
  name: string;
  color: string;
}

export interface RecurrenceRule {
  type: 'daily' | 'weekly' | 'monthly';
  interval: number;
  daysOfWeek?: number[];
  dayOfMonth?: number;
}

export interface Chore {
  id: string;
  title: string;
  description?: string;
  categoryId: string;
  assignedMemberIds: string[];
  recurrence: RecurrenceRule | null;
  startDate: string;
  endDate?: string;
}

export interface ChoreCompletion {
  id: string;
  choreId: string;
  date: string;
  completedBy: string;
  completedAt: string;
}

export interface ChoreInstance {
  id: string;
  choreId: string;
  title: string;
  description?: string;
  categoryId: string;
  assignedMemberIds: string[];
  date: Date;
  isCompleted: boolean;
  completedBy?: string;
}

export interface AppData {
  teamMembers: TeamMember[];
  categories: Category[];
  chores: Chore[];
  completions: ChoreCompletion[];
}
