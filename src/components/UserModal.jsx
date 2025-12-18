import { useState } from "react";

function UserModal({ title, placeholder, isOpen, onClose, onSubmit }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");

  if (!isOpen) {
    return null;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    const trimmed = value.trim();
    if (!trimmed) {
      setError("Введите логин");
      return;
    }

    try {
      await onSubmit(trimmed);
      setValue("");
      onClose();
    } catch (err) {
      setError(err.message || "Ошибка");
    }
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal">
        <div className="modal-header">
          <div>
            <p className="modal-title">{title}</p>
            <p className="modal-sub">Введите логин пользователя</p>
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
        <form className="modal-form" onSubmit={handleSubmit}>
          <input
            type="text"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder={placeholder}
          />
          {error && <div className="auth-error">{error}</div>}
          <div className="modal-actions">
            <button className="ghost" type="button" onClick={onClose}>
              Отмена
            </button>
            <button className="primary" type="submit">
              Подтвердить
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default UserModal;
