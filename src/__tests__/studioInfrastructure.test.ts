import { describe, expect, it } from 'vitest';
import {
  createHistory,
  pushHistory,
  redoHistory,
  resetHistory,
  undoHistory,
} from '../model/history';
import {
  parseProjectFromJson,
  PROJECT_SCHEMA_VERSION,
  serializeProjectToJson,
} from '../model/projectStorage';
import { PRESET_PROJECTS } from '../model/presets';
import { createCustomNode } from '../model/builders';
import { cloneProject } from '../model/project';
import { isCustomSceneNode } from '../model/scene';
import { compileProjectTimeline } from '../engine/timeline/projectTimeline';
import {
  formatSrtTimestamp,
  generateAutoSubtitles,
  getActiveSubtitleAt,
  parseSrtToSubtitles,
  serializeSubtitlesToSrt,
} from '../engine/subtitle/subtitleEngine';

describe('history stack (Undo/Redo)', () => {
  it('pushes states, coalesces consecutive updates, caps maxEntries, and supports undo/redo', () => {
    let h = createHistory(1);
    h = pushHistory(h, 2);
    h = pushHistory(h, 3, { coalesce: true }); // replaces 2 in-place
    expect(h.past).toEqual([1]);
    expect(h.present).toBe(3);

    h = pushHistory(h, 4);
    expect(h.past).toEqual([1, 3]);
    expect(h.present).toBe(4);

    h = undoHistory(h);
    expect(h.present).toBe(3);
    expect(h.future).toEqual([4]);

    h = redoHistory(h);
    expect(h.present).toBe(4);
    expect(h.future).toEqual([]);

    // Undo then push a new edit clears future branch
    h = undoHistory(h);
    h = pushHistory(h, 99);
    expect(h.future).toEqual([]);
    expect(h.present).toBe(99);

    // Cap past entries at maxEntries
    let capped = resetHistory(0);
    for (let i = 1; i <= 10; i++) {
      capped = pushHistory(capped, i, { maxEntries: 3 });
    }
    expect(capped.past).toEqual([7, 8, 9]);
    expect(capped.present).toBe(10);
  });
});

