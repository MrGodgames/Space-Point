import { useEffect, useRef, useState } from "react";

function ChatPanel({
  messages,
  thread,
  isMobile,
  onBack,
  onSend,
  onUpload,
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
  const [attachments, setAttachments] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef(null);
  const [contextMenu, setContextMenu] = useState(null);
  const menuRef = useRef(null);
  const prevMessageCount = useRef(messages.length);
  const prevThreadId = useRef(thread?.id);
  const scrollTopRef = useRef(0);

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
      scrollTopRef.current = container.scrollTop;
    };

    container.addEventListener("scroll", updatePosition);
    updatePosition();

    return () => {
      container.removeEventListener("scroll", updatePosition);
    };
  }, [thread?.id]);

  useEffect(() => {
    const container = chatBodyRef.current;
    if (!container) {
      return;
    }

    const threadChanged = prevThreadId.current !== thread?.id;
    const prevCount = prevMessageCount.current;

    if (!isAtBottom && !threadChanged) {
      return;
    }

    if (!threadChanged && messages.length <= prevCount) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      container.scrollTop = container.scrollHeight;
    });

    return () => cancelAnimationFrame(frame);
  }, [messages, isLoading, thread?.id, isAtBottom]);

  useEffect(() => {
    const container = chatBodyRef.current;
    if (!container) {
      return;
    }

    const prevCount = prevMessageCount.current;
    const threadChanged = prevThreadId.current !== thread?.id;

    if (!threadChanged && messages.length < prevCount) {
      const frame = requestAnimationFrame(() => {
        container.scrollTop = scrollTopRef.current;
      });
      return () => cancelAnimationFrame(frame);
    }
  }, [messages, thread?.id]);

  useEffect(() => {
    prevMessageCount.current = messages.length;
    prevThreadId.current = thread?.id;
  }, [messages.length, thread?.id]);

  useEffect(() => {
    setIsAtBottom(true);
  }, [thread?.id]);

  useEffect(() => {
    setReplyTo(null);
    setEditTarget(null);
    setDraft("");
    setAttachments([]);
    setUploadError("");
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
    if (!trimmed && attachments.length === 0) {
      return;
    }

    if (editTarget) {
      onEdit?.(editTarget.id, trimmed);
      setEditTarget(null);
      setDraft("");
      return;
    }

    onSend?.(trimmed, replyTo?.id, attachments);
    setDraft("");
    onTyping?.(false);
    setReplyTo(null);
    setAttachments([]);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    sendDraft();
  };

  const handleFilesSelected = async (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) {
      return;
    }

    setIsUploading(true);
    setUploadError("");
    try {
      const uploaded = await onUpload?.(files);
      setAttachments((prev) => [...prev, ...(uploaded || [])]);
    } catch (error) {
      setUploadError(error.message || "Ошибка загрузки");
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  };

  useEffect(() => {
    if (!editTarget) {
      return;
    }
    setDraft(editTarget.content);
  }, [editTarget]);

  useEffect(() => {
    if (!contextMenu) {
      return;
    }

    const handlePointerDown = (event) => {
      const isPrimaryClick = event.button === 0 || event.pointerType === "touch";
      if (!isPrimaryClick) {
        return;
      }
      if (menuRef.current && menuRef.current.contains(event.target)) {
        return;
      }
      setContextMenu(null);
    };

    const handleClose = () => setContextMenu(null);

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        handleClose();
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("resize", handleClose);
    window.addEventListener("keydown", handleKeyDown);

    const container = chatBodyRef.current;
    if (container) {
      container.addEventListener("scroll", handleClose);
    }

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("resize", handleClose);
      window.removeEventListener("keydown", handleKeyDown);
      if (container) {
        container.removeEventListener("scroll", handleClose);
      }
    };
  }, [contextMenu]);

  const handleMessageContextMenu = (event, message, isSelf) => {
    const isRightButton = event.button === 2 || (event.buttons & 2) === 2;
    const isCtrlClick = event.button === 0 && event.ctrlKey;
    const isContextMenuEvent = event.type === "contextmenu" || isRightButton || isCtrlClick;

    if (!isContextMenuEvent) {
      return;
    }

    event.preventDefault();
    const itemCount = isSelf ? 3 : 1;
    const menuWidth = 200;
    const menuHeight = itemCount * 36 + 16;
    const container = chatBodyRef.current;
    const containerRect = container?.getBoundingClientRect();

    const rawX = event.clientX;
    const rawY = event.clientY;

    let x = rawX;
    let y = rawY;

    if (container && containerRect) {
      const offsetX = rawX - containerRect.left + container.scrollLeft;
      const offsetY = rawY - containerRect.top + container.scrollTop;
      const maxX = container.scrollLeft + container.clientWidth - menuWidth - 8;
      const maxY = container.scrollTop + container.clientHeight - menuHeight - 8;
      x = Math.max(8 + container.scrollLeft, Math.min(offsetX, maxX));
      y = Math.max(8 + container.scrollTop, Math.min(offsetY, maxY));
    } else {
      const maxX = window.innerWidth - menuWidth - 8;
      const maxY = window.innerHeight - menuHeight - 8;
      x = Math.max(8, Math.min(rawX, maxX));
      y = Math.max(8, Math.min(rawY, maxY));
    }

    setContextMenu({
      x,
      y,
      message,
      isSelf,
    });
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

      <div className="chat-body" ref={chatBodyRef}>
        <div className="chat-messages">
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
                  onContextMenuCapture={(event) =>
                    handleMessageContextMenu(event, message, isSelf)
                  }
                  onPointerUp={(event) =>
                    handleMessageContextMenu(event, message, isSelf)
                  }
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
                  {message.content && <p>{message.content}</p>}
                    {message.attachments?.length > 0 && (
                      <div className="attachments-list">
                        {message.attachments.map((file) => (
                          <a
                            key={file.object_key}
                            className="attachment-item"
                            href={file.url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {file.mime_type.startsWith("image/") && (
                              <img src={file.url} alt={file.original_name} />
                            )}
                            <span className="attachment-name">
                              {file.original_name}
                            </span>
                          </a>
                        ))}
                      </div>
                    )}
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
                  </div>
                </div>
              );
            })
          )}
        </div>
        {contextMenu && (
          <div
            className="message-actions"
            ref={menuRef}
            style={{ top: contextMenu.y, left: contextMenu.x }}
          >
            <button
              className="ghost"
              type="button"
              onClick={() => {
                setReplyTo({
                  id: contextMenu.message.id,
                  author: contextMenu.message.author,
                  content: contextMenu.message.content,
                });
                setContextMenu(null);
              }}
            >
              Ответить
            </button>
            {contextMenu.isSelf && (
              <>
                <button
                  className="ghost"
                  type="button"
                  onClick={() => {
                    setEditTarget({
                      id: contextMenu.message.id,
                      content: contextMenu.message.content,
                    });
                    setContextMenu(null);
                  }}
                >
                  Редактировать
                </button>
                <button
                  className="ghost"
                  type="button"
                  onClick={() => {
                    onDelete?.(contextMenu.message.id);
                    setContextMenu(null);
                  }}
                >
                  Удалить
                </button>
              </>
            )}
          </div>
        )}
        <footer className="composer">
          <div className="composer-input">
            <form className="composer-form" onSubmit={handleSubmit}>
                <button
                  className="icon-button composer-attach"
                  type="button"
                  aria-label="Прикрепить файл"
                  onClick={() => fileInputRef.current?.click()}
                >
                  +
                </button>
                <input
                  ref={fileInputRef}
                  className="file-input"
                  type="file"
                  multiple
                  onChange={handleFilesSelected}
                  accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip,.rar,.7z"
                />
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
            {attachments.length > 0 && (
              <div className="attachments-draft">
                {attachments.map((file) => (
                  <div key={file.object_key} className="attachment-chip">
                    <span>{file.original_name}</span>
                    <button
                      className="ghost"
                      type="button"
                      onClick={() =>
                        setAttachments((prev) =>
                          prev.filter((item) => item.object_key !== file.object_key)
                        )
                      }
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            {isUploading && (
              <div className="upload-status">Загрузка файлов...</div>
            )}
            {uploadError && <div className="auth-error">{uploadError}</div>}
            {typingUsers.length > 0 && (
              <div className="typing-indicator">
                {typingUsers.join(", ")} печатает...
              </div>
            )}
        </footer>
      </div>
    </section>
  );
}

export default ChatPanel;
