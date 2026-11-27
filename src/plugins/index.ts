import {
  cameraRegistry,
  exportRegistry,
  glyphProviderRegistry,
  handRegistry,
  layoutRegistry,
  presentationRegistry,
  sceneNodeRegistry,
  shapeRegistry,
  transitionRegistry,
} from './registry';

import {
  iconNodePlugin,
  sketchNodePlugin,
} from './nodes/sketchNodePlugin';
import { codeNodePlugin } from './nodes/codeNodePlugin';
import { chartNodePlugin } from './nodes/chartNodePlugin';
import { waveNodePlugin } from './nodes/waveNodePlugin';
import { annotateNodePlugin } from './nodes/annotateNodePlugin';

import { roundedShapePlugin } from './shapes/roundedShape';
import { circleShapePlugin } from './shapes/circleShape';
import { cloudShapePlugin } from './shapes/cloudShape';
import { underlineShapePlugin } from './shapes/underlineShape';
import { diamondShapePlugin } from './shapes/diamondShape';
import { dividerShapePlugin } from './shapes/dividerShape';

import { flowHorizontalPlugin } from './layouts/flowHorizontalPlugin';
import { flowVerticalPlugin } from './layouts/flowVerticalPlugin';
import { mindmapPlugin } from './layouts/mindmapPlugin';
import { conceptGraphPlugin } from './layouts/conceptGraphPlugin';
import { documentLayoutPlugin } from './layouts/documentLayoutPlugin';
import { freeformLayoutPlugin } from './layouts/freeformLayoutPlugin';

import { chalkboardPlugin } from './presentations/chalkboardPlugin';
import { whiteboardPlugin } from './presentations/whiteboardPlugin';
import { blueprintPlugin } from './presentations/blueprintPlugin';
import { letterPaperPlugin } from './presentations/letterPaperPlugin';

import {
  cjkStrokeOrderGlyphProvider,
  ensureCjkStrokeDataLoaded,
  registerCjkStrokeMedians,
  registerCjkStrokeOutlines,
} from './glyphs/cjkStrokeData';
import {
  registerStrokeOrderGlyphs,
  strokeOrderGlyphProvider,
} from './glyphs/strokeOrderProvider';
import { inkGridGlyphProvider } from './glyphs/inkGridProvider';

import { illustratedHandPlugin } from './hands/illustratedHandPlugin';
import { minimalHandPlugin } from './hands/minimalHandPlugin';
import { tipOnlyHandPlugin } from './hands/tipOnlyHandPlugin';
import { hiddenHandPlugin } from './hands/hiddenHandPlugin';
import { createImageHandPlugin } from './hands/imageHandFactory';

import { autoFollowCameraPlugin } from './cameras/autoFollowCamera';
import { progressiveFitCameraPlugin } from './cameras/progressiveFitCamera';
import { staticOverviewCameraPlugin } from './cameras/staticOverviewCamera';
import { penFollowCameraPlugin } from './cameras/penFollowCamera';

import { chalkboardEraserTransitionPlugin } from './transitions/chalkboardEraserTransition';
import { pageTurnTransitionPlugin } from './transitions/pageTurnTransition';
import { crossfadeTransitionPlugin } from './transitions/crossfadeTransition';
import { cutTransitionPlugin } from './transitions/cutTransition';

import { mediaRecorderExporterPlugin } from './exporters/mediaRecorderExporter';
import { posterPngExporterPlugin } from './exporters/posterPngExporter';
import { pngSequenceTarExporterPlugin } from './exporters/pngSequenceTarExporter';
import { posterSvgExporterPlugin } from './exporters/posterSvgExporter';
import { svgSequenceTarExporterPlugin } from './exporters/svgSequenceTarExporter';
import {
  initNodeCanvasRuntime,
  nodeMp4ExporterPlugin,
} from './exporters/nodeMp4Exporter';
import { createHttpBridgeExportPlugin } from './exporters/httpBridgeFactory';

let initialized = false;

