export interface WorkflowTraceEntry {
  nodeId: string;
  kind: 'atomic' | 'composite';
  durationMs: number;
}

export interface WorkflowContext {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  overrides?: Map<string, WorkflowNode<any, any>>;
  trace?: WorkflowTraceEntry[];
}

export interface WorkflowNode<I, O> {
  id: string;
  kind: 'atomic' | 'composite';
  run(input: I, ctx?: WorkflowContext): O;
}

export interface DagNodeSpec {
  id: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  node: WorkflowNode<any, any>;
  from: string[];
}

export interface WorkflowGraphSpec {
  id: string;
  nodes: DagNodeSpec[];
  output: string;
}

export const GRAPH_INPUT_ID = '__input__';

export function createAtomicNode<I, O>(
  id: string,
  fn: (input: I, ctx?: WorkflowContext) => O
): WorkflowNode<I, O> {
  return {
    id,
    kind: 'atomic',
    run(input: I, ctx?: WorkflowContext): O {
      const target =
        (ctx?.overrides?.get(id) as WorkflowNode<I, O> | undefined) ?? undefined;
      if (target && target.kind === 'composite') {
        return target.run(input, ctx);
      }
      const start = performance.now();
      const out = fn(input, ctx);
      if (ctx?.trace) {
        ctx.trace.push({
          nodeId: id,
          kind: 'atomic',
          durationMs: Math.max(0, performance.now() - start),
        });
      }
      return out;
    },
  };
}

/**
 * Compiles a declarative recursive DAG specification into a composable WorkflowNode.
 * Validates upstream bindings and detects cycles at compile time via Kahn topological sort.
 */
export function compileWorkflowGraph<I, O>(
  spec: WorkflowGraphSpec
): WorkflowNode<I, O> {
  const nodeMap = new Map<string, DagNodeSpec>();
  for (const item of spec.nodes) {
    if (item.id === GRAPH_INPUT_ID) {
      throw new Error(`Workflow "${spec.id}": reserved node id "${GRAPH_INPUT_ID}"`);
    }
    if (nodeMap.has(item.id)) {
      throw new Error(`Workflow "${spec.id}": duplicate node id "${item.id}"`);
    }
    nodeMap.set(item.id, item);
  }

  if (!nodeMap.has(spec.output)) {
    throw new Error(
      `Workflow "${spec.id}": output node "${spec.output}" does not exist`
    );
  }

  const dependents = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  for (const item of spec.nodes) {
    dependents.set(item.id, []);
    inDegree.set(item.id, 0);
  }

  for (const item of spec.nodes) {
    const seenUp = new Set<string>();
    for (const up of item.from) {
      if (up === GRAPH_INPUT_ID) continue;
      if (!nodeMap.has(up)) {
        throw new Error(
          `Workflow "${spec.id}": node "${item.id}" depends on unknown node "${up}"`
        );
      }
      if (!seenUp.has(up)) {
        seenUp.add(up);
        dependents.get(up)!.push(item.id);
        inDegree.set(item.id, (inDegree.get(item.id) ?? 0) + 1);
      }
    }
  }

  const queue: string[] = [];
  for (const item of spec.nodes) {
    if ((inDegree.get(item.id) ?? 0) === 0) {
      queue.push(item.id);
    }
  }

  const sortedOrder: DagNodeSpec[] = [];
  while (queue.length > 0) {
    const currId = queue.shift()!;
    sortedOrder.push(nodeMap.get(currId)!);
    for (const nextId of dependents.get(currId) ?? []) {
      const rem = (inDegree.get(nextId) ?? 0) - 1;
      inDegree.set(nextId, rem);
      if (rem === 0) {
        queue.push(nextId);
      }
    }
  }

  if (sortedOrder.length !== spec.nodes.length) {
    throw new Error(
      `Workflow "${spec.id}": cyclic dependency detected in DAG specification`
    );
  }

  return {
    id: spec.id,
    kind: 'composite',
    run(input: I, ctx?: WorkflowContext): O {
      const start = performance.now();
      const results = new Map<string, unknown>();
      results.set(GRAPH_INPUT_ID, input);

      for (const step of sortedOrder) {
        let stepInput: unknown;
        if (step.from.length === 0) {
          stepInput = undefined;
        } else if (step.from.length === 1) {
          stepInput = results.get(step.from[0]);
        } else {
          const bundled: Record<string, unknown> = {};
          for (const up of step.from) {
            bundled[up] = results.get(up);
          }
          stepInput = bundled;
        }

        const overrideNode = ctx?.overrides?.get(step.id);
        const impl = overrideNode ?? step.node;
        const stepOut = impl.run(stepInput, ctx);
        results.set(step.id, stepOut);
      }

      if (ctx?.trace) {
        ctx.trace.push({
          nodeId: spec.id,
          kind: 'composite',
          durationMs: Math.max(0, performance.now() - start),
        });
      }

      return results.get(spec.output) as O;
    },
  };
}
