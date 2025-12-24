import { useEffect, useRef, useState } from "react";

function AccountModal({ account, user, isOpen, onClose, onLogout, onUpdateProfile }) {
  const [activeSection, setActiveSection] = useState("profile");
  const [chatSettings, setChatSettings] = useState({
    notifications: true,
    showPresence: true,
    compactMode: false,
  });
  const [avatarPreview, setAvatarPreview] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [nickname, setNickname] = useState("");
  const [saveError, setSaveError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    setFirstName(user?.first_name || "");
    setLastName(user?.last_name || "");
    setNickname(user?.nickname || "");
    setSaveError("");
  }, [isOpen, user]);

  useEffect(() => {
    return () => {
      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview]);

  const updateChatSetting = (key) => (event) => {
    setChatSettings((prev) => ({
      ...prev,
      [key]: event.target.checked,
    }));
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal settings-modal">
        <div className="modal-header">
          <div>
            <p className="modal-title">Настройки приложения</p>
            <p className="modal-sub">Профиль, чаты и безопасность</p>
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
        <div className="settings-layout">
          <nav className="settings-menu">
            <button
              className={`settings-tab ${activeSection === "profile" ? "active" : ""}`}
              type="button"
              onClick={() => setActiveSection("profile")}
            >
              Профиль
              <span>Личные данные</span>
            </button>
            <button
              className={`settings-tab ${activeSection === "chats" ? "active" : ""}`}
              type="button"
              onClick={() => setActiveSection("chats")}
            >
              Чаты
              <span>Уведомления и статус</span>
            </button>
            <button
              className={`settings-tab ${activeSection === "security" ? "active" : ""}`}
              type="button"
              onClick={() => setActiveSection("security")}
            >
              Безопасность
              <span>Сессии и доступы</span>
            </button>
            <button
              className={`settings-tab ${activeSection === "appearance" ? "active" : ""}`}
              type="button"
              onClick={() => setActiveSection("appearance")}
            >
              Интерфейс
              <span>Вид и плотность</span>
            </button>
            <button className="settings-tab logout" type="button" onClick={onLogout}>
              Выход
              <span>Завершить сессию</span>
            </button>
          </nav>
          <div className="settings-content">
            {activeSection === "profile" && (
              <>
                {account && (
                  <div className="modal-profile">
                    <div className="avatar avatar-edit">
                      {avatarPreview ? (
                        <img src={avatarPreview} alt={account.name} />
                      ) : (
                        account.name
                          .split(" ")
                          .map((part) => part[0])
                          .join("")
                      )}
                    </div>
                    <div>
                      <p className="modal-name">{account.name}</p>
                      <p className="modal-handle">{account.handle}</p>
                    </div>
                    <div className="avatar-actions">
                      <input
                        ref={fileInputRef}
                        className="file-input"
                        type="file"
                        accept="image/*"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (!file) {
                            return;
                          }
                          if (avatarPreview) {
                            URL.revokeObjectURL(avatarPreview);
                          }
                          setAvatarPreview(URL.createObjectURL(file));
                        }}
                      />
                      <button
                        className="ghost"
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        Сменить аватар
                      </button>
                    </div>
                  </div>
                )}
                <div className="settings-section">
                  <label className="settings-field">
                    Имя
                    <input
                      type="text"
                      value={firstName}
                      onChange={(event) => setFirstName(event.target.value)}
                      placeholder="Имя"
                    />
                  </label>
                  <label className="settings-field">
                    Фамилия
                    <input
                      type="text"
                      value={lastName}
                      onChange={(event) => setLastName(event.target.value)}
                      placeholder="Фамилия (необязательно)"
                    />
                  </label>
                  <label className="settings-field">
                    Никнейм
                    <input
                      type="text"
                      value={nickname}
                      onChange={(event) => setNickname(event.target.value)}
                      placeholder="Например: space.point (латиница)"
                    />
                  </label>
                  <label className="settings-field">
                    Описание
                    <textarea placeholder="Скоро будет доступно" rows={3} disabled />
                  </label>
                </div>
                <div className="settings-actions">
                  {saveError && <span className="settings-error">{saveError}</span>}
                  <button
                    className="primary"
                    type="button"
                    onClick={async () => {
                      if (!firstName.trim()) {
                        setSaveError("Имя обязательно");
                        return;
                      }
                      setSaveError("");
                      setIsSaving(true);
                      try {
                        await onUpdateProfile?.({
                          firstName,
                          lastName,
                          nickname,
                        });
                      } catch (error) {
                        setSaveError(error.message || "Ошибка сохранения");
                      } finally {
                        setIsSaving(false);
                      }
                    }}
                    disabled={isSaving}
                  >
                    {isSaving ? "Сохранение..." : "Сохранить"}
                  </button>
                </div>
              </>
            )}
            {activeSection === "chats" && (
              <>
                <div className="settings-section">
                  <label className="settings-toggle">
                    <input
                      type="checkbox"
                      checked={chatSettings.notifications}
                      onChange={updateChatSetting("notifications")}
                    />
                    <span>Уведомления чатов</span>
                  </label>
                  <label className="settings-toggle">
                    <input
                      type="checkbox"
                      checked={chatSettings.showPresence}
                      onChange={updateChatSetting("showPresence")}
                    />
                    <span>Показывать статус в чатах</span>
                  </label>
                  <label className="settings-toggle">
                    <input
                      type="checkbox"
                      checked={chatSettings.compactMode}
                      onChange={updateChatSetting("compactMode")}
                    />
                    <span>Компактный список диалогов</span>
                  </label>
                </div>
                <div className="settings-actions">
                  <button className="primary" type="button" disabled>
                    Применить (скоро)
                  </button>
                </div>
              </>
            )}
            {activeSection === "security" && (
              <>
                <div className="settings-section">
                  <div className="settings-card">
                    <p>Активные устройства</p>
                    <span>Это устройство · Сейчас</span>
                  </div>
                  <div className="settings-card">
                    <p>Доступы к API</p>
                    <span>Пока нет дополнительных токенов</span>
                  </div>
                </div>
                <div className="settings-actions">
                  <button className="ghost" type="button" disabled>
                    Управлять (скоро)
                  </button>
                </div>
              </>
            )}
            {activeSection === "appearance" && (
              <>
                <div className="settings-section">
                  <label className="settings-field">
                    Плотность интерфейса
                    <select defaultValue="Комфортно">
                      <option value="Комфортно">Комфортно</option>
                      <option value="Компактно">Компактно</option>
                    </select>
                  </label>
                  <label className="settings-field">
                    Акцентный цвет
                    <select defaultValue="Синий">
                      <option value="Синий">Синий</option>
                      <option value="Зеленый">Зеленый</option>
                      <option value="Оранжевый">Оранжевый</option>
                    </select>
                  </label>
                </div>
                <div className="settings-actions">
                  <button className="primary" type="button" disabled>
                    Сохранить (скоро)
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AccountModal;
