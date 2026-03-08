import { useState, useRef } from 'react';
import ImageUploader from './ImageUploader';
import ProjectSelector from './ProjectSelector';
import KeywordLayers from './KeywordLayers';
import CanvasPreview from './CanvasPreview';
import PostContentFields from './PostContentFields';
import MenuBar from './MenuBar';
import { useUser } from '../contexts/UserContext';
import { canEdit } from '../lib/permissions';
import { DEFAULT_MENU_SLOT, DEFAULT_POST_CONTENT } from '../types';
import type { Project, Menu, MenuSlot, Report, CanvasSize, PostContent, Language, SharedAsset } from '../types';

interface Props {
  projects: Project[];
  menus: Menu[];
  fetchReport: (projectId: string) => Promise<Report | null>;
  onSaveMenu: (
    name: string,
    slots: MenuSlot[],
    contentPrompt: string,
    subjectLineLimit?: number,
    hashtagCount?: number,
    language?: Language
  ) => Promise<string>;
  onUpdateMenu: (
    id: string,
    updates: { name?: string; slots?: MenuSlot[]; contentPrompt?: string; subjectLineLimit?: number; hashtagCount?: number; language?: Language }
  ) => Promise<void>;
  onDeleteMenu: (id: string) => Promise<void>;
  sharedAssets?: SharedAsset[];
  onOpenAssetPicker?: (layerId: number) => void;
}

