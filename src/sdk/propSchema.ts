export type PropPrimitiveType = 'string' | 'number' | 'boolean';

export type PropDataFormat =
  | 'plain'
  | 'multiline'
  | 'code'
  | 'svg'
  | 'icon-id'
  | 'enum';

export interface PropFieldDescriptor {
  readonly key: string;
  readonly type: PropPrimitiveType;
  readonly format?: PropDataFormat;
  readonly default?: string | number | boolean;
  readonly min?: number;
  readonly max?: number;
  readonly step?: number;
  readonly enumValues?: readonly string[];
  readonly aliases?: readonly string[];
  readonly description?: string;
}

export interface PropBuilderConfig<
  T extends PropPrimitiveType,
  V extends string | number | boolean = string | number | boolean,
> {
  readonly type: T;
  readonly format?: PropDataFormat;
  readonly default?: V;
  readonly min?: number;
  readonly max?: number;
  readonly step?: number;
  readonly enumValues?: readonly string[];
  readonly aliases?: readonly string[];
  readonly description?: string;
}

export type PropSpecMap = Record<string, PropBuilderConfig<PropPrimitiveType>>;

type InferFieldValue<C> =
  C extends PropBuilderConfig<'string', infer S>
    ? C extends { default: string }
      ? string
      : S | undefined
    : C extends PropBuilderConfig<'number'>
    ? C extends { default: number }
      ? number
      : number | undefined
    : C extends PropBuilderConfig<'boolean'>
    ? C extends { default: boolean }
      ? boolean
      : boolean | undefined
    : unknown;

export type InferPropValues<S extends PropSpecMap> = {
  [K in keyof S]: InferFieldValue<S[K]>;
};

export interface DefinedPropSchema<S extends PropSpecMap> {
  readonly fields: readonly PropFieldDescriptor[];
  readonly defaults: Record<string, string | number | boolean>;
  resolve(rawProps?: Record<string, string | number | boolean | undefined>): InferPropValues<S>;
  readField<K extends keyof S & string>(
    rawProps: Record<string, string | number | boolean | undefined> | undefined,
    key: K
  ): InferFieldValue<S[K]>;
  writeField(
    rawProps: Record<string, string | number | boolean | undefined> | undefined,
    key: keyof S & string,
    value: string | number | boolean | undefined
  ): Record<string, string | number | boolean | undefined>;
  resetField(
    rawProps: Record<string, string | number | boolean | undefined> | undefined,
    key: keyof S & string
  ): Record<string, string | number | boolean | undefined>;
}

export const prop = {
  string(
    opts: Omit<PropBuilderConfig<'string', string>, 'type'> = {}
  ): PropBuilderConfig<'string', string> {
    return { type: 'string', ...opts };
  },
  number(
    opts: Omit<PropBuilderConfig<'number', number>, 'type'> = {}
  ): PropBuilderConfig<'number', number> {
    return { type: 'number', ...opts };
  },
  boolean(
    opts: Omit<PropBuilderConfig<'boolean', boolean>, 'type'> = {}
  ): PropBuilderConfig<'boolean', boolean> {
    return { type: 'boolean', ...opts };
  },
  enum<const T extends readonly string[]>(
    values: T,
    opts: Omit<PropBuilderConfig<'string', T[number]>, 'type' | 'format' | 'enumValues'> = {}
  ): PropBuilderConfig<'string', T[number]> {
    return {
      type: 'string',
      format: 'enum',
      enumValues: values,
      ...opts,
    };
  },
};

function coerceFieldValue(
  field: PropFieldDescriptor,
  raw: unknown
): string | number | boolean | undefined {
  if (raw === undefined || raw === null) return undefined;

  if (field.type === 'number') {
    const n = typeof raw === 'number' ? raw : Number(String(raw).trim());
    if (!Number.isFinite(n)) return undefined;
    let clamped = n;
    if (field.min !== undefined) clamped = Math.max(field.min, clamped);
    if (field.max !== undefined) clamped = Math.min(field.max, clamped);
    return clamped;
  }

  if (field.type === 'boolean') {
    if (typeof raw === 'boolean') return raw;
    const lower = String(raw).trim().toLowerCase();
    if (lower === 'true' || lower === '1' || lower === 'yes') return true;
    if (lower === 'false' || lower === '0' || lower === 'no') return false;
    return undefined;
  }

  const str = typeof raw === 'string' ? raw : String(raw);
  if (field.enumValues && field.enumValues.length > 0 && !field.enumValues.includes(str)) {
    return undefined;
  }
  return str;
}

