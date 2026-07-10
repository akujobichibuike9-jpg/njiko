type Handler = (payload: any) => void | Promise<void>;

// Lets a new module react to things like 'order.created' or 'rider.assigned'
// WITHOUT editing the module that emits them. This is how features stay decoupled.
export class EventBus {
  private handlers = new Map<string, Set<Handler>>();

  on(event: string, handler: Handler): void {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event)!.add(handler);
  }

  off(event: string, handler: Handler): void {
    this.handlers.get(event)?.delete(handler);
  }

  async emit(event: string, payload?: unknown): Promise<void> {
    for (const h of this.handlers.get(event) ?? []) await h(payload);
  }
}
