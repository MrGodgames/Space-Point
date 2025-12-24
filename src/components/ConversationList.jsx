import { useEffect, useRef, useState } from "react";

function ConversationList({
  threads,
  activeId,
  presenceByUser,
  presenceNow,
  getPresenceMeta,
  onSelect,
  onCreateChat,
  onCreateDirect,
  onDeleteChat,
}) {
  const [isCreating, setIsCreating] = useState(false);
  const [title, setTitle] = useState("");
  const listRef = useRef(null);
  const menuRef = useRef(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false);
  const createMenuRef = useRef(null);

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

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("resize", handleClose);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [contextMenu]);

  useEffect(() => {
    if (!isCreateMenuOpen) {
      return;
    }

    const handlePointerDown = (event) => {
      if (createMenuRef.current?.contains(event.target)) {
        return;
      }
      setIsCreateMenuOpen(false);
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("resize", handlePointerDown);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("resize", handlePointerDown);
    };
  }, [isCreateMenuOpen]);

  const handleThreadContextMenu = (event, thread) => {
    const isRightButton = event.button === 2 || (event.buttons & 2) === 2;
    const isCtrlClick = event.button === 0 && event.ctrlKey;
    const isContextMenuEvent = event.type === "contextmenu" || isRightButton || isCtrlClick;

    if (!isContextMenuEvent) {
      return;
    }

    event.preventDefault();
    const menuWidth = 200;
    const menuHeight = 52;
    const containerRect = listRef.current?.getBoundingClientRect();
    const rawX = event.clientX;
    const rawY = event.clientY;

    let x = rawX;
    let y = rawY;

    if (containerRect) {
      const offsetX = rawX - containerRect.left;
      const offsetY = rawY - containerRect.top;
      const maxX = containerRect.width - menuWidth - 8;
      const maxY = containerRect.height - menuHeight - 8;
      x = Math.max(8, Math.min(offsetX, maxX));
      y = Math.max(8, Math.min(offsetY, maxY));
    } else {
      const maxX = window.innerWidth - menuWidth - 8;
      const maxY = window.innerHeight - menuHeight - 8;
      x = Math.max(8, Math.min(rawX, maxX));
      y = Math.max(8, Math.min(rawY, maxY));
    }

    setContextMenu({ x, y, thread });
  };

  return (
    <section className="stack">
      <header className="stack-header">
        <div>
          <p className="section-title">Диалоги</p>
          <p className="section-sub">Недавние передачи</p>
        </div>
        <div className="search search-inline">
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path
              d="M10.5 4a6.5 6.5 0 0 1 5.2 10.4l3.45 3.45a1 1 0 0 1-1.42 1.41l-3.44-3.44A6.5 6.5 0 1 1 10.5 4zm0 2a4.5 4.5 0 1 0 0 9a4.5 4.5 0 0 0 0-9z"
              fill="currentColor"
            />
          </svg>
          <input type="text" placeholder="Поиск..." />
          <button className="icon-button filter-button" type="button" aria-label="Фильтры">
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path
                d="M4 5h16a1 1 0 0 1 .8 1.6l-6 8v3.4a1 1 0 0 1-.6.9l-3 1.3a1 1 0 0 1-1.4-.9v-4.7l-6-8A1 1 0 0 1 4 5z"
                fill="currentColor"
              />
            </svg>
          </button>
        </div>
      </header>

      <div className="stack-actions">
        {!isCreating ? (
          <>
            <div className="create-menu" ref={createMenuRef}>
              <button
                className="primary create-button"
                type="button"
                onClick={() => setIsCreateMenuOpen((prev) => !prev)}
              >
                Создать чат
              </button>
              {isCreateMenuOpen && (
                <div className="create-menu-panel">
                  <button
                    className="ghost"
                    type="button"
                    onClick={() => {
                      setIsCreateMenuOpen(false);
                      setIsCreating(true);
                    }}
                  >
                    Новый чат
                  </button>
                  <button
                    className="ghost"
                    type="button"
                    onClick={() => {
                      setIsCreateMenuOpen(false);
                      onCreateDirect?.();
                    }}
                  >
                    Личный чат
                  </button>
                </div>
              )}
            </div>
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

      <div className="thread-list" ref={listRef}>
        {threads.length === 0 ? (
          <div className="empty-state">Чатов пока нет</div>
        ) : (
          threads.map((thread) => {
            const presence =
              thread.is_direct && thread.direct_user_id
                ? presenceByUser?.[thread.direct_user_id]
                : null;
            const presenceMeta = getPresenceMeta?.(presence, presenceNow);
            const initials = thread.title
              .split(" ")
              .map((part) => part[0])
              .join("");
            const statusLabel = thread.is_direct
              ? presenceMeta?.label || "Не в сети"
              : thread.status;
            const tone = presenceMeta?.tone || "offline";

            return (
              <article
                key={thread.id}
                className={`thread-card ${thread.is_direct ? "direct" : ""} ${
                  thread.id === activeId ? "active" : ""
                }`}
                onContextMenuCapture={(event) =>
                  handleThreadContextMenu(event, thread)
                }
                onPointerUp={(event) =>
                  handleThreadContextMenu(event, thread)
                }
              >
                <div className="thread-avatar">
                  <span>{initials}</span>
                  {thread.is_direct && (
                    <span className={`presence-dot ${tone}`} aria-hidden />
                  )}
                </div>
                <div className="thread-content">
                  <div className="thread-top">
                    <div>
                      <p className="thread-title">{thread.title}</p>
                      <p className="thread-status">{statusLabel}</p>
                    </div>
                    <div className="thread-time">{thread.time}</div>
                  </div>
                  <p className="thread-preview">{thread.preview}</p>
                </div>
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
            );
          })
        )}
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
                onDeleteChat?.(contextMenu.thread.id);
                setContextMenu(null);
              }}
            >
              Удалить чат
            </button>
          </div>
        )}
      </div>

    </section>
  );
}

export default ConversationList;
