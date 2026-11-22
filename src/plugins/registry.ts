import {
  CameraPlugin,
  ExportPlugin,
  GlyphProviderPlugin,
  HandPlugin,
  LayoutPlugin,
  PresentationPlugin,
  ShapePlugin,
  TransitionPlugin,
} from './contracts';

export class PluginRegistry<T extends { id: string }> {
  private readonly items = new Map<string, T>();
  private readonly listeners = new Set<() => void>();
  private readonly kindLabel: string;
  private cachedList: T[] | null = null;

  constructor(kindLabel: string) {
    this.kindLabel = kindLabel;
  }

  public register(plugin: T, options?: { override?: boolean }): void {
    if (this.items.has(plugin.id) && !options?.override) {
      throw new Error(
        `Duplicate ${this.kindLabel} plugin id "${plugin.id}". Pass { override: true } to replace it.`
      );
    }
    this.items.set(plugin.id, plugin);
    this.notifyChanged();
  }

  public unregister(id: string): boolean {
    const deleted = this.items.delete(id);
    if (deleted) {
      this.notifyChanged();
    }
    return deleted;
  }

  public get(id: string): T | undefined {
    return this.items.get(id);
  }

  public getOrDefault(id: string): T {
    const exact = this.items.get(id);
    if (exact) return exact;
    const first = this.items.values().next().value;
    if (!first) {
      throw new Error(
        `${this.kindLabel} registry is empty; ensure built-in plugins are registered.`
      );
    }
    return first;
  }

  public has(id: string): boolean {
    return this.items.has(id);
  }

  public list(): T[] {
    if (!this.cachedList) {
      this.cachedList = Array.from(this.items.values());
    }
    return this.cachedList;
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public notifyChanged(): void {
    this.cachedList = null;
    for (const listener of this.listeners) {
      listener();
    }
  }
}

export const layoutRegistry = new PluginRegistry<LayoutPlugin>('layout');
export const presentationRegistry = new PluginRegistry<PresentationPlugin>(
  'presentation'
);
export const shapeRegistry = new PluginRegistry<ShapePlugin>('shape');
export const glyphProviderRegistry = new PluginRegistry<GlyphProviderPlugin>(
  'glyph-provider'
);
export const handRegistry = new PluginRegistry<HandPlugin>('hand');
export const cameraRegistry = new PluginRegistry<CameraPlugin>('camera');
export const transitionRegistry = new PluginRegistry<TransitionPlugin>(
  'transition'
);
export const exportRegistry = new PluginRegistry<ExportPlugin>('export');
