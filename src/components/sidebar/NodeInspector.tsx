import React from 'react';
import { isCustomSceneNode, SceneNode } from '../../model/scene';
import { ShapePlugin } from '../../plugins';
import { ConnectorNodeInspector } from './inspectors/ConnectorNodeInspector';
import { CustomNodeInspector } from './inspectors/CustomNodeInspector';
import { GroupNodeInspector } from './inspectors/GroupNodeInspector';
import { ShapeNodeInspector } from './inspectors/ShapeNodeInspector';
import { TextNodeInspector } from './inspectors/TextNodeInspector';

interface NodeInspectorProps {
  node: SceneNode;
  shapeOptions: ShapePlugin[];
  topVertices: SceneNode[];
  supportsGroups: boolean;
  onUpdateNode: (nodeId: string, updater: (node: SceneNode) => SceneNode) => void;
  onAddChildToGroup: (groupId: string, kind: 'text' | 'shape') => void;
}

export const NodeInspector: React.FC<NodeInspectorProps> = ({
  node,
  shapeOptions,
  topVertices,
  supportsGroups,
  onUpdateNode,
  onAddChildToGroup,
}) => {
  switch (node.type) {
    case 'text':
      return <TextNodeInspector node={node} onUpdateNode={onUpdateNode} />;
    case 'shape':
      return (
        <ShapeNodeInspector
          node={node}
          shapeOptions={shapeOptions}
          onUpdateNode={onUpdateNode}
        />
      );
    case 'connector':
      return (
        <ConnectorNodeInspector
          node={node}
          topVertices={topVertices}
          onUpdateNode={onUpdateNode}
        />
      );
    case 'group':
      return (
        <GroupNodeInspector
          node={node}
          shapeOptions={shapeOptions}
          supportsGroups={supportsGroups}
          onUpdateNode={onUpdateNode}
          onAddChildToGroup={onAddChildToGroup}
        />
      );
    default:
      return isCustomSceneNode(node) ? (
        <CustomNodeInspector
          node={node}
          supportsGroups={supportsGroups}
          onUpdateNode={onUpdateNode}
        />
      ) : null;
  }
};
