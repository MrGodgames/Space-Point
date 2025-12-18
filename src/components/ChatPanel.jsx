function ChatPanel({ messages, thread, isMobile, onBack }) {
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
        {messages.map((message) => (
          <div
            key={`${message.author}-${message.time}`}
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
        ))}
      </div>

      <footer className="composer">
        <div className="composer-input">
          <button className="icon-button composer-attach" type="button" aria-label="Прикрепить файл">
            +
          </button>
          <input type="text" placeholder={`Передать: ${thread.title}`} />
          <button className="primary composer-send" type="button" aria-label="Отправить сообщение">
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path
                d="M3 11.4l16.2-6.7a.7.7 0 0 1 .9.9L13.4 21a.7.7 0 0 1-1.3-.1l-1.6-5-5-1.6a.7.7 0 0 1-.1-1.3z"
                fill="currentColor"
              />
            </svg>
          </button>
        </div>
      </footer>
    </section>
  );
}

export default ChatPanel;
