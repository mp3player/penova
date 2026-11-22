import { HandPlugin } from '../contracts';

export const hiddenHandPlugin: HandPlugin = {
  id: 'hidden',
  name: '隐藏',
  draw() {
    // Intentional no-op for clean unobstructed drawing mode
  },
};
