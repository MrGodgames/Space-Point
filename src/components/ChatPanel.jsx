import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

function ChatPanel({
  messages,
  thread,
  isMobile,
  presenceMeta,
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
  const [loadedImages, setLoadedImages] = useState({});
  const [preview, setPreview] = useState(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);
  const messageRefs = useRef(new Map());
  const prevMessageCount = useRef(messages.length);
  const prevThreadId = useRef(thread?.id);
  const scrollTopRef = useRef(0);
  const headerMenuRef = useRef(null);

  useEffect(() => {
    if (!isHeaderMenuOpen) {
      return;
    }

    const handlePointerDown = (event) => {
      if (headerMenuRef.current?.contains(event.target)) {
        return;
      }
      setIsHeaderMenuOpen(false);
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("resize", handlePointerDown);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("resize", handlePointerDown);
    };
  }, [isHeaderMenuOpen]);

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

  const messageById = useMemo(() => {
    const next = new Map();
    messages.forEach((message) => {
      if (message.id != null) {
        next.set(message.id, message);
      }
    });
    return next;
  }, [messages]);

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
    setPreview(null);
    setIsPreviewLoading(false);
    setLoadedImages({});
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
    if (!preview) {
      return;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setPreview(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [preview]);

  return (
    <section className="chat">
      <header className="chat-header">
        <div className="chat-profile">
          <div className="avatar chat-avatar">
            {thread.title
              .split(" ")
              .map((part) => part[0])
              .join("")}
          </div>
          <div>
            <div className="chat-title-row">
              {isMobile && (
                <button className="back-button" type="button" onClick={onBack}>
                  ← Чаты
                </button>
              )}
              <p className="chat-title">{thread.title}</p>
            </div>
            <div className="chat-meta">
              {thread.is_direct && (
                <>
                  <span
                    className={`presence-dot ${presenceMeta?.tone || "offline"}`}
                    aria-hidden
                  />
                  <span className={`chat-presence ${presenceMeta?.tone || "offline"}`}>
                    {presenceMeta?.label || "Не в сети"}
                  </span>
                  <span className="chat-divider">•</span>
                </>
              )}
              <span className="chat-sub">
                {thread.is_direct
                  ? "Личный чат"
                  : `${thread.members} · ${thread.location}`}
              </span>
            </div>
          </div>
        </div>
        <div className="chat-actions">
          {thread.is_direct && (
            <>
              <button className="call-button" type="button">
                Позвонить
              </button>
              <button className="ghost icon-button chat-icon" type="button">
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path
                    d="M4 7a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2.1l3.6-2.3a1 1 0 0 1 1.5.9v8.6a1 1 0 0 1-1.5.9L16 14.9V17a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7z"
                    fill="currentColor"
                  />
                </svg>
                <span>Видео</span>
              </button>
            </>
          )}
          {!thread.is_direct && (
            <button className="ghost" type="button" onClick={onAddMember}>
              Добавить участника
            </button>
          )}
          <div className="header-menu" ref={headerMenuRef}>
            <button
              className="ghost icon-button chat-icon"
              type="button"
              aria-label="Меню"
              onClick={() => setIsHeaderMenuOpen((prev) => !prev)}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path
                  d="M6 12a2 2 0 1 0 0 .01V12zm6 0a2 2 0 1 0 0 .01V12zm6 0a2 2 0 1 0 0 .01V12z"
                  fill="currentColor"
                />
              </svg>
            </button>
            {isHeaderMenuOpen && (
              <div className="header-menu-panel">
                <button
                  className="ghost danger"
                  type="button"
                  onClick={() => {
                    setIsHeaderMenuOpen(false);
                    onDeleteChat?.();
                  }}
                >
                  Удалить чат
                </button>
              </div>
            )}
          </div>
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
              const isSelfById =
                currentUserId != null &&
                message.user_id != null &&
                Number(message.user_id) === Number(currentUserId);
              const isSelf = message.isSelf === true || isSelfById;
              const replyTarget =
                message.reply_to != null
                  ? messageById.get(message.reply_to)
                  : null;
              const replyImage = replyTarget?.attachments?.find((file) =>
                file.mime_type?.startsWith("image/")
              );
              const replyText =
                message.reply?.content || (replyImage ? "Вложение" : "");

              return (
                <div
                  key={message.id ?? `${message.author}-${message.time}`}
                  className={`message ${isSelf ? "self" : ""}`}
                  ref={(node) => {
                    if (message.id == null) {
                      return;
                    }
                    if (node) {
                      messageRefs.current.set(message.id, node);
                    } else {
                      messageRefs.current.delete(message.id);
                    }
                  }}
                >
                  <div className="avatar">
                    {message.author
                      .split(" ")
                      .map((part) => part[0])
                      .join("")}
                  </div>
                  <div className="bubble">
                    <div className={`message-actions-inline ${isSelf ? "self" : ""}`}>
                      <button
                        className="message-action-button reply"
                        type="button"
                        aria-label="Ответить"
                        onClick={() =>
                          setReplyTo({
                            id: message.id,
                            author: message.author,
                            content: message.content,
                          })
                        }
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                          <path
                            d="M10 7V4L3 11l7 7v-3h6a5 5 0 0 0 5-5V9"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                      {isSelf && (
                        <button
                          className="message-action-button edit"
                          type="button"
                          aria-label="Редактировать"
                          onClick={() => {
                            setEditTarget({
                              id: message.id,
                              content: message.content,
                            });
                          }}
                        >
                          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                            <path
                              d="M3 17.25V21h3.75L18.5 9.25l-3.75-3.75L3 17.25z"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinejoin="round"
                            />
                            <path
                              d="M14.75 5.5l3.75 3.75"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                            />
                          </svg>
                        </button>
                      )}
                      {isSelf && (
                        <button
                          className="message-action-button delete"
                          type="button"
                          aria-label="Удалить"
                          onClick={() => onDelete?.(message.id)}
                        >
                          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                            <path
                              d="M4 7h16"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                            />
                            <path
                              d="M9 7V5h6v2"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                            />
                            <path
                              d="M7 7l1 12h8l1-12"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </button>
                      )}
                    </div>
                    {message.reply && (
                      <button
                        className="reply-preview"
                        type="button"
                        onClick={() => {
                          if (message.reply_to == null) {
                            return;
                          }
                          const target = messageRefs.current.get(
                            message.reply_to
                          );
                          if (target) {
                            const container = chatBodyRef.current;
                            if (!container) {
                              return;
                            }
                            const targetRect = target.getBoundingClientRect();
                            const containerRect = container.getBoundingClientRect();
                            const targetTop =
                              targetRect.top - containerRect.top + container.scrollTop;
                            const centeredTop =
                              targetTop -
                              (container.clientHeight / 2 - targetRect.height / 2);
                            container.scrollTo({
                              top: Math.max(0, centeredTop),
                              behavior: "smooth",
                            });
                          }
                        }}
                      >
                        {replyImage && (
                          <img
                            className="reply-preview-thumb"
                            src={replyImage.url}
                            alt={replyImage.original_name}
                          />
                        )}
                        <div className="reply-preview-text">
                          <span>{message.reply.author}</span>
                          <p>{replyText}</p>
                        </div>
                      </button>
                    )}
                    {message.content && <p>{message.content}</p>}
                    {message.attachments?.length > 0 && (
                      <div className="attachments-list">
                        {message.attachments.map((file) => (
                          <div
                            key={file.object_key}
                            className="attachment-item"
                          >
                            {file.mime_type.startsWith("image/") ? (
                              <button
                                className="attachment-image"
                                type="button"
                                onClick={() => {
                                  setPreview({
                                    url: file.url,
                                    name: file.original_name,
                                  });
                                  setIsPreviewLoading(true);
                                }}
                              >
                                <span
                                  className={`image-frame ${
                                    loadedImages[file.object_key]
                                      ? "is-loaded"
                                      : ""
                                  }`}
                                >
                                  <span className="image-spinner" aria-hidden />
                                  <img
                                    src={file.url}
                                    alt={file.original_name}
                                    onLoad={() =>
                                      setLoadedImages((prev) => ({
                                        ...prev,
                                        [file.object_key]: true,
                                      }))
                                    }
                                    onError={() =>
                                      setLoadedImages((prev) => ({
                                        ...prev,
                                        [file.object_key]: true,
                                      }))
                                    }
                                  />
                                </span>
                              </button>
                            ) : (
                              <a
                                className="attachment-link"
                                href={file.url}
                                target="_blank"
                                rel="noreferrer"
                              >
                                <span className="attachment-name">
                                  {file.original_name}
                                </span>
                              </a>
                            )}
                          </div>
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
        <footer className="composer">
          <div className="composer-input">
            <form className="composer-form" onSubmit={handleSubmit}>
              <button
                className="composer-icon composer-attach"
                type="button"
                aria-label="Прикрепить файл"
                onClick={() => fileInputRef.current?.click()}
              >
                <span className="composer-attach-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" focusable="false">
                    <path
                      d="M12 5v14M5 12h14"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
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
                className="composer-field"
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
              <button
                className="composer-icon composer-mic"
                type="button"
                aria-label="Запись голоса"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path
                    d="M12 3a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3zm5 9a5 5 0 0 1-10 0"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M12 17v4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
              <button
                className="composer-icon composer-send"
                type="submit"
                aria-label="Отправить сообщение"
              >
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
              <div className="upload-status">
                <span className="upload-spinner" aria-hidden />
                Загрузка файлов...
              </div>
            )}
            {uploadError && <div className="auth-error">{uploadError}</div>}
            {typingUsers.length > 0 && (
              <div className="typing-indicator">
                {typingUsers.join(", ")} печатает...
              </div>
            )}
        </footer>
      </div>
      {preview &&
        createPortal(
          <div
            className="image-preview"
            onClick={(event) => {
              if (event.target === event.currentTarget) {
                setPreview(null);
              }
            }}
          >
            <div className="image-preview-card">
              <button
                className="ghost image-preview-close"
                type="button"
                onClick={() => setPreview(null)}
              >
                Закрыть
              </button>
              <div className="image-preview-frame">
                {isPreviewLoading && (
                  <div className="image-preview-spinner" aria-hidden />
                )}
                <img
                  src={preview.url}
                  alt={preview.name}
                  onLoad={() => setIsPreviewLoading(false)}
                  onError={() => setIsPreviewLoading(false)}
                />
              </div>
              <div className="image-preview-name">{preview.name}</div>
            </div>
          </div>,
          document.body
        )}
    </section>
  );
}

export default ChatPanel;
