import React from 'react';
import { Plus } from 'lucide-react';
import {
  getCardSummary,
  isCardGroupNode,
  updateCardGroupNode,
} from '../../../model/builders';
import {
  CardRole,
  ChalkColor,
  GroupSceneNode,
  NodeShape,
  SceneNode,
} from '../../../model/scene';
import { ShapePlugin } from '../../../plugins';
import { useI18n } from '../../../i18n';
import { ARRANGE_OPTIONS, COLOR_OPTIONS } from '../constants';

const CARD_ROLES: CardRole[] = ['root', 'step', 'concept', 'highlight', 'note'];

interface GroupNodeInspectorProps {
  node: GroupSceneNode;
  shapeOptions?: ShapePlugin[];
  supportsGroups: boolean;
  onUpdateNode: (nodeId: string, updater: (node: SceneNode) => SceneNode) => void;
  onAddChildToGroup: (groupId: string, kind: 'text' | 'shape') => void;
}

export const GroupNodeInspector: React.FC<GroupNodeInspectorProps> = ({
  node,
  shapeOptions = [],
  supportsGroups,
  onUpdateNode,
  onAddChildToGroup,
}) => {
  const { t, pluginName } = useI18n();
  const isCard: boolean = isCardGroupNode(node);
  const summary = getCardSummary(node);
  const zoneVal = typeof node.meta?.zone === 'string' ? node.meta.zone : '';
  const sayVal = typeof node.meta?.say === 'string' ? node.meta.say : '';
  const pauseVal =
    typeof node.meta?.pause === 'number' && Number.isFinite(node.meta.pause)
      ? String(node.meta.pause)
      : '';

  const updateMetaField = (
    key: 'zone' | 'say' | 'pause',
    val: string | number | undefined
  ) => {
    onUpdateNode(node.id, (c) => {
      if (isCardGroupNode(c)) {
        return updateCardGroupNode(
          c,
          key === 'zone'
            ? { zone: val as string | undefined }
            : key === 'say'
            ? { say: val as string | undefined }
            : { pause: val as number | undefined }
        );
      }
      return {
        ...c,
        meta: { ...(c.meta ?? {}), [key]: val },
      };
    });
  };

  return (
    <div
      style={{
        marginTop: 8,
        paddingTop: 8,
        borderTop: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        gap: 7,
      }}
    >
      {isCard ? (
        <>
          <input
            className="studio-input"
            value={summary.label}
            onChange={(e) => {
              const label = e.target.value;
              onUpdateNode(node.id, (c) =>
                c.type === 'group' ? updateCardGroupNode(c, { label }) : c
              );
            }}
            placeholder={t('inspector.cardTitleLabel')}
          />
          <input
            className="studio-input"
            value={summary.subtitle ?? ''}
            onChange={(e) => {
              const subtitle = e.target.value;
              onUpdateNode(node.id, (c) =>
                c.type === 'group' ? updateCardGroupNode(c, { subtitle }) : c
              );
            }}
            placeholder={t('inspector.cardSubtitleLabel')}
          />

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 6,
            }}
          >
            <select
              className="studio-select"
              value={summary.role}
              onChange={(e) => {
                const role = e.target.value as CardRole;
                onUpdateNode(node.id, (c) =>
                  c.type === 'group' ? updateCardGroupNode(c, { role }) : c
                );
              }}
            >
              {CARD_ROLES.map((r) => (
                <option key={r} value={r}>
                  {t('inspector.cardRoleLabel', { role: r })}
                </option>
              ))}
            </select>

            <select
              className="studio-select"
              value={summary.shape}
              onChange={(e) => {
                const shape = e.target.value as NodeShape;
                onUpdateNode(node.id, (c) =>
                  c.type === 'group' ? updateCardGroupNode(c, { shape }) : c
                );
              }}
            >
              <option value="none">{t('inspector.cardShapeNone')}</option>
              {shapeOptions
                .filter((s) => s.id !== 'divider')
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {t('inspector.cardShapeLabel', {
                      shape: pluginName(s.id, s.name),
                    })}
                  </option>
                ))}
            </select>
          </div>
        </>
      ) : (
        <input
          className="studio-input"
          value={node.name}
          onChange={(e) =>
            onUpdateNode(node.id, (c) => ({ ...c, name: e.target.value }))
          }
          placeholder={t('inspector.groupNamePlaceholder')}
        />
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 6,
        }}
      >
        <select
          className="studio-select"
          value={node.arrange ?? 'card'}
          onChange={(e) =>
            onUpdateNode(node.id, (c) =>
              c.type === 'group'
                ? {
                    ...c,
                    arrange: e.target.value as GroupSceneNode['arrange'],
                  }
                : c
            )
          }
        >
          {ARRANGE_OPTIONS.map((a) => (
            <option key={a.id} value={a.id}>
              {t('inspector.groupArrangeOption', { label: t(a.key) })}
            </option>
          ))}
        </select>

        <select
          className="studio-select"
          value={isCard ? summary.color : node.color}
          onChange={(e) => {
            const color = e.target.value as ChalkColor;
            onUpdateNode(node.id, (c) =>
              isCardGroupNode(c)
                ? updateCardGroupNode(c, { color })
                : { ...c, color }
            );
          }}
        >
          {COLOR_OPTIONS.map((c) => (
            <option key={c.id} value={c.id}>
              {t('inspector.groupToneOption', { label: t(c.key) })}
            </option>
          ))}
        </select>
      </div>

      {supportsGroups && (
        <input
          className="studio-input"
          value={zoneVal}
          onChange={(e) => updateMetaField('zone', e.target.value || undefined)}
          placeholder={t('inspector.zonePlaceholder')}
        />
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 84px',
          gap: 6,
        }}
      >
        <input
          className="studio-input"
          value={sayVal}
          onChange={(e) => updateMetaField('say', e.target.value || undefined)}
          placeholder={t('inspector.nodeSayLabel')}
        />
        <input
          type="number"
          min={0}
          step={50}
          className="studio-input"
          value={pauseVal}
          onChange={(e) => {
            const raw = e.target.value.trim();
            const num = raw === '' ? undefined : Math.max(0, Number(raw));
            updateMetaField(
              'pause',
              num !== undefined && Number.isFinite(num) ? Math.round(num) : undefined
            );
          }}
          placeholder={t('inspector.nodePauseLabel')}
          title={t('inspector.nodePauseLabel')}
        />
      </div>

      {!isCard && (
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            type="button"
            className="studio-btn"
            style={{ flex: 1, height: 26, fontSize: 11.5 }}
            onClick={() => onAddChildToGroup(node.id, 'text')}
          >
            <Plus size={12} />
            {t('inspector.addChildText')}
          </button>
          <button
            type="button"
            className="studio-btn"
            style={{ flex: 1, height: 26, fontSize: 11.5 }}
            onClick={() => onAddChildToGroup(node.id, 'shape')}
          >
            <Plus size={12} />
            {t('inspector.addChildShape')}
          </button>
        </div>
      )}
    </div>
  );
};
