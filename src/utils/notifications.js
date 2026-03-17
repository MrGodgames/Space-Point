const isBrowserNotificationSupported = () =>
  typeof window !== "undefined" && typeof Notification !== "undefined";

let pluginApiPromise = null;

const loadNotificationPlugin = async () => {
  if (pluginApiPromise) {
    return pluginApiPromise;
  }

  pluginApiPromise = import("@tauri-apps/plugin-notification").catch(
    () => null
  );
  return pluginApiPromise;
};

const requestBrowserPermission = async () => {
  if (!isBrowserNotificationSupported()) {
    return false;
  }

  if (Notification.permission === "granted") {
    return true;
  }

  if (Notification.permission === "denied") {
    return false;
  }

  const permission = await Notification.requestPermission();
  return permission === "granted";
};

export const primeNotifications = async () => {
  const plugin = await loadNotificationPlugin();

  if (plugin) {
    const granted = await plugin.isPermissionGranted();
    if (granted) {
      return true;
    }

    const permission = await plugin.requestPermission();
    return permission === "granted";
  }

  return requestBrowserPermission();
};

export const showDesktopNotification = async ({ title, body }) => {
  const safeTitle = title || "Новое сообщение";
  const safeBody = body || "";

  const plugin = await loadNotificationPlugin();
  if (plugin) {
    let granted = await plugin.isPermissionGranted();
    if (!granted) {
      const permission = await plugin.requestPermission();
      granted = permission === "granted";
    }
    if (!granted) {
      return false;
    }
    plugin.sendNotification({ title: safeTitle, body: safeBody });
    return true;
  }

  if (isBrowserNotificationSupported()) {
    if (Notification.permission !== "granted") {
      const granted = await requestBrowserPermission();
      if (!granted) {
        return false;
      }
    }
    new Notification(safeTitle, { body: safeBody });
    return true;
  }

  return false;
};