describe('projectStorage (JSON serialize/parse)', () => {
  it('round-trips multi-scene project with transitions and subtitles cleanly', () => {
    const multi = cloneProject(
      PRESET_PROJECTS.find((p) => p.id === 'http-lesson-multi')!
    );
    multi.subtitles = [
      { id: 's1', startMs: 0, endMs: 2400, text: '欢迎来到 HTTP 课程' },
    ];
    multi.showSubtitles = true;

    const json = serializeProjectToJson(multi);
    const parsedRaw = JSON.parse(json) as {
      format: string;
      version: number;
    };
    expect(parsedRaw.format).toBe('penova-project');
    expect(parsedRaw.version).toBe(PROJECT_SCHEMA_VERSION);

    const { project: restored, warnings } = parseProjectFromJson(json);
    expect(warnings).toEqual([]);
    expect(restored.id).toBe(multi.id);
    expect(restored.scenes).toHaveLength(2);
    expect(restored.scenes[0].transitionOut?.type).toBe('chalkboard-eraser');
    expect(restored.subtitles).toEqual(multi.subtitles);
    expect(restored.showSubtitles).toBe(true);
  });

  it('rejects invalid JSON or empty scenes cleanly', () => {
    expect(() => parseProjectFromJson('{not-json')).toThrow();
    expect(() => parseProjectFromJson('{"scenes": []}')).toThrow();
  });

  it('sanitizes malformed or partial nodes on JSON import without throwing at compile time', () => {
    const dirtyJson = JSON.stringify({
      format: 'pencil-project',
      version: 1,
      project: {
        id: 'dirty-1',
        title: '损坏修复测试',
        aspectRatio: '16:9',
        scenes: [
          {
            id: 's-1',
            title: '修复幕',
            nodes: [
              'not-an-object',
              { id: 'bad-type', type: 'video', color: 'white' },
              {
                id: 't-ok',
                type: 'text',
                text: '正常文字',
                color: 'not-a-color',
                offset: { x: 'NaN', y: 12 },
              },
              {
                id: 'g-bad-children',
                type: 'group',
                name: '无子列表',
                color: 'cyan',
              },
            ],
          },
        ],
      },
    });

    const { project, warnings } = parseProjectFromJson(dirtyJson);
    expect(warnings.length).toBeGreaterThanOrEqual(3);
    expect(project.scenes[0].nodes).toHaveLength(2);
    expect(project.scenes[0].nodes[0].color).toBe('white');
    expect(project.scenes[0].nodes[0].offset).toBeUndefined();

    const compiled = compileProjectTimeline(project);
    expect(compiled.totalDurationMs).toBeGreaterThan(0);
  });

  it('preserves CustomSceneNode kind and props during JSON serialize/parse', () => {
    const project = cloneProject(PRESET_PROJECTS[0]);
    project.scenes[0].nodes.push(
      createCustomNode({
        id: 'custom-json-1',
        kind: 'key-value',
        name: 'Throughput',
        color: 'green',
        props: { key: 'QPS', value: 1200, healthy: true },
      })
    );

    const json = serializeProjectToJson(project);
    const { project: restored, warnings } = parseProjectFromJson(json);
    expect(warnings).toEqual([]);
    const restoredCustom = restored.scenes[0].nodes.find(
      (n) => n.id === 'custom-json-1'
    );
    expect(restoredCustom).toBeDefined();
    expect(restoredCustom && isCustomSceneNode(restoredCustom)).toBe(true);
    if (restoredCustom && isCustomSceneNode(restoredCustom)) {
      expect(restoredCustom.kind).toBe('key-value');
      expect(restoredCustom.props).toEqual({
        key: 'QPS',
        value: 1200,
        healthy: true,
      });
    }
  });
});

describe('subtitleEngine (auto-generate & SRT round-trip)', () => {
  it('generates timed cues across multi-scene timelines and queries active subtitle', () => {
    const multi = cloneProject(
      PRESET_PROJECTS.find((p) => p.id === 'http-lesson-multi')!
    );
    const compiled = compileProjectTimeline(multi);
    const cues = generateAutoSubtitles(compiled);

    const expectedTotalSteps =
      compiled.segments[0].timeline.steps.length +
      compiled.segments[1].timeline.steps.length;
    expect(cues).toHaveLength(expectedTotalSteps);
    expect(cues[0].startMs).toBe(0);

    for (let i = 1; i < cues.length; i++) {
      expect(cues[i].startMs).toBeGreaterThanOrEqual(cues[i - 1].startMs);
    }

    const firstCue = cues[0];
    expect(getActiveSubtitleAt(cues, firstCue.startMs + 50)?.id).toBe(
      firstCue.id
    );
    expect(
      getActiveSubtitleAt(cues, compiled.totalDurationMs + 5000)
    ).toBeUndefined();
  });

  it('round-trips subtitles through SubRip (.srt) format accurately', () => {
    expect(formatSrtTimestamp(3_723_456)).toBe('01:02:03,456');

    const original = [
      { id: 'c1', startMs: 0, endMs: 2450, text: '第一句讲解文字' },
      { id: 'c2', startMs: 3100, endMs: 6820, text: '第二句重点说明' },
    ];
    const srt = serializeSubtitlesToSrt(original);
    const parsed = parseSrtToSubtitles(srt);

    expect(parsed).toHaveLength(2);
    expect(parsed[0].startMs).toBe(0);
    expect(parsed[0].endMs).toBe(2450);
    expect(parsed[0].text).toBe('第一句讲解文字');
    expect(parsed[1].startMs).toBe(3100);
    expect(parsed[1].endMs).toBe(6820);
    expect(parsed[1].text).toBe('第二句重点说明');
  });
});
