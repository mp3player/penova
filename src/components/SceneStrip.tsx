import React from 'react';
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Copy,
  Film,
  Plus,
  Trash2,
} from 'lucide-react';
import { LessonProject } from '../model/project';
import { TransitionId } from '../model/scene';
import { transitionRegistry, useRegistryList } from '../plugins';
import { useI18n } from '../i18n';

interface SceneStripProps {
  project: LessonProject;
  activeSceneIndex: number;
  onSelectScene: (index: number) => void;
  onAddScene: () => void;
  onDuplicateScene: (index: number) => void;
  onDeleteScene: (index: number) => void;
  onMoveScene: (index: number, delta: -1 | 1) => void;
  onChangeTransition: (sceneIndex: number, transitionId: TransitionId) => void;
}

export const SceneStrip: React.FC<SceneStripProps> = ({
  project,
  activeSceneIndex,
  onSelectScene,
  onAddScene,
  onDuplicateScene,
  onDeleteScene,
  onMoveScene,
  onChangeTransition,
}) => {
  const { t, pluginName } = useI18n();
  const transitions = useRegistryList(transitionRegistry);
  const canMultiActions = project.scenes.length > 1;

  return (
    <div
      style={{
        height: 36,
        flexShrink: 0,
        background: '#11151c',
        borderTop: '1px solid var(--border-subtle)',
        padding: '0 14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          overflowX: 'auto',
          overflowY: 'hidden',
          minWidth: 0,
          flex: 1,
          padding: '2px 0',
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 11,
            color: 'var(--text-muted)',
            whiteSpace: 'nowrap',
            marginRight: 2,
          }}
        >
          <Film size={12} />
          {t('scenes.stripLabel')}
        </span>

        {project.scenes.map((scene, idx) => {
          const isActive = idx === activeSceneIndex;
          const activeTrans = scene.transitionOut?.type ?? 'chalkboard-eraser';
          const sceneDisplayTitle =
            scene.title || t('scenes.fallbackTitle', { num: idx + 1 });

          return (
            <React.Fragment key={scene.id}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  height: 26,
                  borderRadius: 6,
                  border: isActive
                    ? '1px solid rgba(243, 201, 105, 0.5)'
                    : '1px solid var(--border-subtle)',
                  background: isActive ? 'var(--accent-dim)' : '#181e27',
                  padding: '0 4px 0 8px',
                  gap: 4,
                  flexShrink: 0,
                }}
              >
                <button
                  type="button"
                  onClick={() => onSelectScene(idx)}
                  title={t('scenes.switchTitle', {
                    num: idx + 1,
                    title: sceneDisplayTitle,
                  })}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    padding: 0,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 11.5,
                    fontWeight: isActive ? 600 : 500,
                    color: isActive ? '#f7d584' : 'var(--text-secondary)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <span style={{ opacity: 0.72 }}>{idx + 1}.</span>
                  <span
                    style={{
                      maxWidth: 140,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {sceneDisplayTitle}
                  </span>
                </button>

                {isActive && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 1,
                      marginLeft: 2,
                      paddingLeft: 4,
                      borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
                    }}
                  >
                    <button
                      type="button"
                      className="studio-btn"
                      onClick={() => onDuplicateScene(idx)}
                      title={t('scenes.duplicateTitle')}
                      style={{
                        width: 20,
                        height: 20,
                        padding: 0,
                        border: 'none',
                        background: 'transparent',
                      }}
                    >
                      <Copy size={11} />
                    </button>
                    {canMultiActions && (
                      <>
                        <button
                          type="button"
                          className="studio-btn"
                          onClick={() => onMoveScene(idx, -1)}
                          disabled={idx === 0}
                          title={t('scenes.movePrevTitle')}
                          style={{
                            width: 18,
                            height: 20,
                            padding: 0,
                            border: 'none',
                            background: 'transparent',
                          }}
                        >
                          <ChevronLeft size={12} />
                        </button>
                        <button
                          type="button"
                          className="studio-btn"
                          onClick={() => onMoveScene(idx, 1)}
                          disabled={idx === project.scenes.length - 1}
                          title={t('scenes.moveNextTitle')}
                          style={{
                            width: 18,
                            height: 20,
                            padding: 0,
                            border: 'none',
                            background: 'transparent',
                          }}
                        >
                          <ChevronRight size={12} />
                        </button>
                        <button
                          type="button"
                          className="studio-btn danger"
                          onClick={() => onDeleteScene(idx)}
                          title={t('scenes.deleteTitle')}
                          style={{
                            width: 20,
                            height: 20,
                            padding: 0,
                            border: 'none',
                            background: 'transparent',
                          }}
                        >
                          <Trash2 size={11} />
                        </button>
                      </>
                    )}
                  </span>
                )}
              </div>

              {idx < project.scenes.length - 1 && (
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 3,
                    flexShrink: 0,
                  }}
                >
                  <ArrowRight size={11} color="var(--text-muted)" />
                  <select
                    className="studio-select"
                    value={activeTrans}
                    aria-label={t('scenes.transitionAria', { num: idx + 1 })}
                    title={t('scenes.transitionTitle', {
                      from: idx + 1,
                      to: idx + 2,
                    })}
                    onChange={(e) =>
                      onChangeTransition(idx, e.target.value as TransitionId)
                    }
                    style={{
                      width: 'auto',
                      height: 24,
                      fontSize: 11,
                      padding: '0 6px',
                      background: '#161c25',
                      color: '#7dd8f7',
                      borderColor: 'rgba(125, 216, 247, 0.28)',
                    }}
                  >
                    {transitions.map((tr) => (
                      <option key={tr.id} value={tr.id}>
                        {pluginName(tr.id, tr.name)}
                      </option>
                    ))}
                  </select>
                  <ArrowRight size={11} color="var(--text-muted)" />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      <button
        type="button"
        className="studio-btn"
        onClick={onAddScene}
        title={t('scenes.newSceneTitle')}
        style={{
          height: 26,
          fontSize: 11.5,
          padding: '0 9px',
          flexShrink: 0,
        }}
      >
        <Plus size={12} />
        {t('scenes.newSceneBtn')}
      </button>
    </div>
  );
};
