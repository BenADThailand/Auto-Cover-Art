import { useState, useEffect, useRef } from 'react';
import LoginPage from './components/LoginPage';
import ApiKeySetup from './components/ApiKeySetup';
import ImageUploader from './components/ImageUploader';
import ProjectSelector from './components/ProjectSelector';
import KeywordLayers from './components/KeywordLayers';
import CanvasPreview from './components/CanvasPreview';
import PostContentFields from './components/PostContentFields';
import RecipeBar from './components/RecipeBar';
import BulkPipeline from './components/BulkPipeline';
import MenuEditor from './components/MenuEditor';
import MenuPipeline from './components/MenuPipeline';
import AssetLibrary from './components/AssetLibrary';
import AuditLog from './components/AuditLog';
import UserContext from './contexts/UserContext';
import { isAdmin, canEdit, canDelete } from './lib/permissions';
import { useRecipes } from './hooks/useRecipes';
import { useMenus } from './hooks/useMenus';
import { useProjects } from './hooks/useProjects';
import { useSharedAssets } from './hooks/useSharedAssets';
import { setGeminiApiKey } from './api';
import { migrateOwnerlessItems } from './firebase';
import { DEFAULT_LAYERS, DEFAULT_POST_CONTENT, CANVAS_SIZES, isImageLayer } from './types';
import type { Layer, Report, CanvasSize, PostContent, User, Language, SharedAsset } from './types';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState<'editor' | 'bulk' | 'menuEditor' | 'menuRun' | 'assetLibrary' | 'audit'>('editor');
  const [image, setImage] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState('image/jpeg');
  const [report, setReport] = useState<Report | null>(null);
  const [layers, setLayers] = useState<Layer[]>(DEFAULT_LAYERS);
  const [selectedLayerId, setSelectedLayerId] = useState<number | null>(null);
  const [canvasSize, setCanvasSize] = useState<CanvasSize>(CANVAS_SIZES[0]);
  const [imageOffsetX, setImageOffsetX] = useState(0);
  const [imageOffsetY, setImageOffsetY] = useState(0);
  const [postContent, setPostContent] = useState<PostContent>(DEFAULT_POST_CONTENT);
  const [contentPrompt, setContentPrompt] = useState('');
  const [enhancePrompt, setEnhancePrompt] = useState('');
  const [subjectLineLimit, setSubjectLineLimit] = useState<number | undefined>(undefined);
  const [hashtagCount, setHashtagCount] = useState<number | undefined>(undefined);
  const [language, setLanguage] = useState<Language | undefined>(undefined);
  const [activeRecipeId, setActiveRecipeId] = useState<string | null>(null);
  const [assetPickerLayerId, setAssetPickerLayerId] = useState<number | null>(null);

  // Recipe dirty-state tracking
  const recipeSnapshotRef = useRef<string | null>(null);

  const currentRecipeState = JSON.stringify({
    layers, canvasSize, imageOffsetX, imageOffsetY,
    enhancePrompt, contentPrompt, subjectLineLimit, hashtagCount, language,
  });
  const isRecipeDirty = recipeSnapshotRef.current !== null && recipeSnapshotRef.current !== currentRecipeState;

  const { recipes, saveRecipe, updateRecipe, deleteRecipe } = useRecipes();
  const { menus, saveMenu, updateMenu, deleteMenu } = useMenus();
  const { projects, fetchReport } = useProjects();
  const { assets: sharedAssets, loading: assetsLoading, upload: uploadAsset, remove: removeAsset } = useSharedAssets();

  // Run ownership migration once for ADMIN users
  const migrationRan = useRef(false);
  useEffect(() => {
    if (user && isAdmin(user) && !migrationRan.current) {
      migrationRan.current = true;
      migrateOwnerlessItems().catch(() => {});
    }
  }, [user]);

  const handleImageChange = (dataUrl: string, mime: string) => {
    setImage(dataUrl);
    setMimeType(mime);
    setImageOffsetX(0);
    setImageOffsetY(0);
  };

  const handleDeleteLayer = (id: number) => {
    const layer = layers.find((l) => l.id === id);
    if (!layer) return;
    setLayers(layers.filter((l) => l.id !== id));
    if (selectedLayerId === id) {
      setSelectedLayerId(null);
    }
  };

  const handleAssetPicked = (asset: SharedAsset) => {
    if (assetPickerLayerId === null) return;
    setLayers(
      layers.map((l) =>
        l.id === assetPickerLayerId && isImageLayer(l)
          ? { ...l, assetId: asset.id, assetUrl: asset.downloadUrl }
          : l
      )
    );
    setAssetPickerLayerId(null);
  };

  const handleUploadAsset = async (file: File, tags?: string[]) => {
    if (!user) throw new Error('Not logged in');
    return uploadAsset(file, user.id, tags, user.name);
  };

  const handleSaveRecipe = async (name: string) => {
    const id = await saveRecipe(name, canvasSize, layers, imageOffsetX, imageOffsetY, enhancePrompt, contentPrompt, subjectLineLimit, hashtagCount, language);
    setActiveRecipeId(id);
    recipeSnapshotRef.current = currentRecipeState;
  };

  const handleUpdateRecipe = async () => {
    if (!activeRecipeId) return;
    const recipe = recipes.find((r) => r.id === activeRecipeId);
    if (!recipe || !canEdit(user, recipe)) return;
    await updateRecipe(activeRecipeId, { canvasSize, layers, imageOffsetX, imageOffsetY, enhancePrompt, contentPrompt, subjectLineLimit, hashtagCount, language });
    recipeSnapshotRef.current = currentRecipeState;
  };

  const handleSaveAsNewRecipe = async (name: string) => {
    const id = await saveRecipe(name, canvasSize, layers, imageOffsetX, imageOffsetY, enhancePrompt, contentPrompt, subjectLineLimit, hashtagCount, language);
    setActiveRecipeId(id);
    recipeSnapshotRef.current = currentRecipeState;
  };

  const handleLoadRecipe = (id: string) => {
    const recipe = recipes.find((r) => r.id === id);
    if (!recipe) return;
    const loadedLayers = JSON.parse(JSON.stringify(recipe.layers));
    setLayers(loadedLayers);
    setCanvasSize(recipe.canvasSize);
    setImageOffsetX(recipe.imageOffsetX ?? 0);
    setImageOffsetY(recipe.imageOffsetY ?? 0);
    setEnhancePrompt(recipe.enhancePrompt ?? '');
    setContentPrompt(recipe.contentPrompt ?? '');
    setSubjectLineLimit(recipe.subjectLineLimit);
    setHashtagCount(recipe.hashtagCount);
    setLanguage(recipe.language);
    setSelectedLayerId(null);
    setActiveRecipeId(id);
    // Snapshot for dirty tracking
    recipeSnapshotRef.current = JSON.stringify({
      layers: loadedLayers,
      canvasSize: recipe.canvasSize,
      imageOffsetX: recipe.imageOffsetX ?? 0,
      imageOffsetY: recipe.imageOffsetY ?? 0,
      enhancePrompt: recipe.enhancePrompt ?? '',
      contentPrompt: recipe.contentPrompt ?? '',
      subjectLineLimit: recipe.subjectLineLimit,
      hashtagCount: recipe.hashtagCount,
      language: recipe.language,
    });
  };

  const handleDeleteRecipe = async (id: string) => {
    const recipe = recipes.find((r) => r.id === id);
    if (!recipe || !canDelete(user, recipe)) return;
    await deleteRecipe(id);
    if (activeRecipeId === id) setActiveRecipeId(null);
  };

  const handleResetToDefault = () => {
    setLayers(JSON.parse(JSON.stringify(DEFAULT_LAYERS)));
    setImageOffsetX(0);
    setImageOffsetY(0);
    setEnhancePrompt('');
    setContentPrompt('');
    setSubjectLineLimit(undefined);
    setHashtagCount(undefined);
    setLanguage(undefined);
    setActiveRecipeId(null);
    setSelectedLayerId(null);
    recipeSnapshotRef.current = null;
  };

  const handleCancelRecipe = () => {
    if (!recipeSnapshotRef.current) return;
    const snapshot = JSON.parse(recipeSnapshotRef.current);
    setLayers(snapshot.layers);
    setCanvasSize(snapshot.canvasSize);
    setImageOffsetX(snapshot.imageOffsetX);
    setImageOffsetY(snapshot.imageOffsetY);
    setEnhancePrompt(snapshot.enhancePrompt);
    setContentPrompt(snapshot.contentPrompt);
    setSubjectLineLimit(snapshot.subjectLineLimit);
    setHashtagCount(snapshot.hashtagCount);
    setLanguage(snapshot.language);
    setSelectedLayerId(null);
  };

  const handleLogin = (u: User) => {
    setUser(u);
    if (u.geminiApiKey) setGeminiApiKey(u.geminiApiKey);
  };

  const handleLogout = () => {
    setUser(null);
    setGeminiApiKey(null);
    setShowSettings(false);
  };

  const handleKeySet = (updatedUser: User) => {
    setUser(updatedUser);
    if (updatedUser.geminiApiKey) setGeminiApiKey(updatedUser.geminiApiKey);
    setShowSettings(false);
  };

  if (!user) return <LoginPage onLogin={handleLogin} />;

  if (!user.geminiApiKey) return <ApiKeySetup user={user} onKeySet={handleKeySet} />;

  return (
    <UserContext.Provider value={user}>
    <div className="app">
      <header>
        <div className="user-bar">
          <img className="user-avatar" src={user.avatar} alt="" />
          <span className="user-name">{user.name}</span>
          <button className="btn-settings" onClick={() => setShowSettings(!showSettings)} title="Settings">&#9881;</button>
          <button className="btn-logout" onClick={handleLogout}>Logout</button>
          {showSettings && (
            <div className="settings-dropdown">
              <h3>Gemini API Key</h3>
              <ApiKeySetup user={user} onKeySet={handleKeySet} inline />
            </div>
          )}
        </div>
        <h1>AD Photo Studio</h1>
        <div className="tab-nav">
          <button
            className={`tab ${activeTab === 'editor' ? 'active' : ''}`}
            onClick={() => setActiveTab('editor')}
          >
            Cover Art Design
          </button>
          <button
            className={`tab ${activeTab === 'bulk' ? 'active' : ''}`}
            onClick={() => setActiveTab('bulk')}
          >
            Cover Art Studio
          </button>
          <button
            className={`tab ${activeTab === 'menuEditor' ? 'active' : ''}`}
            onClick={() => setActiveTab('menuEditor')}
          >
            Post Design
          </button>
          <button
            className={`tab ${activeTab === 'menuRun' ? 'active' : ''}`}
            onClick={() => setActiveTab('menuRun')}
          >
            Post Studio
          </button>
          <button
            className={`tab ${activeTab === 'assetLibrary' ? 'active' : ''}`}
            onClick={() => setActiveTab('assetLibrary')}
          >
            Asset Library
          </button>
          {isAdmin(user) && (
            <button
              className={`tab ${activeTab === 'audit' ? 'active' : ''}`}
              onClick={() => setActiveTab('audit')}
            >
              Audit Log
            </button>
          )}
        </div>
      </header>

      <div style={{ display: activeTab === 'editor' ? undefined : 'none' }}>
        <div className="recipe-editor-header">
          <RecipeBar
            recipes={recipes}
            activeRecipeId={activeRecipeId}
            onSave={handleSaveRecipe}
            onLoad={handleLoadRecipe}
            onDelete={handleDeleteRecipe}
            onUpdate={handleUpdateRecipe}
            onSaveAsNew={handleSaveAsNewRecipe}
            onResetToDefault={handleResetToDefault}
            isDirty={isRecipeDirty}
            onCancel={handleCancelRecipe}
          />
        </div>
        <div className="main-layout">
          <div className="left-panel">
            <ImageUploader
              image={image}
              mimeType={mimeType}
              onImageChange={handleImageChange}
              enhancePrompt={enhancePrompt}
              onEnhancePromptChange={setEnhancePrompt}
            />

            <section className="section">
              <h2>2. Project & Keywords</h2>
              <ProjectSelector
                projects={projects}
                report={report}
                onReportChange={setReport}
              />
              <KeywordLayers
                layers={layers}
                onLayersChange={setLayers}
                reportContent={report?.content ?? ''}
                selectedLayerId={selectedLayerId}
                onSelectLayer={setSelectedLayerId}
                onDeleteLayer={handleDeleteLayer}
                sharedAssets={sharedAssets}
                onOpenAssetPicker={setAssetPickerLayerId}
                language={language}
              />
              <PostContentFields
                postContent={postContent}
                onPostContentChange={setPostContent}
                layers={layers}
                onLayersChange={setLayers}
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

          <div className="right-panel">
            <CanvasPreview
              image={image}
              layers={layers}
              onLayersChange={setLayers}
              selectedLayerId={selectedLayerId}
              onSelectLayer={setSelectedLayerId}
              canvasSize={canvasSize}
              onCanvasSizeChange={setCanvasSize}
              imageOffsetX={imageOffsetX}
              imageOffsetY={imageOffsetY}
              onImageOffsetChange={(x, y) => {
                setImageOffsetX(x);
                setImageOffsetY(y);
              }}
            />
          </div>
        </div>
      </div>

      <div style={{ display: activeTab === 'bulk' ? undefined : 'none' }}>
        <BulkPipeline
          projects={projects}
          recipes={recipes}
          fetchReport={fetchReport}
        />
      </div>

      <div style={{ display: activeTab === 'menuEditor' ? undefined : 'none' }}>
        <MenuEditor
          projects={projects}
          menus={menus}
          fetchReport={fetchReport}
          onSaveMenu={saveMenu}
          onUpdateMenu={updateMenu}
          onDeleteMenu={deleteMenu}
          sharedAssets={sharedAssets}
          onOpenAssetPicker={setAssetPickerLayerId}
        />
      </div>

      <div style={{ display: activeTab === 'menuRun' ? undefined : 'none' }}>
        <MenuPipeline
          projects={projects}
          menus={menus}
          fetchReport={fetchReport}
        />
      </div>

      <div style={{ display: activeTab === 'assetLibrary' ? undefined : 'none' }}>
        <AssetLibrary
          assets={sharedAssets}
          loading={assetsLoading}
          onUpload={handleUploadAsset}
          onDelete={removeAsset}
        />
      </div>

      {isAdmin(user) && activeTab === 'audit' && (
        <AuditLog
          recipes={recipes}
          menus={menus}
          assets={sharedAssets}
        />
      )}

      {/* Asset Picker Modal */}
      {assetPickerLayerId !== null && (
        <AssetLibrary
          assets={sharedAssets}
          loading={assetsLoading}
          onUpload={handleUploadAsset}
          onDelete={removeAsset}
          pickerMode
          onPick={handleAssetPicked}
          onClose={() => setAssetPickerLayerId(null)}
        />
      )}
    </div>
    </UserContext.Provider>
  );
}
