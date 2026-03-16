import { useMemo, useState } from "react";

const normalize = (value = "") => value.toLowerCase().trim();

const initialsFrom = (value = "") =>
  value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

function IOSActionSheet({
  title,
  onClose,
  primaryAction,
  secondaryAction,
  destructiveAction,
}) {
  return (
    <div className="ios-sheet-backdrop" onClick={onClose}>
      <div
        className="ios-sheet"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="ios-sheet-card">
          {title && <p className="ios-sheet-title">{title}</p>}
          {primaryAction && (
            <button
              className="ios-sheet-action"
              type="button"
              onClick={primaryAction.onClick}
            >
              {primaryAction.label}
            </button>
          )}
          {secondaryAction && (
            <button
              className="ios-sheet-action"
              type="button"
              onClick={secondaryAction.onClick}
            >
              {secondaryAction.label}
            </button>
          )}
          {destructiveAction && (
            <button
              className="ios-sheet-action destructive"
              type="button"
              onClick={destructiveAction.onClick}
            >
              {destructiveAction.label}
            </button>
          )}
        </div>
        <button className="ios-sheet-cancel" type="button" onClick={onClose}>
          Отмена
        </button>
      </div>
    </div>
  );
}

function IOSCreateChatSheet({ title, setTitle, onClose, onSubmit }) {
  return (
    <div className="ios-sheet-backdrop" onClick={onClose}>
      <div
        className="ios-sheet ios-sheet-form"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="ios-sheet-card">
          <p className="ios-sheet-title">Новый чат</p>
          <input
            className="ios-sheet-input"
            type="text"
            value={title}
            placeholder="Название чата"
            onChange={(event) => setTitle(event.target.value)}
            autoFocus
          />
          <button
            className="ios-sheet-action primary"
            type="button"
            disabled={!title.trim()}
            onClick={onSubmit}
          >
            Создать
          </button>
        </div>
        <button className="ios-sheet-cancel" type="button" onClick={onClose}>
          Отмена
        </button>
      </div>
    </div>
  );
}

