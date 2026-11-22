import { MessageKey } from '../../i18n';
import { ChalkColor, GroupSceneNode, TextAlign } from '../../model/scene';

export const COLOR_OPTIONS: { id: ChalkColor; key: MessageKey }[] = [
  { id: 'white', key: 'color.white' },
  { id: 'yellow', key: 'color.yellow' },
  { id: 'cyan', key: 'color.cyan' },
  { id: 'pink', key: 'color.pink' },
  { id: 'green', key: 'color.green' },
  { id: 'orange', key: 'color.orange' },
];

export const ALIGN_OPTIONS: { id: TextAlign; key: MessageKey }[] = [
  { id: 'left', key: 'align.left' },
  { id: 'center', key: 'align.center' },
  { id: 'right', key: 'align.right' },
];

export const ARRANGE_OPTIONS: {
  id: NonNullable<GroupSceneNode['arrange']>;
  key: MessageKey;
}[] = [
  { id: 'card', key: 'arrange.card' },
  { id: 'stack', key: 'arrange.stack' },
  { id: 'free', key: 'arrange.free' },
];
