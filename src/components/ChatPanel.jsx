import { useEffect, useRef, useState } from "react";

function ChatPanel({
  messages,
  thread,
  isMobile,
  onBack,
  onSend,
  isLoading,
  onAddMember,
  onTyping,
  typingUsers = [],
  currentUserId,
}) {
  const [draft, setDraft] = useState("");
  const typingTimeout = useRef(null);

  if (!thread) {
    return (
      <section className="chat">
        <div className="empty-state">Выберите чат, чтобы начать переписку</div>
      </section>
    );
  }

  const sendDraft = () => {
    const trimmed = draft.trim();
    if (!trimmed) {
      return;
    }

    onSend?.(trimmed);
    setDraft("");
    onTyping?.(false);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    sendDraft();
  };

  useEffect(() => {
    return () => {
      if (typingTimeout.current) {
        clearTimeout(typingTimeout.current);
      }
    };
  }, []);

  return (
    <section className="chat">
      <header className="chat-header">
        <div>
          <div className="chat-title-row">
            {isMobile && (
              <button className="back-button" type="button" onClick={onBack}>
                ← Чаты
              </button>
            )}
            <p className="chat-title">{thread.title}</p>
          </div>
          <p className="chat-sub">
            {thread.is_direct ? thread.location : `${thread.members} · ${thread.location}`}
          </p>
        </div>
        {!thread.is_direct && (
          <button className="ghost" type="button" onClick={onAddMember}>
            Добавить участника
          </button>
        )}
      </header>

      <div className="chat-pills">
        <span>В эфире</span>
        <span>Голография</span>
        <span>Защищено</span>
      </div>

      <div className="chat-body">
        {isLoading ? (
          <div className="empty-state">Загрузка сообщений...</div>
        ) : messages.length === 0 ? (
          <div className="empty-state">Сообщений пока нет</div>
        ) : (
          messages.map((message) => {
            const isSelf =
              message.isSelf ?? message.user_id === currentUserId;

            return (
              <div
                key={message.id ?? `${message.author}-${message.time}`}
                className={`message ${isSelf ? "self" : ""}`}
              >
                <div className="avatar">
                  {message.author
                    .split(" ")
                    .map((part) => part[0])
                    .join("")}
                </div>
                <div className="bubble">
                  <div className="bubble-head">
                    <span>{message.author}</span>
                    <span>{message.role}</span>
                  </div>
                  <p>{message.content}</p>
                  <div className="bubble-time">
                    {message.time}
                    {isSelf && (
                      <span className="read-status">
                        {message.readByCount > 0
                          ? " · Прочитано"
                          : " · Доставлено"}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <footer className="composer">
        <div className="composer-input">
          <form className="composer-form" onSubmit={handleSubmit}>
            <button
              className="icon-button composer-attach"
              type="button"
              aria-label="Прикрепить файл"
            >
              +
            </button>
            <input
              type="text"
              value={draft}
              onChange={(event) => {
                setDraft(event.target.value);
                onTyping?.(true);
                if (typingTimeout.current) {
                  clearTimeout(typingTimeout.current);
                }
                typingTimeout.current = setTimeout(() => {
                  onTyping?.(false);
                }, 1200);
              }}
              placeholder={`Передать: ${thread.title}`}
            />
            <button className="primary composer-send" type="submit" aria-label="Отправить сообщение">
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path
                  d="M3 11.4l16.2-6.7a.7.7 0 0 1 .9.9L13.4 21a.7.7 0 0 1-1.3-.1l-1.6-5-5-1.6a.7.7 0 0 1-.1-1.3z"
                  fill="currentColor"
                />
              </svg>
            </button>
          </form>
        </div>
        {typingUsers.length > 0 && (
          <div className="typing-indicator">
            {typingUsers.join(", ")} печатает...
          </div>
        )}
      </footer>
    </section>
  );
}

export default ChatPanel;
