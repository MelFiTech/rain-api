export interface WebhookDeliveryPayload {
  id: string;
  type: string;
  created_at: string;
  data: Record<string, unknown>;
}

export interface WebhookDeliveryTarget {
  url: string;
  secret: string;
}

export interface WebhookDeliveryProvider {
  readonly name: string;
  deliver(
    target: WebhookDeliveryTarget,
    payload: WebhookDeliveryPayload,
  ): Promise<{ success: boolean }>;
}

export const WEBHOOK_DELIVERY_PROVIDER = Symbol('WEBHOOK_DELIVERY_PROVIDER');