/**
 * Symmetric read accessor (UI / Canvas / Script -> normalized explicit value).
 * Returns `undefined` when no explicit key or alias is present or valid.
 */
export function readPropBySchema(
  fields: readonly PropFieldDescriptor[],
  rawProps: Record<string, string | number | boolean | undefined> | undefined,
  key: string
): string | number | boolean | undefined {
  const field = fields.find((f) => f.key === key);
  if (!field || !rawProps) return undefined;

  const lookupKeys = [field.key, ...(field.aliases ?? [])];
  for (const k of lookupKeys) {
    if (!(k in rawProps)) continue;
    const val = rawProps[k];
    if (val === undefined || val === null || val === '') continue;
    const coerced = coerceFieldValue(field, val);
    if (coerced !== undefined) return coerced;
  }
  return undefined;
}

/**
 * Symmetric immutable write accessor (UI / Canvas / Script -> canonical `node.props`).
 * Normalizes aliases onto the canonical key and enforces min/max bounds.
 */
export function writePropBySchema(
  fields: readonly PropFieldDescriptor[],
  rawProps: Record<string, string | number | boolean | undefined> | undefined,
  key: string,
  value: string | number | boolean | undefined
): Record<string, string | number | boolean | undefined> {
  const nextProps: Record<string, string | number | boolean | undefined> = {
    ...(rawProps ?? {}),
  };
  const field = fields.find((f) => f.key === key);

  if (field) {
    for (const alias of field.aliases ?? []) {
      delete nextProps[alias];
    }
    if (value === undefined || value === '') {
      delete nextProps[key];
      return nextProps;
    }
    const coerced = coerceFieldValue(field, value);
    if (coerced === undefined) {
      delete nextProps[key];
    } else {
      nextProps[key] = coerced;
    }
    return nextProps;
  }

  if (value === undefined || value === '') {
    delete nextProps[key];
  } else {
    nextProps[key] = value;
  }
  return nextProps;
}

/**
 * Compiles a declarative property table into a single-source-of-truth
 * metadata descriptor + strongly typed read/write/reset helpers.
 */
export function defineProps<const S extends PropSpecMap>(
  spec: S
): DefinedPropSchema<S> {
  const fields: PropFieldDescriptor[] = [];
  const defaults: Record<string, string | number | boolean> = {};

  for (const [key, cfg] of Object.entries(spec)) {
    const desc: PropFieldDescriptor = {
      key,
      type: cfg.type,
      format: cfg.format,
      default: cfg.default,
      min: cfg.min,
      max: cfg.max,
      step: cfg.step,
      enumValues: cfg.enumValues,
      aliases: cfg.aliases,
      description: cfg.description,
    };
    fields.push(desc);
    if (cfg.default !== undefined) {
      defaults[key] = cfg.default;
    }
  }

  return {
    fields,
    defaults,
    resolve(rawProps) {
      const out: Record<string, string | number | boolean | undefined> = {};
      for (const field of fields) {
        const explicit = readPropBySchema(fields, rawProps, field.key);
        out[field.key] = explicit !== undefined ? explicit : field.default;
      }
      return out as InferPropValues<S>;
    },
    readField(rawProps, key) {
      return readPropBySchema(fields, rawProps, key) as InferFieldValue<S[typeof key]>;
    },
    writeField(rawProps, key, value) {
      return writePropBySchema(fields, rawProps, key, value);
    },
    resetField(rawProps, key) {
      const field = fields.find((f) => f.key === key);
      return writePropBySchema(fields, rawProps, key, field?.default);
    },
  };
}
