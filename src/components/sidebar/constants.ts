import { ChalkColor, GroupSceneNode, TextAlign } from '../../model/scene';

export const COLOR_OPTIONS: { id: ChalkColor; label: string }[] = [
  { id: 'white', label: '纯白/墨' },
  { id: 'yellow', label: '亮黄' },
  { id: 'cyan', label: '青蓝' },
  { id: 'pink', label: '珊瑚粉' },
  { id: 'green', label: '薄荷绿' },
  { id: 'orange', label: '琥珀橙' },
];

export const ALIGN_OPTIONS: { id: TextAlign; label: string }[] = [
  { id: 'left', label: '左对齐' },
  { id: 'center', label: '居中' },
  { id: 'right', label: '右对齐' },
];

export const ARRANGE_OPTIONS: {
  id: NonNullable<GroupSceneNode['arrange']>;
  label: string;
}[] = [
  { id: 'card', label: '卡片自适应' },
  { id: 'stack', label: '纵向堆叠' },
  { id: 'free', label: '自由组合' },
];
