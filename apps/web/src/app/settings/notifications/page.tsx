"use client";

/**
 * Notification Preferences Page — /settings/notifications (S8-10)
 *
 * Toggle per notification type: new matches, price drops, viewing reminders.
 * Web Push API subscription management.
 */

import { useState, useCallback } from "react";

interface NotificationPrefs {
  newMatches: boolean;
  priceDrops: boolean;
  viewingReminders: boolean;
}

const NOTIFICATION_TYPES = [
  {
    key: "newMatches" as const,
    label: "New Property Matches",
    description: "Get notified when new properties match your saved search criteria",
    icon: "🏠",
  },
  {
    key: "priceDrops" as const,
    label: "Price Drops",
    description: "Get notified when a saved property reduces its asking price",
    icon: "📉",
  },
  {
    key: "viewingReminders" as const,
    label: "Viewing Reminders",
    description: "Receive reminders before your scheduled property viewings",
    icon: "📅",
  },
];

export default function NotificationSettingsPage() {
  const [prefs, setPrefs] = useState<NotificationPrefs>({
    newMatches: true,
    priceDrops: true,
    viewingReminders: true,
  });
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const togglePref = useCallback(
    (key: keyof NotificationPrefs) => {
      setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
      // In production: call tRPC push.updatePreferences
    },
    []
  );

  const handleSubscribe = useCallback(async () => {
    setIsLoading(true);
    try {
      // Check browser support
      if (!("Notification" in window) || !("serviceWorker" in navigator)) {
        alert("Push notifications are not supported in this browser.");
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        alert("Please allow notifications to subscribe.");
        return;
      }

      // In production: register service worker and subscribe
      // const registration = await navigator.serviceWorker.register('/sw.js');
      // const subscription = await registration.pushManager.subscribe({
      //   userVisibleOnly: true,
      //   applicationServerKey: VAPID_PUBLIC_KEY,
      // });
      // Call tRPC push.subscribe with subscription details

      setIsSubscribed(true);
    } catch (err) {
      console.error("Push subscription failed:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleUnsubscribe = useCallback(async () => {
    setIsLoading(true);
    // In production: call tRPC push.unsubscribe
    await new Promise((r) => setTimeout(r, 500));
    setIsSubscribed(false);
    setIsLoading(false);
  }, []);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6">
        <h1 className="font-[var(--font-heading)] text-2xl font-bold text-[var(--foreground)]">
          Notification Preferences
        </h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Choose which notifications you&apos;d like to receive from Xara.
        </p>
      </div>

      {/* Subscription Status */}
      <div className="mb-6 rounded-[var(--radius-card)] border border-[var(--border)] bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-[var(--foreground)]">
              Push Notifications
            </h3>
            <p className="text-xs text-[var(--muted-foreground)]">
              {isSubscribed
                ? "✅ You're subscribed to push notifications"
                : "Enable push notifications to stay updated"}
            </p>
          </div>
          <button
            onClick={isSubscribed ? handleUnsubscribe : handleSubscribe}
            disabled={isLoading}
            className={`rounded-[var(--radius-input)] px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
              isSubscribed
                ? "border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--muted)]"
                : "bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-light)]"
            }`}
          >
            {isLoading
              ? "..."
              : isSubscribed
              ? "Unsubscribe"
              : "Enable Notifications"}
          </button>
        </div>
      </div>

      {/* Notification Types */}
      <div className="rounded-[var(--radius-card)] border border-[var(--border)] bg-white shadow-sm overflow-hidden">
        {NOTIFICATION_TYPES.map((type, idx) => (
          <div
            key={type.key}
            className={`flex items-center justify-between p-4 ${
              idx < NOTIFICATION_TYPES.length - 1
                ? "border-b border-[var(--border)]"
                : ""
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">{type.icon}</span>
              <div>
                <p className="text-sm font-medium text-[var(--foreground)]">
                  {type.label}
                </p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  {type.description}
                </p>
              </div>
            </div>
            <button
              onClick={() => togglePref(type.key)}
              className={`relative h-6 w-11 rounded-full transition-colors ${
                prefs[type.key]
                  ? "bg-[var(--color-primary)]"
                  : "bg-[var(--border)]"
              }`}
              role="switch"
              aria-checked={prefs[type.key]}
              aria-label={`Toggle ${type.label}`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                  prefs[type.key] ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
        ))}
      </div>

      {/* Privacy note */}
      <div className="mt-6 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--muted)] p-4">
        <h3 className="text-sm font-medium text-[var(--foreground)]">
          🔒 Privacy
        </h3>
        <p className="mt-1 text-xs text-[var(--muted-foreground)]">
          Notifications are sent directly to your browser. We don&apos;t share
          your subscription data with third parties. You can unsubscribe at any
          time.
        </p>
      </div>
    </div>
  );
}
