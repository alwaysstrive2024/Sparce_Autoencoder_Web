import { useState, useEffect, useCallback } from 'react';
import { Cpu, Zap, AlertCircle, RefreshCw } from 'lucide-react';

import { API_BASE, FALLBACK_MODELS, getModelColor } from './constants';
import ControlPanel from './components/ControlPanel';
import ModelColumn from './components/ModelColumn';
import CrossModelVisuals from './components/CrossModelVisuals';
import LoadingOverlay from './components/LoadingOverlay';
import { useI18n } from './i18n';
import fangcunLogo from '../fangcun_icon.svg';
import fangcunLogoPng from '../fangcun_logo.png';

export default function App() {
  const { language, toggleLanguage, t } = useI18n();
  // ── State ────────────────────────────────────────────────────────────────
  const [availableModels, setAvailableModels] = useState(FALLBACK_MODELS);
  const [selectedModels, setSelectedModels] = useState([]); // [{id, modelKey}]
  const [prompt, setPrompt] = useState('Apple announced the iPhone 18 at WWDC.');
  const [topK, setTopK] = useState(10);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [pipelineMode, setPipelineMode] = useState(null); // 'real' | 'mock' | null

  // ── Fetch available models on mount ──────────────────────────────────────
  useEffect(() => {
    fetch(`${API_BASE}/models`)
      .then((r) => r.json())
      .then((data) => setAvailableModels(data.models?.length ? data.models : FALLBACK_MODELS))
      .catch(() => setAvailableModels(FALLBACK_MODELS));

    // Also ping root for pipeline mode
    fetch(`${API_BASE}/`, { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => setPipelineMode(d.pipeline_mode))
      .catch(() => setPipelineMode('offline'));
  }, []);

  // ── Run analysis ─────────────────────────────────────────────────────────
  const handleRun = useCallback(async () => {
    const modelKeys = selectedModels.map((m) => m.modelKey).filter(Boolean);
    if (!modelKeys.length || !prompt.trim()) return;

    setIsLoading(true);
    setError(null);
    setResults(null);

    try {
      const res = await fetch(`${API_BASE}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim(),
          selected_models: modelKeys,
          top_k: topK,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail ?? `HTTP ${res.status}`);
      }

      const data = await res.json();
      setResults(data);
      setPipelineMode(data.metadata?.pipeline_mode ?? pipelineMode);
    } catch (e) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  }, [selectedModels, prompt, topK, pipelineMode]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const activeModelKeys = selectedModels.map((m) => m.modelKey).filter(Boolean);
  const loadingModelKeys = isLoading ? activeModelKeys : [];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col font-outfit">
      {/* Loading overlay */}
      {isLoading && (
        <LoadingOverlay
          models={loadingModelKeys}
          availableModels={availableModels}
        />
      )}

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-white/[0.06]"
        style={{
          background: 'rgba(255,255,255,0.94)',
          backdropFilter: 'blur(18px)',
          boxShadow: '0 10px 30px rgba(22,97,171,0.14)',
        }}
      >
        <div className="max-w-screen-2xl mx-auto px-6 py-3 flex flex-wrap items-center gap-3">
          {/* Logo */}
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden"
            style={{
              background: 'rgba(255,255,255,0.88)',
              border: '1px solid rgba(130,49,142,0.18)',
              boxShadow: '0 8px 22px rgba(130,49,142,0.18)',
            }}
          >
            <img
              src={fangcunLogo}
              alt="Fangcun AI"
              className="h-full w-full object-cover"
              style={{ transform: 'scale(2.85)' }}
            />
          </div>

          <div className="min-w-0 leading-tight">
            <h1 className="truncate text-sm font-bold text-white">{t('brandDashboard')}</h1>
            <p className="truncate text-[10px] text-white/35">{t('mechanisticInterpretability')}</p>
          </div>

          {/* Pipeline badges */}
          <div className="ml-0 flex min-w-0 flex-wrap items-center gap-2 sm:ml-4">
            <PipelineBadge label="LLM" color="#82318e" />
            <span className="text-white/20 text-xs">+</span>
            <PipelineBadge label="XAI" color="#1661ab" />
            <span className="text-white/20 text-xs">|</span>
            <PipelineBadge label="VRAM Hot-Swap" color="#4f46e5" />
          </div>

          <div className="ml-auto flex min-w-0 items-center gap-2">
            <LanguageToggle language={language} onToggle={toggleLanguage} />

            {/* Backend status */}
          {pipelineMode === 'offline' && (
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              <span className="text-[10px] text-white/35 whitespace-nowrap">{t('backendOffline')}</span>
            </div>
          )}
          </div>
        </div>
      </header>

      {/* ── Main ──────────────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-screen-2xl mx-auto w-full px-6 py-6 space-y-5">

        {/* Control panel */}
        <ControlPanel
          availableModels={availableModels}
          selectedModels={selectedModels}
          setSelectedModels={setSelectedModels}
          prompt={prompt}
          setPrompt={setPrompt}
          topK={topK}
          setTopK={setTopK}
          onRun={handleRun}
          isLoading={isLoading}
        />

        {/* Error banner */}
        {error && (
          <div
            className="flex items-start gap-3 p-4 rounded-xl border animate-fade-up"
            style={{ background: 'rgba(239,68,68,0.07)', borderColor: 'rgba(220,38,38,0.24)' }}
          >
            <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-300">{t('analysisFailed')}</p>
              <p className="mono text-[10px] text-red-400/70 mt-0.5">{error}</p>
            </div>
            <button
              onClick={handleRun}
              className="flex items-center gap-1 text-[10px] text-red-300 hover:text-red-200"
            >
              <RefreshCw size={11} /> {t('retry')}
            </button>
          </div>
        )}

        {/* ── Results grid or empty state ─────────────────────────────────── */}
        {results ? (
          <>
            {/* Metadata bar */}
            <div
              className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-[10px] text-white/40 animate-fade-up"
              style={{
                background: 'linear-gradient(90deg, rgba(130,49,142,0.095), rgba(22,97,171,0.090))',
                border: '1px solid rgba(22,97,171,0.24)',
              }}
            >
              <Zap size={11} style={{ color: '#82318e' }} className="flex-shrink-0" />
              <span className="font-semibold text-white/60">{t('modelInput')}:</span>
              <span className="italic truncate">&quot;{results.metadata?.model_prompt ?? results.metadata?.prompt}&quot;</span>
              <span className="ml-auto flex-shrink-0">
                {t('modelCountTopK', { count: activeModelKeys.length, topK })}
              </span>
            </div>

            {/* Model columns */}
            <div
              className="grid gap-5"
              style={{
                gridTemplateColumns: `repeat(${activeModelKeys.length}, minmax(0, 1fr))`,
              }}
            >
              {activeModelKeys.map((key, index) => (
                <ModelColumn
                  key={key}
                  modelKey={key}
                  data={results.models_data?.[key]}
                  topK={topK}
                  modelColor={getModelColor(index)}
                />
              ))}
            </div>

            {/* Divergence summary (2+ models) */}
            {activeModelKeys.length >= 2 && (
              <CrossModelVisuals results={results} />
            )}
          </>
        ) : (
          !isLoading && <EmptyState hasModels={activeModelKeys.length > 0} />
        )}
      </main>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.05] py-4 px-6"
        style={{ background: 'rgba(255,255,255,0.82)' }}
      >
        <div className="max-w-screen-2xl mx-auto flex items-center justify-between text-[10px] text-white/20">
          <span>
            {t('brandFooter')} · Powered by{' '}
            <span style={{ color: '#82318e' }}>LLM</span> &{' '}
            <span style={{ color: '#1661ab' }}>XAI</span>
          </span>
          <span className="flex items-center gap-1">
            <Cpu size={9} /> {t('footerStrategy')}
          </span>
        </div>
      </footer>
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────────────────────────────── */

function PipelineBadge({ label, color }) {
  return (
    <span
      className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-semibold"
      style={{
        background: `${color}18`,
        border: `1px solid ${color}40`,
        color,
      }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

function LanguageToggle({ language, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="inline-flex h-7 w-[74px] flex-shrink-0 items-center justify-between rounded-lg border px-1 text-[10px] font-bold transition-all"
      style={{
        background: 'linear-gradient(135deg, rgba(255,255,255,0.92), rgba(239,245,255,0.86))',
        borderColor: 'rgba(130,49,142,0.24)',
        boxShadow: '0 8px 18px rgba(22,97,171,0.10)',
        color: '#5f1f69',
      }}
      aria-label="Toggle language"
      title="中文 / English"
    >
      <span
        className="flex h-5 w-8 items-center justify-center rounded-md"
        style={{
          background: language === 'en' ? 'rgba(130,49,142,0.16)' : 'transparent',
          color: language === 'en' ? '#5f1f69' : 'rgba(11,18,32,0.42)',
        }}
      >
        EN
      </span>
      <span
        className="flex h-5 w-8 items-center justify-center rounded-md"
        style={{
          background: language === 'zh' ? 'rgba(22,97,171,0.16)' : 'transparent',
          color: language === 'zh' ? '#0d3f7a' : 'rgba(11,18,32,0.42)',
        }}
      >
        中
      </span>
    </button>
  );
}

function EmptyState({ hasModels }) {
  const { t } = useI18n();
  return (
    <div
      className="flex flex-col items-center justify-center py-20 text-center animate-fade-up rounded-2xl"
      style={{
        background:
          'linear-gradient(135deg, rgba(255,255,255,0.94), rgba(239,246,255,0.96)), linear-gradient(135deg, rgba(130,49,142,0.14), rgba(22,97,171,0.14))',
        border: '1px dashed rgba(22,97,171,0.34)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.75)',
      }}
    >
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
        style={{
          background: 'linear-gradient(135deg, rgba(130,49,142,0.18), rgba(22,97,171,0.16))',
          border: '1px solid rgba(130,49,142,0.30)',
        }}
      >
        <img src={fangcunLogoPng} alt={t('brandFooter')} className="h-11 w-11 object-contain" />
      </div>

      <h3 className="text-base font-bold text-white/50 mb-1">
        {hasModels ? t('readyToAnalyse') : t('selectModelsBegin')}
      </h3>
      <p className="text-sm text-white/25 max-w-sm leading-relaxed">
        {hasModels ? t('readyHint') : t('emptyHint')}
      </p>

      {/* Pipeline diagram */}
      <div className="mt-8 flex items-center gap-3 text-[11px] text-white/25">
        <PipelineStep emoji="🔬" label="LLM" sublabel={t('hookActivations')} color="#82318e" />
        <Arrow />
        <PipelineStep emoji="✨" label="XAI" sublabel={t('encodeFeatures')} color="#1661ab" />
        <Arrow />
        <PipelineStep emoji="📊" label={t('reports')} sublabel={t('globalPerToken')} color="#4f46e5" />
        <Arrow />
        <PipelineStep emoji="🗑️" label={t('vramClear')} sublabel={t('hotSwap')} color="#1661ab" />
      </div>
    </div>
  );
}

function PipelineStep({ emoji, label, sublabel, color }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
        style={{ background: `${color}15`, border: `1px solid ${color}30` }}
      >
        {emoji}
      </div>
      <span style={{ color }} className="font-semibold text-[10px]">{label}</span>
      <span className="text-[9px] text-white/20">{sublabel}</span>
    </div>
  );
}

function Arrow() {
  return (
    <svg width="20" height="12" viewBox="0 0 20 12" fill="none" className="opacity-20 flex-shrink-0">
      <path d="M0 6h16M12 2l4 4-4 4" stroke="#1661ab" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
