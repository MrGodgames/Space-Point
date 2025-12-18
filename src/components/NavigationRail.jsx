import { useState } from "react";

function NavigationRail({
  quickActions,
  account,
  connectionSpeedMbps,
  isSpeedChecking,
  onCheckSpeed,
  onOpenSettings,
}) {
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
      <div className="rail-section">
        <p className="rail-label">Порталы</p>
        <div className="rail-buttons">
          {quickActions.map((item, index) => (
            <button
              key={item}
              className={`rail-button ${index === 0 ? "active" : ""}`}
            >
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
