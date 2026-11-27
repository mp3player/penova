/**
 * Safe, zero-eval recursive-descent math expression parser and evaluator
 * for formula-driven dynamic Penova animations (e.g. Fourier series, waves).
 */

export interface CompiledMathExpr {
  source: string;
  evaluate(vars: Record<string, number>): number;
}

type MathAst =
  | { kind: 'number'; value: number }
  | { kind: 'var'; name: string }
  | { kind: 'unary'; op: '+' | '-'; arg: MathAst }
  | { kind: 'binary'; op: '+' | '-' | '*' | '/' | '%' | '^'; left: MathAst; right: MathAst }
  | { kind: 'call'; name: string; args: MathAst[] }
  | { kind: 'sum'; varName: string; start: MathAst; end: MathAst; body: MathAst };

type Token =
  | { kind: 'number'; value: number }
  | { kind: 'ident'; value: string }
  | { kind: 'op'; value: '+' | '-' | '*' | '/' | '%' | '^' }
  | { kind: 'lparen' }
  | { kind: 'rparen' }
  | { kind: 'comma' };

const CONSTANTS: Record<string, number> = {
  pi: Math.PI,
  tau: Math.PI * 2,
  e: Math.E,
};

const MAX_SUM_ITERATIONS = 64;
const MAX_PARSE_DEPTH = 48;
const MAX_EVAL_STEPS = 2048;

const UNARY_FNS: Record<string, (v: number) => number> = {
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  asin: Math.asin,
  acos: Math.acos,
  atan: Math.atan,
  sinh: Math.sinh,
  cosh: Math.cosh,
  tanh: Math.tanh,
  abs: Math.abs,
  sqrt: (v) => (v >= 0 ? Math.sqrt(v) : 0),
  exp: Math.exp,
  log: (v) => (v > 0 ? Math.log(v) : 0),
  ln: (v) => (v > 0 ? Math.log(v) : 0),
  floor: Math.floor,
  ceil: Math.ceil,
  round: Math.round,
  sign: Math.sign,
  fract: (v) => v - Math.floor(v),
};

const BINARY_FNS: Record<string, (a: number, b: number) => number> = {
  pow: Math.pow,
  min: Math.min,
  max: Math.max,
  mod: (a, b) => (b === 0 ? 0 : a - Math.floor(a / b) * b),
  atan2: Math.atan2,
  step: (edge, x) => (x < edge ? 0 : 1),
};

const TERNARY_FNS: Record<string, (a: number, b: number, c: number) => number> = {
  clamp: (v, lo, hi) => (lo <= hi ? Math.max(lo, Math.min(hi, v)) : Math.max(hi, Math.min(lo, v))),
  lerp: (a, b, t) => a + (b - a) * t,
  smoothstep: (edge0, edge1, x) => {
    if (edge1 === edge0) return x < edge0 ? 0 : 1;
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
  },
};

