import { useState } from "react";

function NavigationRail({
  quickActions,
  account,
  connectionSpeedMbps,
  isSpeedChecking,
  onCheckSpeed,
  onOpenSettings,
}) {
  const actionIcons = {
    Пульс:
      "M13 3l-1 6h4l-5 12 1-7H8l5-11z",
    Стыковка:
      "M7 7a5 5 0 0 1 10 0v3h2v2h-2v3a5 5 0 0 1-10 0v-3H5v-2h2V7z",
    Маяк:
      "M12 2a4 4 0 0 1 4 4c0 2.2-1.8 4-4 4s-4-1.8-4-4a4 4 0 0 1 4-4zm-6 19 2.5-9h7L18 21H6z",
    Квазар:
      "M12 3 3 12l9 9 9-9-9-9zm0 4.5 4.5 4.5-4.5 4.5-4.5-4.5L12 7.5z",
    Архив:
      "M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3H4V6zm0 5h16v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-7zm5 2h6v2H9v-2z",
  };

  const [showConnectionSpeed, setShowConnectionSpeed] = useState(false);
  const hasSpeed = Number.isFinite(connectionSpeedMbps);
  const connectionSpeed = hasSpeed
    ? `${connectionSpeedMbps.toFixed(1)} Мбит/с`
    : "—";
  const maxSpeedMbps = 1000;
  const signalPercent = hasSpeed
    ? Math.min(100, Math.max(0, (connectionSpeedMbps / maxSpeedMbps) * 100))
    : 0;
  const signalPercentLabel = hasSpeed ? `${signalPercent.toFixed(1)}%` : "--%";

  const toggleConnectionSpeed = () => {
    setShowConnectionSpeed((prev) => {
      const next = !prev;
      if (!prev) {
        onCheckSpeed?.();
      }
      return next;
    });
  };

  return (
    <aside className="rail">
      <div className="rail-brand">
        <span className="brand-mark" aria-hidden>
          SP
        </span>
        <div>
          <p className="brand-title">Space-Point</p>
          <p className="brand-sub">Навигационный узел</p>
        </div>
      </div>
      <div className="rail-section">
        <p className="rail-label">Порталы</p>
        <div className="rail-buttons">
          {quickActions.map((item, index) => (
            <button
              key={item}
              className={`rail-button ${index === 0 ? "active" : ""}`}
            >
              <span className="rail-icon">
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path
                    d={actionIcons[item] || "M12 4v16"}
                    fill="currentColor"
                  />
                </svg>
              </span>
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="signal-card">
        <button
          className="signal-title signal-title-button"
          type="button"
          onClick={toggleConnectionSpeed}
        >
          Целостность сигнала
        </button>
        <p className="signal-value">{signalPercentLabel}</p>
        <div className="signal-bar">
          <span style={{ width: `${signalPercent}%` }} />
        </div>
        <p className="signal-meta">
          {showConnectionSpeed
            ? isSpeedChecking
              ? "Измерение скорости..."
              : `Скорость подключения: ${connectionSpeed}`
            : "Аномалий не обнаружено"}
        </p>
      </div>

      {account && (
        <div className="account-card">
          <div className="account-info">
            <div className="avatar">
              {account.name
                .split(" ")
                .map((part) => part[0])
                .join("")}
            </div>
            <div>
              <p className="account-name">{account.name}</p>
              <p className="account-handle">{account.handle}</p>
            </div>
          </div>
          <button className="ghost" type="button" onClick={onOpenSettings}>
            Настройки
          </button>
        </div>
      )}

    </aside>
  );
}

export default NavigationRail;
