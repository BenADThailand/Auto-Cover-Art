import { useState } from 'react';
import ImageUploader from './components/ImageUploader';
import ProjectSelector from './components/ProjectSelector';
import KeywordLayers from './components/KeywordLayers';
import CanvasPreview from './components/CanvasPreview';
import PostContentFields from './components/PostContentFields';
import RecipeBar from './components/RecipeBar';
import BulkPipeline from './components/BulkPipeline';
import { useRecipes } from './hooks/useRecipes';
import { useProjects } from './hooks/useProjects';
import { DEFAULT_LAYERS, DEFAULT_POST_CONTENT, CANVAS_SIZES, LAYER_STYLE_DEFAULTS } from './types';
import type { KeywordLayer, Report, CanvasSize, PostContent } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<'editor' | 'bulk'>('editor');
  const [image, setImage] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState('image/jpeg');
  const [report, setReport] = useState<Report | null>(null);
  const [layers, setLayers] = useState<KeywordLayer[]>(DEFAULT_LAYERS);
  const [selectedLayerId, setSelectedLayerId] = useState<number | null>(null);
  const [canvasSize, setCanvasSize] = useState<CanvasSize>(CANVAS_SIZES[0]);
  const [imageOffsetX, setImageOffsetX] = useState(0);
  const [imageOffsetY, setImageOffsetY] = useState(0);
  const [postContent, setPostContent] = useState<PostContent>(DEFAULT_POST_CONTENT);
  const [contentPrompt, setContentPrompt] = useState('');
  const [enhancePrompt, setEnhancePrompt] = useState('');
  const [subjectLineLimit, setSubjectLineLimit] = useState<number | undefined>(undefined);
  const [hashtagCount, setHashtagCount] = useState<number | undefined>(undefined);
  const [activeRecipeId, setActiveRecipeId] = useState<string | null>(null);

  const { recipes, saveRecipe, updateRecipe, deleteRecipe } = useRecipes();
  const { projects, fetchReport } = useProjects();

  const handleImageChange = (dataUrl: string, mime: string) => {
    setImage(dataUrl);
    setMimeType(mime);
    setImageOffsetX(0);
    setImageOffsetY(0);
  };

  const handleAddLayer = () => {
    const maxId = layers.reduce((max, l) => Math.max(max, l.id), 0);
    const newLayer: KeywordLayer = {
      id: maxId + 1,
      text: '',
      xPercent: 50,
      yPercent: 50,
      orientation: 'horizontal',
      fontFamily: 'SimSun, serif',
      fontSize: 48,
      fontColor: '#ffffff',
      locked: false,
      aiGenerate: false,
      aiPrompt: '',
      ...LAYER_STYLE_DEFAULTS,
    };
    setLayers([...layers, newLayer]);
    setSelectedLayerId(newLayer.id);
  };

  const handleDeleteLayer = (id: number) => {
    const layer = layers.find((l) => l.id === id);
    if (!layer) return;
    setLayers(layers.filter((l) => l.id !== id));
    if (selectedLayerId === id) {
      setSelectedLayerId(null);
    }
  };

  const handleSaveRecipe = async (name: string) => {
    const id = await saveRecipe(name, canvasSize, layers, imageOffsetX, imageOffsetY, enhancePrompt, contentPrompt, subjectLineLimit, hashtagCount);
    setActiveRecipeId(id);
  };

  const handleUpdateRecipe = async () => {
    if (!activeRecipeId) return;
    await updateRecipe(activeRecipeId, { canvasSize, layers, imageOffsetX, imageOffsetY, enhancePrompt, contentPrompt, subjectLineLimit, hashtagCount });
  };

  const handleSaveAsNewRecipe = async (name: string) => {
    const id = await saveRecipe(name, canvasSize, layers, imageOffsetX, imageOffsetY, enhancePrompt, contentPrompt, subjectLineLimit, hashtagCount);
    setActiveRecipeId(id);
  };

  const handleLoadRecipe = (id: string) => {
    const recipe = recipes.find((r) => r.id === id);
    if (!recipe) return;
    setLayers(JSON.parse(JSON.stringify(recipe.layers)));
    setCanvasSize(recipe.canvasSize);
    setImageOffsetX(recipe.imageOffsetX ?? 0);
    setImageOffsetY(recipe.imageOffsetY ?? 0);
    setEnhancePrompt(recipe.enhancePrompt ?? '');
    setContentPrompt(recipe.contentPrompt ?? '');
    setSubjectLineLimit(recipe.subjectLineLimit);
    setHashtagCount(recipe.hashtagCount);
    setSelectedLayerId(null);
    setActiveRecipeId(id);
  };

  const handleDeleteRecipe = async (id: string) => {
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
    setActiveRecipeId(null);
    setSelectedLayerId(null);
  };

  return (
    <div className="app">
      <header>
        <h1>AD Cover Art &amp; Content Generator</h1>
        <div className="tab-nav">
          <button
            className={`tab ${activeTab === 'editor' ? 'active' : ''}`}
            onClick={() => setActiveTab('editor')}
          >
            Editor
          </button>
          <button
            className={`tab ${activeTab === 'bulk' ? 'active' : ''}`}
            onClick={() => setActiveTab('bulk')}
          >
            Bulk Pipeline
          </button>
        </div>
      </header>

      <div className="main-layout" style={{ display: activeTab === 'editor' ? undefined : 'none' }}>
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
              onAddLayer={handleAddLayer}
              onDeleteLayer={handleDeleteLayer}
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
            />
            <RecipeBar
              recipes={recipes}
              activeRecipeId={activeRecipeId}
              onSave={handleSaveRecipe}
              onLoad={handleLoadRecipe}
              onDelete={handleDeleteRecipe}
              onUpdate={handleUpdateRecipe}
              onSaveAsNew={handleSaveAsNewRecipe}
              onResetToDefault={handleResetToDefault}
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

      <div style={{ display: activeTab === 'bulk' ? undefined : 'none' }}>
        <BulkPipeline
          projects={projects}
          recipes={recipes}
          fetchReport={fetchReport}
        />
      </div>
    </div>
  );
}
