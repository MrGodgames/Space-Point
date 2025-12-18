function AccountModal({ account, isOpen, onClose }) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal">
        <div className="modal-header">
          <div>
            <p className="modal-title">Настройки аккаунта</p>
            <p className="modal-sub">Управление профилем и статусом</p>
          </div>
          <button
            className="icon-button"
            onClick={onClose}
            type="button"
            aria-label="Закрыть"
          >
            ×
          </button>
        </div>
        <div className="modal-profile">
          <div className="avatar">{account.name.split(" ").map((part) => part[0]).join("")}</div>
          <div>
            <p className="modal-name">{account.name}</p>
            <p className="modal-handle">{account.handle}</p>
          </div>
          <span className="modal-status">{account.status}</span>
        </div>
        <div className="modal-actions">
          <button className="ghost" type="button">Сменить статус</button>
          <button className="ghost" type="button">Устройства</button>
          <button className="primary" type="button">Сохранить</button>
        </div>
      </div>
    </div>
  );
}

export default AccountModal;
