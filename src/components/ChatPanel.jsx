import { useEffect, useRef, useState } from "react";

function ChatPanel({
  messages,
  thread,
  isMobile,
  onBack,
  onSend,
  onEdit,
  onDelete,
  isLoading,
  onAddMember,
  onTyping,
  typingUsers = [],
  currentUserId,
  onDeleteChat,
}) {
  const [draft, setDraft] = useState("");
  const typingTimeout = useRef(null);
  const chatBodyRef = useRef(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [replyTo, setReplyTo] = useState(null);
  const [editTarget, setEditTarget] = useState(null);

  useEffect(() => {
    return () => {
      if (typingTimeout.current) {
        clearTimeout(typingTimeout.current);
      }
    };
  }, []);

  useEffect(() => {
    const container = chatBodyRef.current;
    if (!container) {
      return;
    }

    const threshold = 120;
    const updatePosition = () => {
      const distance =
        container.scrollHeight - container.scrollTop - container.clientHeight;
      setIsAtBottom(distance <= threshold);
    };

    container.addEventListener("scroll", updatePosition);
    updatePosition();

    return () => {
      container.removeEventListener("scroll", updatePosition);
    };
  }, [thread?.id]);

  useEffect(() => {
    const container = chatBodyRef.current;
    if (!container || !isAtBottom) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      container.scrollTop = container.scrollHeight;
    });

    return () => cancelAnimationFrame(frame);
  }, [messages, isLoading, thread?.id, isAtBottom]);

  useEffect(() => {
    setIsAtBottom(true);
  }, [thread?.id]);

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

    if (editTarget) {
      onEdit?.(editTarget.id, trimmed);
      setEditTarget(null);
      setDraft("");
      return;
    }

    onSend?.(trimmed, replyTo?.id);
    setDraft("");
    onTyping?.(false);
    setReplyTo(null);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    sendDraft();
  };

  useEffect(() => {
    if (!editTarget) {
      return;
    }
    setDraft(editTarget.content);
  }, [editTarget]);

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
        <div className="chat-actions">
          {!thread.is_direct && (
            <button className="ghost" type="button" onClick={onAddMember}>
              Добавить участника
            </button>
          )}
          <button className="ghost" type="button" onClick={onDeleteChat}>
            Удалить чат
          </button>
        </div>
      </header>

      <div className="chat-pills">
        <span>В эфире</span>
        <span>Голография</span>
        <span>Защищено</span>
      </div>

      <div className="chat-body">
        <div className="chat-messages" ref={chatBodyRef}>
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
                    {message.reply && (
                      <div className="reply-preview">
                        <span>{message.reply.author}</span>
                        <p>{message.reply.content}</p>
                      </div>
                    )}
                    <div className="bubble-head">
                      <span>{message.author}</span>
                      <span>{message.role}</span>
                    </div>
                    <p>{message.content}</p>
                    <div className="bubble-time">
                      {message.time}
                      {message.edited_at && (
                        <span className="read-status"> · изменено</span>
                      )}
                      {isSelf && (
                        <span className="read-status">
                          {message.readByCount > 0
                            ? " · Прочитано"
                            : " · Доставлено"}
                        </span>
                      )}
                    </div>
                    <div className="message-actions">
                      <button
                        className="ghost"
                        type="button"
                        onClick={() =>
                          setReplyTo({
                            id: message.id,
                            author: message.author,
                            content: message.content,
                          })
                        }
                      >
                        Ответить
                      </button>
                      {isSelf && (
                        <>
                          <button
                            className="ghost"
                            type="button"
                            onClick={() => {
                              setEditTarget({
                                id: message.id,
                                content: message.content,
                              });
                            }}
                          >
                            Редактировать
                          </button>
                          <button
                            className="ghost"
                            type="button"
                            onClick={() => onDelete?.(message.id)}
                          >
                            Удалить
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}

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
                  placeholder={
                    editTarget
                      ? "Редактировать сообщение"
                      : replyTo
                        ? `Ответ: ${replyTo.author}`
                        : `Передать: ${thread.title}`
                  }
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
            {(replyTo || editTarget) && (
              <div className="composer-context">
                <span>
                  {editTarget
                    ? `Редактирование: ${editTarget.content}`
                    : `Ответ: ${replyTo.author} · ${replyTo.content}`}
                </span>
                <button
                  className="ghost"
                  type="button"
                  onClick={() => {
                    setReplyTo(null);
                    setEditTarget(null);
                  }}
                >
                  Отмена
                </button>
              </div>
            )}
            {typingUsers.length > 0 && (
              <div className="typing-indicator">
                {typingUsers.join(", ")} печатает...
              </div>
            )}
          </footer>
        </div>
      </div>
    </section>
  );
}

export default ChatPanel;
