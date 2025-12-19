import { useEffect, useRef, useState } from "react";

function ConversationList({
  threads,
  activeId,
  onSelect,
  onCreateChat,
  onCreateDirect,
  onDeleteChat,
}) {
  const [isCreating, setIsCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchRef = useRef(null);
  const listRef = useRef(null);
  const menuRef = useRef(null);
  const [contextMenu, setContextMenu] = useState(null);

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
    if (isSearchOpen) {
      searchRef.current?.focus();
    }
  }, [isSearchOpen]);

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
          <p className="section-sub">Многоточечные передачи</p>
        </div>
        <div className="search">
          <button
            className="search-toggle"
            type="button"
            aria-label={isSearchOpen ? "Скрыть поиск" : "Открыть поиск"}
            onClick={() => setIsSearchOpen(true)}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path
                d="M10.5 4a6.5 6.5 0 0 1 5.2 10.4l3.45 3.45a1 1 0 0 1-1.42 1.41l-3.44-3.44A6.5 6.5 0 1 1 10.5 4zm0 2a4.5 4.5 0 1 0 0 9a4.5 4.5 0 0 0 0-9z"
                fill="currentColor"
              />
            </svg>
          </button>
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

      <div className="thread-list" ref={listRef}>
        {threads.length === 0 ? (
          <div className="empty-state">Чатов пока нет</div>
        ) : (
          threads.map((thread) => (
            <article
              key={thread.id}
              className={`thread-card ${thread.id === activeId ? "active" : ""}`}
              onContextMenuCapture={(event) =>
                handleThreadContextMenu(event, thread)
              }
              onPointerUp={(event) =>
                handleThreadContextMenu(event, thread)
              }
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

      {isSearchOpen && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          onClick={() => setIsSearchOpen(false)}
        >
          <div className="modal search-modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <p className="modal-title">Поиск по чатам</p>
                <p className="modal-sub">Введите имя или тему диалога</p>
              </div>
              <button
                className="icon-button"
                type="button"
                aria-label="Закрыть"
                onClick={() => setIsSearchOpen(false)}
              >
                ×
              </button>
            </div>
            <div className="search search-modal-field">
              <input
                ref={searchRef}
                type="text"
                placeholder="Поиск по эфиру"
              />
              <span className="search-glow" />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default ConversationList;
