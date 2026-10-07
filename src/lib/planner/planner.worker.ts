import { planWithinBudget, type PlanCatalog, type PlanInput } from './planner';

/** Runs the planner off the main thread, so the UI stays smooth on low-end phones. */

interface Request {
  id: number;
  catalog: PlanCatalog;
  input: PlanInput;
}

const scope = self as unknown as { postMessage(message: unknown): void; onmessage: ((e: MessageEvent<Request>) => void) | null };

scope.onmessage = (e) => {
  const { id, catalog, input } = e.data;
  try {
    scope.postMessage({ id, plan: planWithinBudget(catalog, input) });
  } catch (err) {
    scope.postMessage({ id, error: err instanceof Error ? err.message : String(err) });
  }
};