export function registerBuiltinPlugins(): void {
  if (initialized) return;
  initialized = true;

  // Register shapes
  shapeRegistry.register(roundedShapePlugin, { override: true });
  shapeRegistry.register(circleShapePlugin, { override: true });
  shapeRegistry.register(cloudShapePlugin, { override: true });
  shapeRegistry.register(underlineShapePlugin, { override: true });
  shapeRegistry.register(diamondShapePlugin, { override: true });
  shapeRegistry.register(dividerShapePlugin, { override: true });

  // Register custom SceneNode visual widgets
  sceneNodeRegistry.register(iconNodePlugin, { override: true });
  sceneNodeRegistry.register(sketchNodePlugin, { override: true });
  sceneNodeRegistry.register(codeNodePlugin, { override: true });
  sceneNodeRegistry.register(chartNodePlugin, { override: true });
  sceneNodeRegistry.register(waveNodePlugin, { override: true });
  sceneNodeRegistry.register(annotateNodePlugin, { override: true });

  // Register layouts
  layoutRegistry.register(flowHorizontalPlugin, { override: true });
  layoutRegistry.register(flowVerticalPlugin, { override: true });
  layoutRegistry.register(mindmapPlugin, { override: true });
  layoutRegistry.register(conceptGraphPlugin, { override: true });
  layoutRegistry.register(documentLayoutPlugin, { override: true });
  layoutRegistry.register(freeformLayoutPlugin, { override: true });

  // Register presentations
  presentationRegistry.register(chalkboardPlugin, { override: true });
  presentationRegistry.register(whiteboardPlugin, { override: true });
  presentationRegistry.register(blueprintPlugin, { override: true });
  presentationRegistry.register(letterPaperPlugin, { override: true });

  // Register glyph stroke providers (sorted by priority descending at lookup)
  glyphProviderRegistry.register(cjkStrokeOrderGlyphProvider, { override: true });
  glyphProviderRegistry.register(strokeOrderGlyphProvider, { override: true });
  glyphProviderRegistry.register(inkGridGlyphProvider, { override: true });

  // Register writing hands
  handRegistry.register(illustratedHandPlugin, { override: true });
  handRegistry.register(minimalHandPlugin, { override: true });
  handRegistry.register(tipOnlyHandPlugin, { override: true });
  handRegistry.register(hiddenHandPlugin, { override: true });

  // Register cameras
  cameraRegistry.register(autoFollowCameraPlugin, { override: true });
  cameraRegistry.register(progressiveFitCameraPlugin, { override: true });
  cameraRegistry.register(staticOverviewCameraPlugin, { override: true });
  cameraRegistry.register(penFollowCameraPlugin, { override: true });

  // Register scene transitions
  transitionRegistry.register(chalkboardEraserTransitionPlugin, { override: true });
  transitionRegistry.register(pageTurnTransitionPlugin, { override: true });
  transitionRegistry.register(crossfadeTransitionPlugin, { override: true });
  transitionRegistry.register(cutTransitionPlugin, { override: true });

  // Register exporters
  exportRegistry.register(mediaRecorderExporterPlugin, { override: true });
  exportRegistry.register(posterPngExporterPlugin, { override: true });
  exportRegistry.register(pngSequenceTarExporterPlugin, { override: true });
  exportRegistry.register(posterSvgExporterPlugin, { override: true });
  exportRegistry.register(svgSequenceTarExporterPlugin, { override: true });
  exportRegistry.register(nodeMp4ExporterPlugin, { override: true });
}

registerBuiltinPlugins();

import { useRegistryList } from './useRegistryList';
import { stripMarkdownFence } from './codecs/shared';
import {
  isMermaidScript,
  mermaidScriptCodec,
  parseMermaidToScene,
} from './codecs/mermaidCodec';

export * from './contracts';
export * from './registry';
export {
  useRegistryList,
  cjkStrokeOrderGlyphProvider,
  ensureCjkStrokeDataLoaded,
  registerCjkStrokeMedians,
  registerCjkStrokeOutlines,
  registerStrokeOrderGlyphs,
  createImageHandPlugin,
  createHttpBridgeExportPlugin,
  initNodeCanvasRuntime,
  nodeMp4ExporterPlugin,
  stripMarkdownFence,
  annotateNodePlugin,
  isMermaidScript,
  mermaidScriptCodec,
  parseMermaidToScene,
};
