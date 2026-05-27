/**
 * Domain Event Emission & Subscription Infrastructure
 * Central nervous system enabling asynchronous callbacks, activity auditing,
 * webhook triggers, notifications, and analytics pipelines.
 */

export interface DomainEvent<T = any> {
  eventId: string;
  type: 
    | "INVOICE_PAID" 
    | "INVOICE_SENT"
    | "INVOICE_CANCELLED"
    | "PROJECT_COMPLETED" 
    | "PROJECT_HOLD"
    | "PROJECT_RESUMED"
    | "PAYMENT_ALLOCATED" 
    | "PO_ACTIVATED" 
    | "PO_COMPLETED"
    | "QUOTATION_APPROVED"
    | "QUOTATION_SENT"
    | "QUOTATION_REJECTED"
    | "TRANSITION_COMPLETED";
  entityId: string;
  timestamp: string;
  transitionId?: string;
  metadata?: T;
}

export type DomainEventSubscriber<T = any> = (event: DomainEvent<T>) => void | Promise<void>;

class DomainEventDispatcher {
  private subscribers: Map<string, Set<DomainEventSubscriber>> = new Map();

  /**
   * Register a subscriber for a specific event type.
   */
  public subscribe<T = any>(type: string, subscriber: DomainEventSubscriber<T>): () => void {
    if (!this.subscribers.has(type)) {
      this.subscribers.set(type, new Set());
    }
    this.subscribers.get(type)!.add(subscriber as DomainEventSubscriber);

    // Return unsubscribe helper
    return () => {
      const set = this.subscribers.get(type);
      if (set) {
        set.delete(subscriber as DomainEventSubscriber);
        if (set.size === 0) {
          this.subscribers.delete(type);
        }
      }
    };
  }

  /**
   * Emit a structured domain event, triggering all registered subscribers.
   */
  public async emit<T = any>(params: {
    type: DomainEvent["type"] | string;
    entityId: string;
    transitionId?: string;
    metadata?: T;
  }): Promise<DomainEvent<T>> {
    const event: DomainEvent<T> = {
      eventId: `EVT-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
      type: params.type as any,
      entityId: params.entityId,
      timestamp: new Date().toISOString(),
      transitionId: params.transitionId,
      metadata: params.metadata
    };

    console.log(`[DomainEventDispatcher] Emitting: ${event.type} on Entity: ${event.entityId} (Event ID: ${event.eventId})`);

    const typeSet = this.subscribers.get(event.type);
    const globalSet = this.subscribers.get("*");

    const activeSubscribers = [
      ...(typeSet ? Array.from(typeSet) : []),
      ...(globalSet ? Array.from(globalSet) : [])
    ];

    // Trigger subscribers asynchronously so we do not block core flow execution
    for (const sub of activeSubscribers) {
      try {
        const res = sub(event);
        if (res instanceof Promise) {
          res.catch(err => {
            console.error(`[DomainEventDispatcher] Error in async subscriber for ${event.type}:`, err);
          });
        }
      } catch (err) {
        console.error(`[DomainEventDispatcher] Error in subscriber for ${event.type}:`, err);
      }
    }

    return event;
  }
}

export const domainEventDispatcher = new DomainEventDispatcher();
