import { useState } from "react";

function ConversationList({
  threads,
  activeId,
  onSelect,
  onCreateChat,
  onCreateDirect,
}) {
  const [isCreating, setIsCreating] = useState(false);
  const [title, setTitle] = useState("");

  const submitChat = async (event) => {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      return;
    }

    await onCreateChat?.(trimmed);
    setTitle("");
    setIsCreating(false);
  };

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

      <div className="stack-actions">
        {!isCreating ? (
          <>
            <button
              className="ghost"
              type="button"
              onClick={() => setIsCreating(true)}
            >
              Новый чат
            </button>
            <button className="ghost" type="button" onClick={onCreateDirect}>
              Личный чат
            </button>
          </>
        ) : (
          <form className="new-chat" onSubmit={submitChat}>
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Название чата"
            />
            <button className="primary" type="submit">
              Создать
            </button>
            <button
              className="ghost"
              type="button"
              onClick={() => {
                setIsCreating(false);
                setTitle("");
              }}
            >
              Отмена
            </button>
          </form>
        )}
      </div>

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
