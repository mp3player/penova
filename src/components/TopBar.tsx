import React, { useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  Download,
  FileCode2,
  FolderOpen,
  Globe,
  Image,
  Monitor,
  MoreHorizontal,
  Palette,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  Redo2,
  RotateCcw,
  Save,
  Smartphone,
  Undo2,
  Video,
  X,
} from 'lucide-react';
import { AspectRatio, LessonScene, ThemeId } from '../model/scene';
import { LessonProject } from '../model/project';
import { getPresetProjects } from '../model/presets';
import {
  exportRegistry,
  presentationRegistry,
  useRegistryList,
} from '../plugins';
import { useI18n } from '../i18n';

interface TopBarProps {
  project: LessonProject;
  scene: LessonScene;
  sidebarOpen: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onToggleSidebar: () => void;
  onSelectPreset: (presetId: string) => void;
  onResetPreset: (presetId: string) => void;
  onChangeTheme: (theme: ThemeId) => void;
  onChangeAspectRatio: (ratio: AspectRatio) => void;
  onUndo: () => void;
  onRedo: () => void;
  onSaveProjectJson: () => void;
  onImportProjectJson: (file: File) => void;
  exporting: boolean;
  exportProgress: number;
  onStartExport: (exporterId?: string) => void;
  onCancelExport: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  project,
  scene,
  sidebarOpen,
  canUndo,
  canRedo,
  onToggleSidebar,
  onSelectPreset,
  onResetPreset,
  onChangeTheme,
  onChangeAspectRatio,
  onUndo,
  onRedo,
  onSaveProjectJson,
  onImportProjectJson,
  exporting,
  exportProgress,
  onStartExport,
  onCancelExport,
}) => {
  const { locale, setLocale, t, pluginName } = useI18n();
  const projectFileInputRef = useRef<HTMLInputElement | null>(null);
  const moreMenuRef = useRef<HTMLDivElement | null>(null);
  const exportMenuRef = useRef<HTMLDivElement | null>(null);
  const [openMenu, setOpenMenu] = useState<'more' | 'export' | null>(null);

  const presentations = useRegistryList(presentationRegistry);
  const exporters = useRegistryList(exportRegistry);
  const presetProjects = getPresetProjects(locale);
  const activePresetId = presetProjects.some((p) => p.id === project.id)
    ? project.id
    : 'custom';

  useEffect(() => {
    if (!openMenu) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (moreMenuRef.current?.contains(target)) return;
      if (exportMenuRef.current?.contains(target)) return;
      setOpenMenu(null);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenMenu(null);
    };
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [openMenu]);

  const snapshotExporters = exporters.filter(
    (exp) => exp.category === 'snapshot'
  );
  const sequenceExporters = exporters.filter(
    (exp) => exp.category !== 'snapshot'
  );

  const exporterDesc = (id: string, fallback?: string): string => {
    switch (id) {
      case 'mediarecorder-video':
        return t('topbar.exportDescVideo');
      case 'png-sequence-tar':
        return t('topbar.exportDescPngTar');
      case 'svg-sequence-tar':
        return t('topbar.exportDescSvgTar');
      case 'poster-png':
        return t('topbar.exportDescPosterPng');
      case 'poster-svg':
        return t('topbar.exportDescPosterSvg');
      default:
        return fallback ?? '';
    }
  };

  return (
    <header
      style={{
        minHeight: 48,
        height: 'auto',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '6px 14px',
        background: 'var(--bg-panel)',
        borderBottom: '1px solid var(--border-subtle)',
        rowGap: 6,
        columnGap: 10,
        flexShrink: 0,
      }}
    >
      {/* Left: Brand & sidebar toggle & preset selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button
          type="button"
          className="studio-btn"
          onClick={onToggleSidebar}
          title={
            sidebarOpen
              ? t('topbar.collapseSidebar')
              : t('topbar.expandSidebar')
          }
          style={{ width: 30, height: 30, padding: 0 }}
        >
          {sidebarOpen ? (
            <PanelLeftClose size={15} />
          ) : (
            <PanelLeftOpen size={15} />
          )}
        </button>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            paddingRight: 8,
            borderRight: '1px solid var(--border-subtle)',
          }}
        >
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: 7,
              background: 'linear-gradient(135deg, #f3c969 0%, #e09f3e 100%)',
              color: '#14181f',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(243, 201, 105, 0.28)',
            }}
          >
            <Pencil size={14} strokeWidth={2.4} />
          </div>
          <span style={{ fontWeight: 700, fontSize: 13.5, letterSpacing: 0.2 }}>
            Penova
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <select
            className="studio-select"
            aria-label={t('topbar.templatesLabel')}
            title={t('topbar.templatesLabel')}
            value={activePresetId}
            onChange={(e) => {
              if (e.target.value !== 'custom') {
                onSelectPreset(e.target.value);
              }
            }}
            style={{ width: 176, height: 30, padding: '0 8px' }}
          >
            {presetProjects.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.title}
              </option>
            ))}
            {activePresetId === 'custom' && (
              <option value="custom">{t('topbar.customTemplate')}</option>
            )}
          </select>
          {activePresetId !== 'custom' && (
            <button
              type="button"
              className="studio-btn"
              aria-label={t('topbar.resetTemplateAria')}
              title={t('topbar.resetTemplateTitle')}
              onClick={() => onResetPreset(activePresetId)}
              style={{ width: 28, height: 30, padding: 0, flexShrink: 0 }}
            >
              <RotateCcw size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Center: Theme & Aspect Ratio */}
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div className="studio-pill-group" title={t('topbar.themeGroupTitle')}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '0 6px',
              color: 'var(--text-muted)',
            }}
          >
            <Palette size={13} />
          </span>
          {presentations.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`studio-pill-item ${scene.theme === p.id ? 'active' : ''}`}
              onClick={() => onChangeTheme(p.id)}
            >
              {pluginName(p.id, p.name)}
            </button>
          ))}
        </div>

        <div className="studio-pill-group" title={t('topbar.aspectGroupTitle')}>
          <button
            type="button"
            className={`studio-pill-item ${scene.aspectRatio === '16:9' ? 'active' : ''}`}
            onClick={() => onChangeAspectRatio('16:9')}
          >
            <Monitor size={13} />
            {t('topbar.aspectLandscape')}
          </button>
          <button
            type="button"
            className={`studio-pill-item ${scene.aspectRatio === '9:16' ? 'active' : ''}`}
            onClick={() => onChangeAspectRatio('9:16')}
          >
            <Smartphone size={13} />
            {t('topbar.aspectPortrait')}
          </button>
        </div>
      </div>

      {/* Right: Undo/Redo, More Menu (Files & Language), Unified Export Popover */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        <input
          ref={projectFileInputRef}
          type="file"
          accept=".json,.penova.json,.pencil.json,.md,.penova.md,.txt"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              onImportProjectJson(file);
            }
            e.currentTarget.value = '';
          }}
        />

        <div className="studio-pill-group" title={t('topbar.historyGroupTitle')}>
          <button
            type="button"
            className="studio-pill-item"
            aria-label={t('topbar.undoAria')}
            title={t('topbar.undoTitle')}
            disabled={!canUndo}
            onClick={onUndo}
            style={{
              padding: '0 6px',
              opacity: canUndo ? 1 : 0.35,
              cursor: canUndo ? 'pointer' : 'not-allowed',
            }}
          >
            <Undo2 size={13} />
          </button>
          <button
            type="button"
            className="studio-pill-item"
            aria-label={t('topbar.redoAria')}
            title={t('topbar.redoTitle')}
            disabled={!canRedo}
            onClick={onRedo}
            style={{
              padding: '0 6px',
              opacity: canRedo ? 1 : 0.35,
              cursor: canRedo ? 'pointer' : 'not-allowed',
            }}
          >
            <Redo2 size={13} />
          </button>
        </div>

        {/* Overflow Files & Language Popover */}
        <div ref={moreMenuRef} style={{ position: 'relative' }}>
          <button
            type="button"
            className={`studio-btn ${openMenu === 'more' ? 'active' : ''}`}
            onClick={() => setOpenMenu((m) => (m === 'more' ? null : 'more'))}
            title={t('topbar.menuTitle')}
            aria-label={t('topbar.menuTitle')}
            style={{ width: 30, padding: 0 }}
          >
            <MoreHorizontal size={15} />
          </button>

          {openMenu === 'more' && (
            <div className="studio-popover" style={{ minWidth: 214 }}>
              <button
                type="button"
                className="studio-popover-item"
                onClick={() => {
                  setOpenMenu(null);
                  onSaveProjectJson();
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12, fontWeight: 500 }}>
                  <Save size={13} />
                  {t('topbar.saveTitle')}
                </span>
              </button>
              <button
                type="button"
                className="studio-popover-item"
                onClick={() => {
                  setOpenMenu(null);
                  projectFileInputRef.current?.click();
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12, fontWeight: 500 }}>
                  <FolderOpen size={13} />
                  {t('topbar.importAria')}
                </span>
                <span style={{ fontSize: 10.5, color: 'var(--text-muted)', paddingLeft: 20 }}>
                  .penova.json / .penova.md
                </span>
              </button>

              <div
                style={{
                  height: 1,
                  background: 'var(--border-subtle)',
                  margin: '4px 6px',
                }}
              />

              <div
                style={{
                  padding: '4px 8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                }}
              >
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    fontSize: 11.5,
                    color: 'var(--text-secondary)',
                  }}
                >
                  <Globe size={12} />
                  {locale === 'zh-CN' ? '语言' : 'Language'}
                </span>
                <div className="studio-pill-group">
                  <button
                    type="button"
                    className={`studio-pill-item ${locale === 'en' ? 'active' : ''}`}
                    onClick={() => setLocale('en')}
                    style={{ height: 22, padding: '0 7px', fontSize: 11 }}
                  >
                    EN
                  </button>
                  <button
                    type="button"
                    className={`studio-pill-item ${locale === 'zh-CN' ? 'active' : ''}`}
                    onClick={() => setLocale('zh-CN')}
                    style={{ height: 22, padding: '0 7px', fontSize: 11 }}
                  >
                    中文
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Export Action / Unified Export Popover */}
        {exporting ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div
              style={{
                height: 30,
                padding: '0 12px',
                borderRadius: 7,
                background: 'var(--accent-dim)',
                border: '1px solid rgba(243, 201, 105, 0.45)',
                color: 'var(--accent)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 12,
                fontWeight: 600,
                whiteSpace: 'nowrap',
              }}
            >
              <span>{t('topbar.exportingPct', { pct: exportProgress })}</span>
            </div>
            <button
              type="button"
              className="studio-btn danger"
              onClick={onCancelExport}
              title={t('topbar.cancelExportTitle')}
            >
              <X size={14} />
              {t('topbar.cancel')}
            </button>
          </div>
        ) : (
          <div ref={exportMenuRef} style={{ position: 'relative' }}>
            <button
              type="button"
              className="studio-btn primary"
              onClick={() => setOpenMenu((m) => (m === 'export' ? null : 'export'))}
              title={t('topbar.exportFormatTitle')}
              style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
            >
              <Download size={14} />
              {t('topbar.exportBtn')}
              <ChevronDown size={13} />
            </button>

            {openMenu === 'export' && (
              <div className="studio-popover" style={{ minWidth: 274 }}>
                <div
                  style={{
                    fontSize: 10.5,
                    fontWeight: 600,
                    color: 'var(--text-muted)',
                    padding: '4px 9px 2px',
                  }}
                >
                  {t('topbar.exportMenuSnapshots')}
                </div>
                {snapshotExporters.map((exp) => {
                  const supported = exp.isSupported ? exp.isSupported() : true;
                  const label = pluginName(exp.id, exp.name);
                  return (
                    <button
                      key={exp.id}
                      type="button"
                      className="studio-popover-item"
                      disabled={!supported}
                      onClick={() => {
                        setOpenMenu(null);
                        onStartExport(exp.id);
                      }}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600 }}>
                        {exp.id === 'poster-svg' ? <FileCode2 size={13} color="var(--accent)" /> : <Image size={13} color="var(--accent)" />}
                        {supported ? label : t('topbar.exporterUnavailable', { label })}
                      </span>
                      <span style={{ fontSize: 10.8, color: 'var(--text-secondary)', paddingLeft: 19 }}>
                        {exporterDesc(exp.id, exp.description)}
                      </span>
                    </button>
                  );
                })}

                <div
                  style={{
                    height: 1,
                    background: 'var(--border-subtle)',
                    margin: '4px 6px',
                  }}
                />

                <div
                  style={{
                    fontSize: 10.5,
                    fontWeight: 600,
                    color: 'var(--text-muted)',
                    padding: '4px 9px 2px',
                  }}
                >
                  {t('topbar.exportMenuVideos')}
                </div>
                {sequenceExporters.map((exp) => {
                  const supported = exp.isSupported ? exp.isSupported() : true;
                  const label = pluginName(exp.id, exp.name);
                  return (
                    <button
                      key={exp.id}
                      type="button"
                      className="studio-popover-item"
                      disabled={!supported}
                      onClick={() => {
                        setOpenMenu(null);
                        onStartExport(exp.id);
                      }}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600 }}>
                        <Video size={13} color="#7dd8f7" />
                        {supported ? label : t('topbar.exporterUnavailable', { label })}
                      </span>
                      <span style={{ fontSize: 10.8, color: 'var(--text-secondary)', paddingLeft: 19 }}>
                        {exporterDesc(exp.id, exp.description)}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
