import { useState } from "react";

function ChatPanel({ messages, thread, isMobile, onBack, onSend, isLoading }) {
  const [draft, setDraft] = useState("");

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
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    sendDraft();
  };

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
            {thread.members} · {thread.location}
          </p>
        </div>
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
          messages.map((message) => (
            <div
              key={message.id ?? `${message.author}-${message.time}`}
              className={`message ${message.isSelf ? "self" : ""}`}
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
                <div className="bubble-time">{message.time}</div>
              </div>
            </div>
          ))
        )}
      </div>

      <footer className="composer">
        <div className="composer-input">
          <form className="composer-form" onSubmit={handleSubmit}>
            <input
              type="text"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={`Передать: ${thread.title}`}
            />
            <button className="icon-button" aria-label="Отправить">
              ↑
            </button>
          </form>
        </div>
        <div className="composer-actions">
          <button className="primary" type="button" onClick={sendDraft}>
            Отправить импульс
          </button>
        </div>
      </footer>
    </section>
  );
}

export default ChatPanel;