export default function MenuEditor({
  projects,
  menus,
  onSaveMenu,
  onUpdateMenu,
  onDeleteMenu,
  sharedAssets,
  onOpenAssetPicker,
}: Props) {
  const user = useUser();

  // Menu metadata
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [menuName, setMenuName] = useState('');

  // Slots
  const [slots, setSlots] = useState<MenuSlot[]>([
    JSON.parse(JSON.stringify(DEFAULT_MENU_SLOT)),
  ]);
  const [activeSlotIndex, setActiveSlotIndex] = useState(0);

  // Test photos per slot (not persisted)
  const [testPhotos, setTestPhotos] = useState<Map<number, { dataUrl: string; mimeType: string }>>(new Map());

  // Shared content settings
  const [contentPrompt, setContentPrompt] = useState('');
  const [subjectLineLimit, setSubjectLineLimit] = useState<number | undefined>(undefined);
  const [hashtagCount, setHashtagCount] = useState<number | undefined>(undefined);
  const [language, setLanguage] = useState<Language | undefined>(undefined);

  // Editing state
  const [selectedLayerId, setSelectedLayerId] = useState<number | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [postContent, setPostContent] = useState<PostContent>(DEFAULT_POST_CONTENT);

  // Menu dirty-state tracking
  const menuSnapshotRef = useRef<string | null>(null);

  const currentMenuState = JSON.stringify({
    menuName, slots, contentPrompt, subjectLineLimit, hashtagCount, language,
  });
  const isMenuDirty = menuSnapshotRef.current !== null && menuSnapshotRef.current !== currentMenuState;

  // --- Active slot helpers ---

  const activeSlot = slots[activeSlotIndex];

  const updateActiveSlot = (patch: Partial<MenuSlot>) => {
    setSlots((prev) =>
      prev.map((s, i) => (i === activeSlotIndex ? { ...s, ...patch } : s))
    );
  };

  // --- Slot management ---

  const handleAddSlot = () => {
    const newSlot: MenuSlot = JSON.parse(JSON.stringify(DEFAULT_MENU_SLOT));
    setSlots((prev) => [...prev, newSlot]);
    setActiveSlotIndex(slots.length);
    setSelectedLayerId(null);
  };

  const handleRemoveSlot = (index: number) => {
    if (slots.length <= 1) return;
    setSlots((prev) => prev.filter((_, i) => i !== index));
    setTestPhotos((prev) => {
      const next = new Map<number, { dataUrl: string; mimeType: string }>();
      prev.forEach((v, k) => {
        if (k < index) next.set(k, v);
        else if (k > index) next.set(k - 1, v);
      });
      return next;
    });
    if (activeSlotIndex >= index && activeSlotIndex > 0) {
      setActiveSlotIndex(activeSlotIndex - 1);
    }
    setSelectedLayerId(null);
  };

  const handleMoveSlot = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= slots.length) return;
    setSlots((prev) => {
      const updated = [...prev];
      [updated[index], updated[target]] = [updated[target], updated[index]];
      return updated;
    });
    setTestPhotos((prev) => {
      const next = new Map(prev);
      const a = prev.get(index);
      const b = prev.get(target);
      if (a) next.set(target, a); else next.delete(target);
      if (b) next.set(index, b); else next.delete(index);
      return next;
    });
    if (activeSlotIndex === index) setActiveSlotIndex(target);
    else if (activeSlotIndex === target) setActiveSlotIndex(index);
  };

  // --- Layer management (for active slot) ---

  const handleDeleteLayer = (id: number) => {
    updateActiveSlot({ layers: activeSlot.layers.filter((l) => l.id !== id) });
    if (selectedLayerId === id) setSelectedLayerId(null);
  };

  // --- Image handling for active slot ---

  const handleImageChange = (dataUrl: string, mimeType: string) => {
    setTestPhotos((prev) => {
      const next = new Map(prev);
      next.set(activeSlotIndex, { dataUrl, mimeType });
      return next;
    });
  };

  const activePhoto = testPhotos.get(activeSlotIndex);

  // --- Menu persistence ---

  const handleLoadMenu = (menuId: string) => {
    const menu = menus.find((m) => m.id === menuId);
    if (!menu) return;
    const loadedSlots = JSON.parse(JSON.stringify(menu.slots));
    setActiveMenuId(menu.id);
    setMenuName(menu.name);
    setSlots(loadedSlots);
    setContentPrompt(menu.contentPrompt);
    setSubjectLineLimit(menu.subjectLineLimit);
    setHashtagCount(menu.hashtagCount);
    setLanguage(menu.language);
    setActiveSlotIndex(0);
    setSelectedLayerId(null);
    setTestPhotos(new Map());
    setPostContent(DEFAULT_POST_CONTENT);
    // Snapshot for dirty tracking
    menuSnapshotRef.current = JSON.stringify({
      menuName: menu.name,
      slots: loadedSlots,
      contentPrompt: menu.contentPrompt,
      subjectLineLimit: menu.subjectLineLimit,
      hashtagCount: menu.hashtagCount,
      language: menu.language,
    });
  };

  const handleNewMenu = () => {
    setActiveMenuId(null);
    setMenuName('');
    setSlots([JSON.parse(JSON.stringify(DEFAULT_MENU_SLOT))]);
    setContentPrompt('');
    setSubjectLineLimit(undefined);
    setHashtagCount(undefined);
    setLanguage(undefined);
    setActiveSlotIndex(0);
    setSelectedLayerId(null);
    setTestPhotos(new Map());
    setPostContent(DEFAULT_POST_CONTENT);
    menuSnapshotRef.current = null;
  };

  const handleSave = async () => {
    if (!menuName.trim()) return;
    if (activeMenuId) {
      const menu = menus.find((m) => m.id === activeMenuId);
      if (!menu || !canEdit(user, menu)) return;
      await onUpdateMenu(activeMenuId, {
        name: menuName,
        slots,
        contentPrompt,
        subjectLineLimit,
        hashtagCount,
        language,
      });
    } else {
      const id = await onSaveMenu(menuName, slots, contentPrompt, subjectLineLimit, hashtagCount, language);
      setActiveMenuId(id);
    }
    menuSnapshotRef.current = currentMenuState;
  };

  const handleSaveAsNew = async () => {
    if (!menuName.trim()) return;
    const id = await onSaveMenu(menuName, slots, contentPrompt, subjectLineLimit, hashtagCount, language);
    setActiveMenuId(id);
    menuSnapshotRef.current = currentMenuState;
  };

  const handleDelete = async (id: string) => {
    await onDeleteMenu(id);
    if (activeMenuId === id) handleNewMenu();
  };

  const handleCancel = () => {
    if (!menuSnapshotRef.current) return;
    const snapshot = JSON.parse(menuSnapshotRef.current);
    setMenuName(snapshot.menuName);
    setSlots(snapshot.slots);
    setContentPrompt(snapshot.contentPrompt);
    setSubjectLineLimit(snapshot.subjectLineLimit);
    setHashtagCount(snapshot.hashtagCount);
    setLanguage(snapshot.language);
    setActiveSlotIndex(0);
    setSelectedLayerId(null);
  };

  return (
    <div className="menu-pipeline">
      {/* Menu Bar */}
      <div className="menu-editor-header">
        <div className="menu-toolbar">
          <div className="field-row">
            <label>Name</label>
            <input
              className="input"
              value={menuName}
              onChange={(e) => setMenuName(e.target.value)}
              placeholder="Menu name"
            />
          </div>
          {!activeMenuId && (
            <button
              className="btn btn-primary"
              onClick={handleSave}
              disabled={!menuName.trim()}
            >
              Create
            </button>
          )}
        </div>
        <MenuBar
          menus={menus}
          activeMenuId={activeMenuId}
          menuName={menuName}
          onMenuNameChange={setMenuName}
          onLoad={handleLoadMenu}
          onDelete={handleDelete}
          onSave={handleSave}
          onSaveAsNew={handleSaveAsNew}
          onCancel={handleCancel}
          onNew={handleNewMenu}
          isDirty={isMenuDirty}
        />
      </div>

      {/* Slot Tabs */}
      <div className="slot-tabs">
        {slots.map((_, index) => (
          <div
            key={index}
            className={`slot-tab ${index === activeSlotIndex ? 'slot-tab-active' : ''}`}
            onClick={() => {
              setActiveSlotIndex(index);
              setSelectedLayerId(null);
            }}
          >
            <span>{index + 1}</span>
            {slots.length > 1 && (
              <button
                className="slot-tab-remove"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveSlot(index);
                }}
                title="Remove slot"
              >
                &times;
              </button>
            )}
          </div>
        ))}
        <button className="slot-tab slot-tab-add" onClick={handleAddSlot}>
          +
        </button>
        {slots.length > 1 && (
          <div className="slot-tab-controls">
            <button
              className="btn btn-small"
              onClick={() => handleMoveSlot(activeSlotIndex, -1)}
              disabled={activeSlotIndex === 0}
            >
              &#9664; Move
            </button>
            <button
              className="btn btn-small"
              onClick={() => handleMoveSlot(activeSlotIndex, 1)}
              disabled={activeSlotIndex === slots.length - 1}
            >
              Move &#9654;
            </button>
          </div>
        )}
      </div>

      {/* Main editor layout */}
      <div className="main-layout">
        <div className="left-panel">
          <ImageUploader
            image={activePhoto?.dataUrl ?? null}
            mimeType={activePhoto?.mimeType ?? 'image/jpeg'}
            onImageChange={handleImageChange}
            enhancePrompt={activeSlot.enhancePrompt}
            onEnhancePromptChange={(v) => updateActiveSlot({ enhancePrompt: v })}
          />

          <section className="section">
            <h2>Slot {activeSlotIndex + 1} — Project & Keywords</h2>
            <ProjectSelector
              projects={projects}
              report={report}
              onReportChange={setReport}
            />
            <KeywordLayers
              layers={activeSlot.layers}
              onLayersChange={(layers) => updateActiveSlot({ layers })}
              reportContent={report?.content ?? ''}
              selectedLayerId={selectedLayerId}
              onSelectLayer={setSelectedLayerId}
              onDeleteLayer={handleDeleteLayer}
              sharedAssets={sharedAssets}
              onOpenAssetPicker={onOpenAssetPicker}
              language={language}
            />
          </section>
        </div>

        <div className="right-panel">
          <CanvasPreview
            image={activePhoto?.dataUrl ?? null}
            layers={activeSlot.layers}
            onLayersChange={(layers) => updateActiveSlot({ layers })}
            selectedLayerId={selectedLayerId}
            onSelectLayer={setSelectedLayerId}
            canvasSize={activeSlot.canvasSize}
            onCanvasSizeChange={(canvasSize: CanvasSize) => updateActiveSlot({ canvasSize })}
            imageOffsetX={activeSlot.imageOffsetX}
            imageOffsetY={activeSlot.imageOffsetY}
            onImageOffsetChange={(x, y) =>
              updateActiveSlot({ imageOffsetX: x, imageOffsetY: y })
            }
          />
        </div>
      </div>

      {/* Shared Post Content */}
      <div className="menu-shared-content">
        <section className="section">
          <h2>Shared Post Content</h2>
          <PostContentFields
            postContent={postContent}
            onPostContentChange={setPostContent}
            layers={activeSlot.layers}
            onLayersChange={(layers) => updateActiveSlot({ layers })}
            reportContent={report?.content ?? ''}
            contentPrompt={contentPrompt}
            onContentPromptChange={setContentPrompt}
            subjectLineLimit={subjectLineLimit}
            onSubjectLineLimitChange={setSubjectLineLimit}
            hashtagCount={hashtagCount}
            onHashtagCountChange={setHashtagCount}
            language={language}
            onLanguageChange={setLanguage}
          />
        </section>
      </div>
    </div>
  );
}
