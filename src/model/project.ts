import { createCardNode, createTextNode } from './builders';
import {
  AspectRatio,
  cloneSceneNode,
  LessonScene,
  SceneNode,
} from './scene';

export interface SubtitleCue {
  id: string;
  startMs: number;
  endMs: number;
  text: string;
}

export interface LessonProject {
  id: string;
  title: string;
  aspectRatio: AspectRatio;
  scenes: LessonScene[];
  subtitles?: SubtitleCue[];
  showSubtitles?: boolean;
}

export function cloneSceneWithDetails(scene: LessonScene): LessonScene {
  return {
    ...scene,
    nodes: scene.nodes.map(cloneSceneNode),
    customSteps: scene.customSteps
      ? scene.customSteps.map((s) => ({
          ...s,
          nodeIds: [...s.nodeIds],
        }))
      : undefined,
    transitionOut: scene.transitionOut ? { ...scene.transitionOut } : undefined,
  };
}

export function createProjectFromScene(scene: LessonScene): LessonProject {
  const cloned = cloneSceneWithDetails(scene);
  return {
    id: `proj-${cloned.id}`,
    title: cloned.title,
    aspectRatio: cloned.aspectRatio,
    scenes: [cloned],
  };
}

export function cloneProject(project: LessonProject): LessonProject {
  return {
    ...project,
    scenes: project.scenes.map(cloneSceneWithDetails),
    subtitles: project.subtitles
      ? project.subtitles.map((c) => ({ ...c }))
      : undefined,
  };
}

export function createBlankScene(
  template: LessonScene,
  index: number,
  locale: 'en' | 'zh-CN' = 'en'
): LessonScene {
  const uid = `${Date.now().toString(36)}-${index + 1}`;
  const isDoc = template.layoutMode === 'document';
  const isEn = locale === 'en';
  const starterNodes: SceneNode[] = isDoc
    ? [
        createTextNode({
          id: `scene-${uid}-p1`,
          name: isEn ? 'New Paragraph' : '新段落',
          text: isEn
            ? `Scene ${index + 1} body paragraph. Edit directly in the Outline or Document tab.`
            : `第 ${index + 1} 幕正文内容，可直接在右侧或文稿视图中编辑。`,
          align: 'left',
          indentChars: 2,
          fontSize: 21,
          maxWidth: 580,
          color: 'white',
        }),
      ]
    : [
        createCardNode({
          id: `scene-${uid}-root`,
          label: isEn ? `Scene ${index + 1} Topic` : `第 ${index + 1} 幕核心主题`,
          subtitle: isEn
            ? 'Double-click or expand outline to add nodes'
            : '双击或展开大纲继续细化节点',
          role: 'root',
          color: 'yellow',
          shape: 'rounded',
        }),
      ];

  return {
    id: `scene-${uid}`,
    title: isEn ? `Scene ${index + 1}` : `第 ${index + 1} 幕`,
    theme: template.theme,
    layoutMode: template.layoutMode,
    cameraMode: template.cameraMode,
    aspectRatio: template.aspectRatio,
    handStyle: template.handStyle,
    nodes: starterNodes,
    transitionOut: {
      type: template.theme === 'letter-paper' ? 'page-turn' : 'chalkboard-eraser',
    },
  };
}
