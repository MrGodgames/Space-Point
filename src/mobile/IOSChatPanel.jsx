import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { invoke } from "@tauri-apps/api/core";

const LONG_PRESS_DURATION_MS = 450;
const LONG_PRESS_MOVE_THRESHOLD_PX = 12;

const getInitials = (value = "") =>
  value
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2);

function IOSChatPanel({
  messages,
  thread,
  presenceMeta,
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
  onBack,
}) {
  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [preview, setPreview] = useState(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [loadedImages, setLoadedImages] = useState({});
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [activeMessageActionsId, setActiveMessageActionsId] = useState(null);
  const screenRef = useRef(null);
  const typingTimeout = useRef(null);
  const fileInputRef = useRef(null);
  const inputRef = useRef(null);
  const scrollRef = useRef(null);
  const headerMenuRef = useRef(null);
  const messageRefs = useRef(new Map());
  const prevMessageCount = useRef(messages.length);
  const prevThreadId = useRef(thread?.id);
  const scrollTopRef = useRef(0);
  const bottomDeltaRef = useRef(0);
  const messageLongPressTimerRef = useRef(null);
  const messageTouchStartRef = useRef(null);

  const clearMessageLongPressTimer = () => {
    if (messageLongPressTimerRef.current) {
      clearTimeout(messageLongPressTimerRef.current);
      messageLongPressTimerRef.current = null;
    }
  };

  const startMessageLongPress = (messageId, event) => {
    const touch = event.touches?.[0];
    if (!touch || messageId == null) {
      return;
    }

    messageTouchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
    };

    clearMessageLongPressTimer();
    messageLongPressTimerRef.current = setTimeout(() => {
      setActiveMessageActionsId(messageId);
      clearMessageLongPressTimer();
    }, LONG_PRESS_DURATION_MS);
  };

  const handleMessageTouchMove = (event) => {
    if (!messageTouchStartRef.current) {
      return;
    }
    const touch = event.touches?.[0];
    if (!touch) {
      return;
    }

    const deltaX = Math.abs(touch.clientX - messageTouchStartRef.current.x);
    const deltaY = Math.abs(touch.clientY - messageTouchStartRef.current.y);
    if (deltaX > LONG_PRESS_MOVE_THRESHOLD_PX || deltaY > LONG_PRESS_MOVE_THRESHOLD_PX) {
      clearMessageLongPressTimer();
      messageTouchStartRef.current = null;
    }
  };

  const endMessageLongPress = () => {
    clearMessageLongPressTimer();
    messageTouchStartRef.current = null;
  };

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
      clearMessageLongPressTimer();
      if (typingTimeout.current) {
        clearTimeout(typingTimeout.current);
      }
    };
  }, []);

  useEffect(() => {
    const screen = screenRef.current;
    if (!screen) return;

    const enforceScrollBounds = () => {
      // FORCE Safari to abandon any attempts at shifting the root document to keep inputs in view!
      // This protects the absolute header from flying off the physical display.
      if (window.scrollY !== 0 || document.body.scrollTop !== 0) {
        window.scrollTo(0, 0);
        document.body.scrollTop = 0;
      }
    };

    const syncViewport = () => {
      const viewport = window.visualViewport;
      if (!viewport) return;
      enforceScrollBounds();
      // Track EXACT physical viewport height remaining above the keyboard.
      screen.style.setProperty("--device-height", `${viewport.height}px`);
    };

    window.visualViewport?.addEventListener("resize", syncViewport);
    window.visualViewport?.addEventListener("scroll", syncViewport);
    window.addEventListener("scroll", enforceScrollBounds, { passive: false });
    
    syncViewport();

    return () => {
      window.visualViewport?.removeEventListener("resize", syncViewport);
      window.visualViewport?.removeEventListener("scroll", syncViewport);
      window.removeEventListener("scroll", enforceScrollBounds);
      screen.style.removeProperty("--device-height");
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
    const container = scrollRef.current;
    if (!container) {
      return;
    }

    const threshold = 120;
    const updatePosition = () => {
      if (container.scrollLeft !== 0) {
        container.scrollLeft = 0;
      }
      const maxTop = Math.max(0, container.scrollHeight - container.clientHeight);
      if (container.scrollTop < 0) {
        container.scrollTop = 0;
      } else if (container.scrollTop > maxTop) {
        container.scrollTop = maxTop;
      }
      const distance =
        container.scrollHeight - container.scrollTop - container.clientHeight;
      bottomDeltaRef.current = distance;
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
    const container = scrollRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => {
      // If we were reasonably close to the bottom, force scroll to new max
      if (bottomDeltaRef.current <= 120) {
        container.scrollTop = container.scrollHeight - container.clientHeight;
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const container = scrollRef.current;
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
    const container = scrollRef.current;
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
    setReplyTo(null);
    setEditTarget(null);
    setDraft("");
    setAttachments([]);
    setUploadError("");
    setPreview(null);
    setIsPreviewLoading(false);
    setLoadedImages({});
    setIsAtBottom(true);
    setActiveMessageActionsId(null);
  }, [thread?.id]);

  useEffect(() => {
    if (activeMessageActionsId == null) {
      return;
    }

    const handlePointerDown = (event) => {
      if (!(event.target instanceof Element)) {
        return;
      }
      if (event.target.closest(".ios-chat-message")) {
        return;
      }
      setActiveMessageActionsId(null);
    };

    window.addEventListener("pointerdown", handlePointerDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [activeMessageActionsId]);

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

  if (!thread) {
    return (
      <section className="ios-chat-screen ios-chat-screen-empty" ref={screenRef}>
        <div className="ios-chat-empty">
          <p>Выберите чат</p>
          <span>Откройте диалог из списка, чтобы начать переписку.</span>
        </div>
      </section>
    );
  }

  return (
    <section className="ios-chat-screen" ref={screenRef}>
      <header className="ios-chat-header">
        <div className="ios-chat-header-main">
          <button
            className="ios-chat-back"
            type="button"
            aria-label="Назад к списку чатов"
            onClick={onBack}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path
                d="M15 6l-6 6 6 6"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <div className="ios-chat-thread">
            <div className="ios-chat-avatar">{getInitials(thread.title)}</div>
            <div className="ios-chat-thread-copy">
              <p className="ios-chat-title">{thread.title}</p>
              <div className="ios-chat-meta">
                {thread.is_direct && (
                  <>
                    <span
                      className={`ios-chat-presence-dot ${presenceMeta?.tone || "offline"}`}
                      aria-hidden
                    />
                    <span className="ios-chat-presence-label">
                      {presenceMeta?.label || "Не в сети"}
                    </span>
                    <span className="ios-chat-meta-divider">•</span>
                  </>
                )}
                <span className="ios-chat-subline">
                  {thread.is_direct
                    ? "Личный канал"
                    : `${thread.members} · ${thread.location}`}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="ios-chat-actions" ref={headerMenuRef}>
          <button
            className="ios-chat-header-button"
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
            <div className="ios-chat-menu">
              {!thread?.is_direct && (
                <button
                  className="ios-chat-menu-action"
                  type="button"
                  onClick={() => {
                    setIsHeaderMenuOpen(false);
                    onAddMember?.();
                  }}
                >
                  Добавить участника
                </button>
              )}
              <button
                className="ios-chat-menu-action ios-chat-menu-action-danger"
                type="button"
                onClick={() => {
                  setIsHeaderMenuOpen(false);
                  onDeleteChat?.(thread.id);
                }}
              >
                {thread?.is_direct ? "Удалить чат" : "Покинуть чат"}
              </button>
            </div>
          )}
        </div>
      </header>

      <div
        className="ios-chat-scroll"
        ref={scrollRef}
        onTouchStart={(event) => {
          if (
            event.target instanceof Element &&
            !event.target.closest(".ios-chat-message-actions")
          ) {
            setActiveMessageActionsId(null);
          }
          if (document.activeElement === inputRef.current) {
            inputRef.current?.blur();
          }
        }}
      >
        {isLoading ? (
          <div className="ios-chat-empty">
            <p>Загрузка сообщений...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="ios-chat-empty">
            <p>Сообщений пока нет</p>
            <span>Первое сообщение появится здесь.</span>
          </div>
        ) : (
          messages.map((message) => {
            const attachmentList = message.attachments || [];
            const isSelfById =
              currentUserId != null &&
              message.user_id != null &&
              Number(message.user_id) === Number(currentUserId);
            const isSelf = message.isSelf === true || isSelfById;
            const replyTarget =
              message.reply_to != null ? messageById.get(message.reply_to) : null;
            const replyImage = replyTarget?.attachments?.find((file) =>
              file.mime_type?.startsWith("image/")
            );
            const replyText =
              message.reply?.content || (replyImage ? "Вложение" : "");
            const hasOnlyImageAttachments =
              attachmentList.length > 0 &&
              attachmentList.every((file) => file.mime_type?.startsWith("image/"));
            const isMediaOnlyMessage =
              hasOnlyImageAttachments && !message.content && !message.reply;
            const isActionsVisible = activeMessageActionsId === message.id;

            return (
              <article
                key={message.id ?? `${message.author}-${message.time}`}
                className={`ios-chat-message ${isSelf ? "is-self" : ""}`}
                onContextMenu={(event) => event.preventDefault()}
                onTouchStart={(event) => startMessageLongPress(message.id, event)}
                onTouchMove={handleMessageTouchMove}
                onTouchEnd={endMessageLongPress}
                onTouchCancel={endMessageLongPress}
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
                {!isSelf && (
                  <div className="ios-chat-message-avatar">
                    {getInitials(message.author)}
                  </div>
                )}
                <div
                  className={`ios-chat-bubble ${isMediaOnlyMessage ? "is-media-only" : ""}`}
                >
                  {isActionsVisible && (
                    <div className="ios-chat-message-actions">
                      <button
                        className="ios-chat-message-action"
                        type="button"
                        aria-label="Ответить"
                        onClick={() => {
                          setActiveMessageActionsId(null);
                          setReplyTo({
                            id: message.id,
                            author: message.author,
                            content: message.content,
                          });
                        }}
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
                        <>
                          <button
                            className="ios-chat-message-action"
                            type="button"
                            aria-label="Редактировать"
                            onClick={() => {
                              setActiveMessageActionsId(null);
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
                          <button
                            className="ios-chat-message-action"
                            type="button"
                            aria-label="Удалить"
                            onClick={() => {
                              setActiveMessageActionsId(null);
                              onDelete?.(message.id);
                            }}
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
                        </>
                      )}
                    </div>
                  )}

                  {message.reply && (
                    <button
                      className="ios-chat-reply"
                      type="button"
                      onClick={() => {
                        if (message.reply_to == null) {
                          return;
                        }
                        const target = messageRefs.current.get(message.reply_to);
                        const container = scrollRef.current;
                        if (!target || !container) {
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
                      }}
                    >
                      {replyImage && (
                        <img
                          className="ios-chat-reply-thumb"
                          src={replyImage.url}
                          alt={replyImage.original_name}
                        />
                      )}
                      <div className="ios-chat-reply-copy">
                        <span>{message.reply.author}</span>
                        <p>{replyText}</p>
                      </div>
                    </button>
                  )}

                  {message.content && <p className="ios-chat-bubble-text">{message.content}</p>}

                  {attachmentList.length > 0 && (
                    <div
                      className={`ios-chat-attachments ${
                        isMediaOnlyMessage ? "is-media-only" : ""
                      }`}
                    >
                      {attachmentList.map((file) => (
                        <div key={file.object_key} className="ios-chat-attachment">
                          {file.mime_type.startsWith("image/") ? (
                            <button
                              className="ios-chat-attachment-preview"
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
                                className={`ios-chat-image-frame ${
                                  loadedImages[file.object_key] ? "is-loaded" : ""
                                }`}
                              >
                                <span className="ios-chat-image-spinner" aria-hidden />
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
                              className="ios-chat-file"
                              href={file.url}
                              target="_blank"
                              rel="noreferrer"
                            >
                              {file.original_name}
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <div
                    className={`ios-chat-bubble-meta ${
                      isMediaOnlyMessage ? "is-overlay" : ""
                    }`}
                  >
                    <span>{message.time}</span>
                    {message.edited_at && <span>изменено</span>}
                    {isSelf && (
                      <span>{message.readByCount > 0 ? "Прочитано" : "Доставлено"}</span>
                    )}
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>

      <button
        className={`scroll-to-bottom ios-chat-scroll-to-bottom ${!isAtBottom ? "visible" : ""}`}
        type="button"
        aria-label="Вниз"
        onClick={() => {
          const container = scrollRef.current;
          if (container) {
            container.scrollTo({
              top: container.scrollHeight,
              behavior: "smooth",
            });
          }
        }}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6z" />
        </svg>
      </button>

      <footer className="ios-chat-composer-shell">
        {(replyTo || editTarget) && (
          <div className="ios-chat-context">
            <span>
              {editTarget
                ? `Редактирование: ${editTarget.content}`
                : `Ответ: ${replyTo.author} · ${replyTo.content}`}
            </span>
            <button
              className="ios-chat-context-action"
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
          <div className="ios-chat-draft-files">
            {attachments.map((file) => (
              <div key={file.object_key} className="ios-chat-draft-chip">
                <span>{file.original_name}</span>
                <button
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
          <div className="ios-chat-statusline">
            <span className="ios-chat-status-spinner" aria-hidden />
            Загрузка файлов...
          </div>
        )}

        {uploadError && <div className="auth-error">{uploadError}</div>}
        {typingUsers.length > 0 && (
          <div className="ios-chat-statusline">{typingUsers.join(", ")} печатает...</div>
        )}

        <form className="ios-chat-composer" onSubmit={handleSubmit}>
          <button
            className="ios-chat-composer-button"
            type="button"
            aria-label="Прикрепить файл"
            onClick={() => fileInputRef.current?.click()}
          >
            <svg viewBox="0 0 24 24" focusable="false">
              <path
                d="M12 5v14M5 12h14"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
          <input
            ref={fileInputRef}
            className="file-input"
            type="file"
            tabIndex={-1}
            multiple
            onChange={handleFilesSelected}
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip,.rar,.7z"
          />
          <input
            ref={inputRef}
            className="ios-chat-input"
            type="text"
            autoComplete="off"
            autoCorrect="on"
            autoCapitalize="sentences"
            enterKeyHint="send"
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
            className="ios-chat-send"
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
      </footer>

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

export default IOSChatPanel;
