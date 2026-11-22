import { useSyncExternalStore } from 'react';
import { PluginRegistry } from './registry';

export function useRegistryList<T extends { id: string }>(
  registry: PluginRegistry<T>
): T[] {
  return useSyncExternalStore(
    (listener) => registry.subscribe(listener),
    () => registry.list(),
    () => registry.list()
  );
}
