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
          <input type="text" placeholder={`Передать: ${thread.title}`} />
          <button className="icon-button" aria-label="Прикрепить медиа">
            +
          </button>
        </div>
        <div className="composer-actions">
          <button className="primary">Отправить импульс</button>
        </div>
      </footer>
    </section>
  );
}

export default ChatPanel;
