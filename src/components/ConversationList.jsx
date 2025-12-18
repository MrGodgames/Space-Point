function ConversationList({ threads, activeId, onSelect }) {
  return (
    <section className="stack">
      <header className="stack-header">
        <div>
          <p className="section-title">Диалоги</p>
          <p className="section-sub">Многоточечные передачи</p>
        </div>
        <div className="search">
          <input type="text" placeholder="Поиск по эфиру" />
          <span className="search-glow" />
        </div>
      </header>

      <div className="thread-list">
        {threads.length === 0 ? (
          <div className="empty-state">Чатов пока нет</div>
        ) : (
          threads.map((thread) => (
            <article
              key={thread.id}
              className={`thread-card ${thread.id === activeId ? "active" : ""}`}
            >
              <div className="thread-top">
                <div>
                  <p className="thread-title">{thread.title}</p>
                  <p className="thread-status">{thread.status}</p>
                </div>
                <div className="thread-time">{thread.time}</div>
              </div>
              <p className="thread-preview">{thread.preview}</p>
              {thread.unread > 0 && (
                <span className="thread-unread">{thread.unread}</span>
              )}
              <button
                className="thread-action"
                type="button"
                onClick={() => onSelect?.(thread.id)}
                aria-label={`Открыть чат ${thread.title}`}
              />
            </article>
          ))
        )}
      </div>
    </section>
  );
}

export default ConversationList;
