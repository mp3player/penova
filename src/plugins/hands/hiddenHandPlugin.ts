import { HandPlugin } from '../contracts';

export const hiddenHandPlugin: HandPlugin = {
  id: 'hidden',
  name: 'Hidden',
  draw() {
    // Intentional no-op for clean unobstructed drawing mode
  },
};