function tokenize(source: string): Token[] | null {
  const tokens: Token[] = [];
  const len = source.length;
  let i = 0;

  while (i < len) {
    const ch = source[i];
    if (ch <= ' ') {
      i++;
      continue;
    }

    if ((ch >= '0' && ch <= '9') || (ch === '.' && i + 1 < len && source[i + 1] >= '0' && source[i + 1] <= '9')) {
      const start = i;
      let hasDot = ch === '.';
      i++;
      while (i < len) {
        const c = source[i];
        if (c >= '0' && c <= '9') {
          i++;
        } else if (c === '.' && !hasDot) {
          hasDot = true;
          i++;
        } else {
          break;
        }
      }
      if (i < len && (source[i] === 'e' || source[i] === 'E')) {
        const expPos = i;
        i++;
        if (i < len && (source[i] === '+' || source[i] === '-')) {
          i++;
        }
        const digitStart = i;
        while (i < len && source[i] >= '0' && source[i] <= '9') {
          i++;
        }
        if (i === digitStart) {
          i = expPos;
        }
      }
      const num = Number.parseFloat(source.slice(start, i));
      if (!Number.isFinite(num)) return null;
      tokens.push({ kind: 'number', value: num });
      continue;
    }

    if ((ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === '_') {
      const start = i;
      i++;
      while (i < len) {
        const c = source[i];
        if (
          (c >= 'a' && c <= 'z') ||
          (c >= 'A' && c <= 'Z') ||
          (c >= '0' && c <= '9') ||
          c === '_'
        ) {
          i++;
        } else {
          break;
        }
      }
      tokens.push({ kind: 'ident', value: source.slice(start, i).toLowerCase() });
      continue;
    }

    if (ch === '+' || ch === '-' || ch === '*' || ch === '/' || ch === '%' || ch === '^') {
      tokens.push({ kind: 'op', value: ch });
      i++;
      continue;
    }
    if (ch === '(') {
      tokens.push({ kind: 'lparen' });
      i++;
      continue;
    }
    if (ch === ')') {
      tokens.push({ kind: 'rparen' });
      i++;
      continue;
    }
    if (ch === ',') {
      tokens.push({ kind: 'comma' });
      i++;
      continue;
    }

    return null;
  }

  return tokens;
}

function parseTokens(tokens: Token[]): MathAst | null {
  let pos = 0;
  let depth = 0;

  const peek = (): Token | undefined => tokens[pos];
  const consume = (): Token | undefined => tokens[pos++];

  const parseAddSub = (): MathAst | null => {
    let left = parseMulDiv();
    if (!left) return null;
    while (pos < tokens.length) {
      const tok = peek();
      if (tok?.kind === 'op' && (tok.value === '+' || tok.value === '-')) {
        consume();
        const right = parseMulDiv();
        if (!right) return null;
        left = { kind: 'binary', op: tok.value, left, right };
      } else {
        break;
      }
    }
    return left;
  };

  const parseMulDiv = (): MathAst | null => {
    let left = parseUnary();
    if (!left) return null;
    while (pos < tokens.length) {
      const tok = peek();
      if (tok?.kind === 'op' && (tok.value === '*' || tok.value === '/' || tok.value === '%')) {
        consume();
        const right = parseUnary();
        if (!right) return null;
        left = { kind: 'binary', op: tok.value, left, right };
      } else {
        break;
      }
    }
    return left;
  };

  const parseUnary = (): MathAst | null => {
    const tok = peek();
    if (tok?.kind === 'op' && (tok.value === '+' || tok.value === '-')) {
      if (++depth > MAX_PARSE_DEPTH) return null;
      consume();
      const arg = parseUnary();
      depth--;
      if (!arg) return null;
      return { kind: 'unary', op: tok.value, arg };
    }
    return parsePower();
  };

  const parsePower = (): MathAst | null => {
    const base = parsePrimary();
    if (!base) return null;
    const tok = peek();
    if (tok?.kind === 'op' && tok.value === '^') {
      if (++depth > MAX_PARSE_DEPTH) return null;
      consume();
      const exponent = parseUnary();
      depth--;
      if (!exponent) return null;
      return { kind: 'binary', op: '^', left: base, right: exponent };
    }
    return base;
  };

  const parsePrimary = (): MathAst | null => {
    const tok = consume();
    if (!tok) return null;

    if (tok.kind === 'number') {
      return { kind: 'number', value: tok.value };
    }

    if (tok.kind === 'lparen') {
      if (++depth > MAX_PARSE_DEPTH) return null;
      const inner = parseAddSub();
      depth--;
      if (!inner || peek()?.kind !== 'rparen') return null;
      consume();
      return inner;
    }

    if (tok.kind === 'ident') {
      if (peek()?.kind === 'lparen') {
        if (++depth > MAX_PARSE_DEPTH) return null;
        consume();
        const args: MathAst[] = [];
        if (peek()?.kind !== 'rparen') {
          while (true) {
            const arg = parseAddSub();
            if (!arg) {
              depth--;
              return null;
            }
            args.push(arg);
            if (peek()?.kind === 'comma') {
              consume();
            } else {
              break;
            }
          }
        }
        depth--;
        if (peek()?.kind !== 'rparen') return null;
        consume();

        if (tok.value === 'sum') {
          if (args.length !== 4 || args[0].kind !== 'var') {
            return null;
          }
          return {
            kind: 'sum',
            varName: args[0].name,
            start: args[1],
            end: args[2],
            body: args[3],
          };
        }

        if (
          (args.length === 1 && tok.value in UNARY_FNS) ||
          (args.length === 2 && tok.value in BINARY_FNS) ||
          (args.length === 3 && tok.value in TERNARY_FNS)
        ) {
          return { kind: 'call', name: tok.value, args };
        }
        return null;
      }

      return { kind: 'var', name: tok.value };
    }

    return null;
  };

  const ast = parseAddSub();
  if (!ast || pos !== tokens.length) return null;
  return ast;
}

interface EvalBudget {
  steps: number;
}

function evalAst(node: MathAst, env: Record<string, number>, budget: EvalBudget): number {
  if (++budget.steps > MAX_EVAL_STEPS) {
    return 0;
  }
  let out = 0;
  switch (node.kind) {
    case 'number':
      out = node.value;
      break;
    case 'var':
      out = Object.prototype.hasOwnProperty.call(env, node.name)
        ? env[node.name]
        : node.name in CONSTANTS
        ? CONSTANTS[node.name]
        : 0;
      break;
    case 'unary': {
      const val = evalAst(node.arg, env, budget);
      out = node.op === '-' ? -val : val;
      break;
    }
    case 'binary': {
      const l = evalAst(node.left, env, budget);
      const r = evalAst(node.right, env, budget);
      if (node.op === '+') out = l + r;
      else if (node.op === '-') out = l - r;
      else if (node.op === '*') out = l * r;
      else if (node.op === '/') out = r === 0 ? 0 : l / r;
      else if (node.op === '%') out = r === 0 ? 0 : l % r;
      else out = Math.pow(l, r);
      break;
    }
    case 'call': {
      if (node.args.length === 1) {
        const fn = UNARY_FNS[node.name];
        out = fn ? fn(evalAst(node.args[0], env, budget)) : 0;
      } else if (node.args.length === 2) {
        const fn = BINARY_FNS[node.name];
        out = fn
          ? fn(evalAst(node.args[0], env, budget), evalAst(node.args[1], env, budget))
          : 0;
      } else if (node.args.length === 3) {
        const fn = TERNARY_FNS[node.name];
        out = fn
          ? fn(
              evalAst(node.args[0], env, budget),
              evalAst(node.args[1], env, budget),
              evalAst(node.args[2], env, budget)
            )
          : 0;
      }
      break;
    }
    case 'sum': {
      const startVal = Math.round(evalAst(node.start, env, budget));
      const endVal = Math.round(evalAst(node.end, env, budget));
      if (!Number.isFinite(startVal) || !Number.isFinite(endVal) || endVal < startVal) {
        return 0;
      }
      const count = Math.min(MAX_SUM_ITERATIONS, endVal - startVal + 1);
      const hadPrev = Object.prototype.hasOwnProperty.call(env, node.varName);
      const prevVal = env[node.varName];
      let total = 0;
      for (let i = 0; i < count; i++) {
        if (budget.steps >= MAX_EVAL_STEPS) break;
        env[node.varName] = startVal + i;
        const term = evalAst(node.body, env, budget);
        if (Number.isFinite(term)) {
          total += term;
        }
      }
      if (hadPrev) {
        env[node.varName] = prevVal;
      } else {
        delete env[node.varName];
      }
      out = total;
      break;
    }
  }
  return Number.isFinite(out) ? out : 0;
}

/**
 * Compile a math expression string into a safe evaluator.
 * Returns null when the expression is empty or invalid.
 */
export function compileMathExpr(source: string): CompiledMathExpr | null {
  const trimmed = source.trim();
  if (!trimmed) return null;
  const tokens = tokenize(trimmed);
  if (!tokens || tokens.length === 0) return null;
  const ast = parseTokens(tokens);
  if (!ast) return null;

  return {
    source: trimmed,
    evaluate(vars: Record<string, number>): number {
      const env: Record<string, number> = {};
      for (const [k, v] of Object.entries(vars)) {
        if (Number.isFinite(v)) {
          env[k.toLowerCase()] = v;
        }
      }
      return evalAst(ast, env, { steps: 0 });
    },
  };
}
