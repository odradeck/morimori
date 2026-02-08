import * as amplitude from '@amplitude/analytics-browser';

const API_KEY = import.meta.env.VITE_AMPLITUDE_API_KEY;

export function initAnalytics() {
  if (!API_KEY) return;
  amplitude.init(API_KEY, { autocapture: false });
}

export function track(eventName, properties = {}) {
  if (!API_KEY) return;
  amplitude.track(eventName, properties);
}
