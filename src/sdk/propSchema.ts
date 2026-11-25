export type PropPrimitiveType = 'string' | 'number' | 'boolean';

export type BuiltInPropFormat =
  | 'plain'
  | 'multiline'
  | 'code'
  | 'svg'
  | 'icon-id'
  | 'enum'
  | 'color'
  | 'shape-id'
  | 'node-ref';

export type PropDataFormat = BuiltInPropFormat | (string & {});

export type PropValuesMap = Record<string, string | number | boolean | undefined>;

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
  readonly when?: (values: PropValuesMap) => boolean;
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
  readonly when?: (values: PropValuesMap) => boolean;
}

export type PropSpecMap = Record<string, PropBuilderConfig<PropPrimitiveType>>;

type InferFieldValue<C> =
  C extends { readonly enumValues: readonly (infer E extends string)[] }
    ? C extends { readonly default: E }
      ? E
      : E | undefined
    : C extends { readonly type: 'string' }
    ? C extends { readonly default: string }
      ? string
      : string | undefined
    : C extends { readonly type: 'number' }
    ? C extends { readonly default: number }
      ? number
      : number | undefined
    : C extends { readonly type: 'boolean' }
    ? C extends { readonly default: boolean }
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
  ): InferFieldValue<S[K]> | undefined;
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
  string<
    const O extends Omit<PropBuilderConfig<'string', string>, 'type'> = Record<string, never>,
  >(opts: O = {} as O): { readonly type: 'string' } & O {
    return { type: 'string', ...opts };
  },
  number<
    const O extends Omit<PropBuilderConfig<'number', number>, 'type'> = Record<string, never>,
  >(opts: O = {} as O): { readonly type: 'number' } & O {
    return { type: 'number', ...opts };
  },
  boolean<
    const O extends Omit<PropBuilderConfig<'boolean', boolean>, 'type'> = Record<string, never>,
  >(opts: O = {} as O): { readonly type: 'boolean' } & O {
    return { type: 'boolean', ...opts };
  },
  enum<
    const T extends readonly string[],
    const O extends Omit<
      PropBuilderConfig<'string', T[number]>,
      'type' | 'format' | 'enumValues'
    > = Record<string, never>,
  >(
    values: T,
    opts: O = {} as O
  ): {
    readonly type: 'string';
    readonly format: 'enum';
    readonly enumValues: T;
  } & O {
    return {
      type: 'string',
      format: 'enum',
      enumValues: values,
      ...opts,
    };
  },
};

function shouldPreserveEmptyString(field: PropFieldDescriptor): boolean {
  return (
    field.type === 'string' &&
    (!field.enumValues || field.enumValues.length === 0) &&
    field.format !== 'icon-id' &&
    typeof field.default === 'string' &&
    field.default.length > 0
  );
}

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

  const preserveEmpty = shouldPreserveEmptyString(field);
  const lookupKeys = [field.key, ...(field.aliases ?? [])];
  for (const k of lookupKeys) {
    if (!(k in rawProps)) continue;
    const val = rawProps[k];
    if (val === undefined || val === null) continue;
    if (val === '') {
      if (preserveEmpty) return '';
      continue;
    }
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
    const preserveEmpty = shouldPreserveEmptyString(field);
    if (value === undefined || (value === '' && !preserveEmpty)) {
      delete nextProps[key];
      return nextProps;
    }
    if (value === '' && preserveEmpty) {
      nextProps[key] = '';
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
      when: cfg.when,
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
      return readPropBySchema(fields, rawProps, key) as
        | InferFieldValue<S[typeof key]>
        | undefined;
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

export function isFieldVisible(
  field: PropFieldDescriptor,
  values: PropValuesMap
): boolean {
  return field.when ? field.when(values) : true;
}

export function filterVisibleFields(
  fields: readonly PropFieldDescriptor[],
  values: PropValuesMap
): PropFieldDescriptor[] {
  return fields.filter((field) => isFieldVisible(field, values));
}
