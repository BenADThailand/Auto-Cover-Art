import { useState, useEffect, useCallback } from 'react';
import { CalendarView } from './components/calendar/CalendarView';
import { ChoreForm } from './components/chores/ChoreForm';
import { TeamList } from './components/team/TeamList';
import { CategoryList } from './components/categories/CategoryList';
import { useChores } from './hooks/useChores';
import { useTeamMembers } from './hooks/useTeamMembers';
import { useCategories } from './hooks/useCategories';
import { initStorage } from './services/storage';
import type { Chore, ChoreInstance } from './types';
import styles from './App.module.css';

function App() {
  const [initialized, setInitialized] = useState(false);
  const [showChoreForm, setShowChoreForm] = useState(false);
  const [editingChore, setEditingChore] = useState<Chore | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [sidebarTab, setSidebarTab] = useState<'team' | 'categories'>('team');

  const {
    chores,
    loading: choresLoading,
    addChore,
    updateChore,
    removeChore,
    toggleCompletion,
    getInstances,
    getChoreById,
  } = useChores();

  const {
    teamMembers,
    loading: membersLoading,
    addMember,
    updateMember,
    removeMember,
  } = useTeamMembers();

  const {
    categories,
    loading: categoriesLoading,
    addCategory,
    updateCategory,
    removeCategory,
  } = useCategories();

  useEffect(() => {
    initStorage().then(() => setInitialized(true));
  }, []);

  const handleSelectSlot = useCallback((date: Date) => {
    setSelectedDate(date);
    setEditingChore(null);
    setShowChoreForm(true);
  }, []);

  const handleSelectEvent = useCallback(
    (instance: ChoreInstance) => {
      const chore = getChoreById(instance.choreId);
      if (chore) {
        setEditingChore(chore);
        setSelectedDate(undefined);
        setShowChoreForm(true);
      }
    },
    [getChoreById]
  );

  const handleToggleCompletion = useCallback(
    (choreId: string, date: Date, completedBy: string) => {
      toggleCompletion(choreId, date, completedBy);
    },
    [toggleCompletion]
  );

  const handleSaveChore = useCallback(
    async (choreData: Omit<Chore, 'id'>) => {
      await addChore(choreData);
    },
    [addChore]
  );

  const handleUpdateChore = useCallback(
    async (chore: Chore) => {
      await updateChore(chore);
    },
    [updateChore]
  );

  const handleDeleteChore = useCallback(
    async (id: string) => {
      await removeChore(id);
    },
    [removeChore]
  );

  const isLoading = !initialized || choresLoading || membersLoading || categoriesLoading;

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <h1 className={styles.title}>Office Chores</h1>
        <button
          className={styles.addButton}
          onClick={() => {
            setEditingChore(null);
            setSelectedDate(new Date());
            setShowChoreForm(true);
          }}
        >
          + Add Chore
        </button>
      </header>

      <main className={styles.main}>
        <div className={styles.calendarContainer}>
          <CalendarView
            getInstances={getInstances}
            categories={categories}
            teamMembers={teamMembers}
            onSelectSlot={handleSelectSlot}
            onSelectEvent={handleSelectEvent}
            onToggleCompletion={handleToggleCompletion}
          />
        </div>

        <aside className={styles.sidebar}>
          <div className={styles.tabs}>
            <button
              className={`${styles.tab} ${sidebarTab === 'team' ? styles.activeTab : ''}`}
              onClick={() => setSidebarTab('team')}
            >
              Team
            </button>
            <button
              className={`${styles.tab} ${sidebarTab === 'categories' ? styles.activeTab : ''}`}
              onClick={() => setSidebarTab('categories')}
            >
              Categories
            </button>
          </div>

          {sidebarTab === 'team' ? (
            <TeamList
              teamMembers={teamMembers}
              onAdd={addMember}
              onUpdate={updateMember}
              onRemove={removeMember}
            />
          ) : (
            <CategoryList
              categories={categories}
              onAdd={addCategory}
              onUpdate={updateCategory}
              onRemove={removeCategory}
            />
          )}

          <div className={styles.stats}>
            <div className={styles.stat}>
              <span className={styles.statValue}>{chores.length}</span>
              <span className={styles.statLabel}>Chores</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statValue}>{teamMembers.length}</span>
              <span className={styles.statLabel}>Members</span>
            </div>
          </div>
        </aside>
      </main>

      <ChoreForm
        isOpen={showChoreForm}
        onClose={() => setShowChoreForm(false)}
        onSave={handleSaveChore}
        onUpdate={handleUpdateChore}
        onDelete={handleDeleteChore}
        categories={categories}
        teamMembers={teamMembers}
        editingChore={editingChore}
        defaultDate={selectedDate}
      />
    </div>
  );
}

export default App;
