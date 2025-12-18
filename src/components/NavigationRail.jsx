function NavigationRail({ quickActions, account, onOpenSettings }) {
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
        <p className="signal-title">Целостность сигнала</p>
        <p className="signal-value">98.6%</p>
        <div className="signal-bar">
          <span />
        </div>
        <p className="signal-meta">Аномалий не обнаружено</p>
      </div>

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

    </aside>
  );
}

export default NavigationRail;
