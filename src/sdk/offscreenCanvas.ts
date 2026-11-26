export type OffscreenCanvasFactory = (
  width: number,
  height: number
) => HTMLCanvasElement;

export type CanvasPath2DFactory = (svgPath: string) => Path2D;

let activeOffscreenCanvasFactory: OffscreenCanvasFactory | null = null;
let activePath2DFactory: CanvasPath2DFactory | null = null;
const factoryResetListeners = new Set<() => void>();

export function setPath2DFactory(factory: CanvasPath2DFactory | null): void {
  activePath2DFactory = factory;
}

export function createPath2D(svgPath: string): Path2D | null {
  if (activePath2DFactory) {
    return activePath2DFactory(svgPath);
  }
  if (typeof Path2D !== 'undefined') {
    return new Path2D(svgPath);
  }
  return null;
}

export function onOffscreenCanvasFactoryChange(
  listener: () => void
): () => void {
  factoryResetListeners.add(listener);
  return () => {
    factoryResetListeners.delete(listener);
  };
}

export function setOffscreenCanvasFactory(
  factory: OffscreenCanvasFactory | null
): void {
  activeOffscreenCanvasFactory = factory;
  for (const listener of factoryResetListeners) {
    listener();
  }
}

export function hasOffscreenCanvasSupport(): boolean {
  return (
    activeOffscreenCanvasFactory !== null || typeof document !== 'undefined'
  );
}

export function createOffscreenCanvas(
  width = 300,
  height = 150
): HTMLCanvasElement | null {
  const safeW = Math.max(1, Math.round(width));
  const safeH = Math.max(1, Math.round(height));
  if (activeOffscreenCanvasFactory) {
    return activeOffscreenCanvasFactory(safeW, safeH);
  }
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    canvas.width = safeW;
    canvas.height = safeH;
    return canvas;
  }
  return null;
}
