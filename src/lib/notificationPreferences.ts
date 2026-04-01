export type NotificationPrefs = {
  offers: boolean;
  service_updates: boolean;
  payments: boolean;
  promotions: boolean;
};

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  offers: true,
  service_updates: true,
  payments: true,
  promotions: false,
};

export function isNotificationTypeEnabled(type: string, prefs: NotificationPrefs) {
  if (['new_offer', 'offer_accepted', 'offer_rejected'].includes(type)) return prefs.offers;
  if (['service_request', 'service_accepted', 'service_completed', 'review_received'].includes(type)) return prefs.service_updates;
  if (['payment_received', 'payment_released'].includes(type)) return prefs.payments;
  if (['promotion', 'system'].includes(type)) return prefs.promotions;
  return true;
}