function IOSHome({
  account,
  threads,
  activeId,
  quickActions,
  connectionSpeedMbps,
  isSpeedChecking,
  onCheckSpeed,
  onOpenSettings,
  onSelect,
  onCreateChat,
  onCreateDirect,
  onDeleteChat,
  presenceByUser,
  presenceNow,
  getPresenceMeta,
}) {
  const [query, setQuery] = useState("");
  const [activePortal, setActivePortal] = useState(quickActions[0] ?? "Диалоги");
  const [createSheetMode, setCreateSheetMode] = useState(null);
  const [createTitle, setCreateTitle] = useState("");
  const [threadSheet, setThreadSheet] = useState(null);

  const searchTerm = normalize(query);

  const filteredThreads = useMemo(() => {
    if (!searchTerm) {
      return threads;
    }

    return threads.filter((thread) => {
      const haystack = normalize(`${thread.title} ${thread.preview} ${thread.status}`);
      return haystack.includes(searchTerm);
    });
  }, [searchTerm, threads]);

  const connectionLabel = Number.isFinite(connectionSpeedMbps)
    ? `${connectionSpeedMbps.toFixed(1)} Мбит/с`
    : isSpeedChecking
      ? "Измерение..."
      : "Проверить";

  return (
    <section className="ios-home">
      <header className="ios-nav">
        <div>
          <p className="ios-nav-caption">Space-Point</p>
          <h1 className="ios-nav-title">Чаты</h1>
          <p className="ios-nav-subtitle">
            {account ? `${account.name} · ${account.handle}` : "Мобильный узел"}
          </p>
        </div>
        <div className="ios-nav-actions">
          <button
            className="ios-signal-pill"
            type="button"
            onClick={onCheckSpeed}
          >
            {connectionLabel}
          </button>
          <button
            className="ios-profile-button"
            type="button"
            onClick={onOpenSettings}
            aria-label="Открыть профиль"
          >
            {initialsFrom(account?.name || "SP")}
          </button>
        </div>
      </header>

      <div className="ios-toolbar">
        <div className="ios-search">
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path
              d="M10.5 4a6.5 6.5 0 0 1 5.2 10.4l3.45 3.45a1 1 0 0 1-1.42 1.41l-3.44-3.44A6.5 6.5 0 1 1 10.5 4zm0 2a4.5 4.5 0 1 0 0 9a4.5 4.5 0 0 0 0-9z"
              fill="currentColor"
            />
          </svg>
          <input
            type="search"
            placeholder="Поиск"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <button
          className="ios-compose-button"
          type="button"
          aria-label="Создать чат"
          onClick={() => setCreateSheetMode("menu")}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path
              d="M12 5v14M5 12h14"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      <div className="ios-portals" role="tablist" aria-label="Порталы">
        {quickActions.slice(0, 4).map((item) => (
          <button
            key={item}
            className={`ios-portal-chip ${item === activePortal ? "active" : ""}`}
            type="button"
            onClick={() => setActivePortal(item)}
          >
            {item}
          </button>
        ))}
      </div>

      <section className="ios-inbox">
        <div className="ios-section-header">
          <div>
            <p className="ios-section-title">Диалоги</p>
            <p className="ios-section-subtitle">
              {filteredThreads.length} активных контактов
            </p>
          </div>
          <span className="ios-section-badge">{activePortal}</span>
        </div>

        <div className="ios-thread-list">
          {filteredThreads.length === 0 ? (
            <div className="ios-empty-state">
              <p>Ничего не найдено</p>
              <span>Попробуй изменить поиск или создать новый чат.</span>
            </div>
          ) : (
            filteredThreads.map((thread) => {
              const presence =
                thread.is_direct && thread.direct_user_id
                  ? presenceByUser?.[thread.direct_user_id]
                  : null;
              const presenceMeta = getPresenceMeta?.(presence, presenceNow);
              const statusLabel = thread.is_direct
                ? presenceMeta?.label || "Не в сети"
                : `${thread.members} участников`;

              return (
                <article
                  key={thread.id}
                  className={`ios-thread-card ${thread.id === activeId ? "active" : ""}`}
                >
                  <button
                    className="ios-thread-main"
                    type="button"
                    onClick={() => onSelect?.(thread.id)}
                  >
                    <div className="ios-thread-avatar">
                      <span>{initialsFrom(thread.title)}</span>
                      {thread.is_direct && (
                        <span
                          className={`ios-presence-dot ${presenceMeta?.tone || "offline"}`}
                          aria-hidden
                        />
                      )}
                    </div>
                    <div className="ios-thread-copy">
                      <div className="ios-thread-top">
                        <p className="ios-thread-title">{thread.title}</p>
                        <span className="ios-thread-time">{thread.time}</span>
                      </div>
                      <p className="ios-thread-status">{statusLabel}</p>
                      <p className="ios-thread-preview">{thread.preview || "Без сообщений"}</p>
                    </div>
                  </button>
                  <div className="ios-thread-side">
                    {thread.unread > 0 && (
                      <span className="ios-thread-unread">{thread.unread}</span>
                    )}
                    <button
                      className="ios-thread-menu"
                      type="button"
                      aria-label={`Действия для ${thread.title}`}
                      onClick={() => setThreadSheet(thread)}
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                        <path
                          d="M12 6a1.75 1.75 0 1 0 0 .01V6zm0 5.25a1.75 1.75 0 1 0 0 .01v-.01zM12 16.5a1.75 1.75 0 1 0 0 .01v-.01z"
                          fill="currentColor"
                        />
                      </svg>
                    </button>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </section>

      {createSheetMode === "menu" && (
        <IOSActionSheet
          title="Новый диалог"
          onClose={() => setCreateSheetMode(null)}
          primaryAction={{
            label: "Создать чат",
            onClick: () => {
              setCreateSheetMode("chat");
            },
          }}
          secondaryAction={{
            label: "Личный чат",
            onClick: () => {
              setCreateSheetMode(null);
              onCreateDirect?.();
            },
          }}
        />
      )}

      {createSheetMode === "chat" && (
        <IOSCreateChatSheet
          title={createTitle}
          setTitle={setCreateTitle}
          onClose={() => {
            setCreateSheetMode(null);
            setCreateTitle("");
          }}
          onSubmit={() => {
            const trimmed = createTitle.trim();
            if (!trimmed) {
              return;
            }
            onCreateChat?.(trimmed);
            setCreateTitle("");
            setCreateSheetMode(null);
          }}
        />
      )}

      {threadSheet && (
        <IOSActionSheet
          title={threadSheet.title}
          onClose={() => setThreadSheet(null)}
          destructiveAction={{
            label: threadSheet.is_direct ? "Удалить чат" : "Покинуть чат",
            onClick: () => {
              onDeleteChat?.(threadSheet.id);
              setThreadSheet(null);
            },
          }}
        />
      )}
    </section>
  );
}

export default IOSHome;
