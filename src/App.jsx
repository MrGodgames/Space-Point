import "./App.css";
import "./styles/mobile-ios.css";
import "./styles/ios-chat.css";
import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import Backdrop from "./components/Backdrop";
import NavigationRail from "./components/NavigationRail";
import ConversationList from "./components/ConversationList";
import ChatPanel from "./components/ChatPanel";
import AccountModal from "./components/AccountModal";
import UserModal from "./components/UserModal";
import IOSHome from "./mobile/IOSHome";
import IOSChatPanel from "./mobile/IOSChatPanel";
import { useIsMobileViewport } from "./hooks/useIsMobileViewport";
import { api } from "./api/client";
import { quickActions } from "./data/mockData";
import { primeNotifications, showDesktopNotification } from "./utils/notifications";

const SOCKET_URL =
  import.meta.env.VITE_API_URL || "http://46.138.243.148:4000";

const formatAccount = (user) => ({
  name: `${user.first_name}${user.last_name ? ` ${user.last_name}` : ""}`,
  handle: user.nickname ? `@${user.nickname}` : "",
  status: user.status || "Онлайн",
});

const formatTime = (date = new Date()) =>
  date.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });

const INACTIVITY_THRESHOLD_MS = 4 * 60 * 1000;
const formatRelativeTime = (timestamp, now = Date.now()) => {
  if (!timestamp) {
    return "недавно";
  }
  const diffMs = now - new Date(timestamp).getTime();
  if (!Number.isFinite(diffMs) || diffMs < 0) {
    return "недавно";
  }
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) {
    return "только что";
  }
  if (minutes < 60) {
    return `${minutes} мин назад`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} ч назад`;
  }
  const days = Math.floor(hours / 24);
  return `${days} дн назад`;
};

const getPresenceMeta = (presence, now = Date.now()) => {
  if (!presence) {
    return { label: "Не в сети", tone: "offline" };
  }

  if (presence.status === "online") {
    const lastActiveAt = presence.lastActiveAt;
    const lastActiveTime = lastActiveAt
      ? new Date(lastActiveAt).getTime()
      : now;
    if (now - lastActiveTime > INACTIVITY_THRESHOLD_MS) {
      return { label: "Неактивен", tone: "idle" };
    }
    return { label: "В сети", tone: "online" };
  }

  if (presence.lastSeenAt) {
    return {
      label: `Был ${formatRelativeTime(presence.lastSeenAt, now)}`,
      tone: "offline",
    };
  }

  return { label: "Не в сети", tone: "offline" };
};

function App() {
  const isMobileViewport = useIsMobileViewport();
  const [mobileView, setMobileView] = useState("inbox");
  const [activeThreadId, setActiveThreadId] = useState(null);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isAuth, setIsAuth] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [loginValue, setLoginValue] = useState("");
  const [passwordValue, setPasswordValue] = useState("");
  const [confirmPasswordValue, setConfirmPasswordValue] = useState("");
  const [emailValue, setEmailValue] = useState("");
  const [firstNameValue, setFirstNameValue] = useState("");
  const [lastNameValue, setLastNameValue] = useState("");
  const [authError, setAuthError] = useState("");
  const [account, setAccount] = useState(null);
  const [user, setUser] = useState(null);
  const [threads, setThreads] = useState([]);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isDirectOpen, setIsDirectOpen] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [typingByChat, setTypingByChat] = useState({});
  const [connectionSpeedMbps, setConnectionSpeedMbps] = useState(null);
  const [isSpeedChecking, setIsSpeedChecking] = useState(false);
  const [presenceByUser, setPresenceByUser] = useState({});
  const [presenceNow, setPresenceNow] = useState(Date.now());
  const socketRef = useRef(null);
  const activeThreadIdRef = useRef(null);
  const userRef = useRef(null);
  const threadsRef = useRef([]);
  const isWindowFocusedRef = useRef(
    typeof document === "undefined"
      ? true
      : document.visibilityState === "visible" && document.hasFocus()
  );
  const notifiedMessageIdsRef = useRef(new Set());
  const notificationPermissionRequestedRef = useRef(false);
  const bootstrapStartedRef = useRef(false);

  const activeThread =
    threads.find((thread) => thread.id === activeThreadId) ?? null;
  const activeTyping = activeThreadId ? typingByChat[activeThreadId] || [] : [];
  const activePresence =
    activeThread?.is_direct && activeThread.direct_user_id
      ? presenceByUser[activeThread.direct_user_id]
      : null;
  const activePresenceMeta = getPresenceMeta(activePresence, presenceNow);

  useEffect(() => {
    activeThreadIdRef.current = activeThreadId;
  }, [activeThreadId]);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    threadsRef.current = threads;
  }, [threads]);

  useEffect(() => {
    const updateWindowFocus = () => {
      isWindowFocusedRef.current =
        document.visibilityState === "visible" && document.hasFocus();
    };

    updateWindowFocus();
    window.addEventListener("focus", updateWindowFocus);
    window.addEventListener("blur", updateWindowFocus);
    document.addEventListener("visibilitychange", updateWindowFocus);

    return () => {
      window.removeEventListener("focus", updateWindowFocus);
      window.removeEventListener("blur", updateWindowFocus);
      document.removeEventListener("visibilitychange", updateWindowFocus);
    };
  }, []);

  const notifyAboutMessage = async (chatId, message) => {
    if (!message?.id) {
      return;
    }

    if (notifiedMessageIdsRef.current.has(message.id)) {
      return;
    }

    notifiedMessageIdsRef.current.add(message.id);
    if (notifiedMessageIdsRef.current.size > 500) {
      const first = notifiedMessageIdsRef.current.values().next().value;
      if (first) {
        notifiedMessageIdsRef.current.delete(first);
      }
    }

    const currentChatId = activeThreadIdRef.current;
    const isChatOpened = chatId === currentChatId;
    const isFocused = isWindowFocusedRef.current;
    if (isChatOpened && isFocused) {
      return;
    }

    const chatTitle =
      threadsRef.current.find((thread) => thread.id === chatId)?.title ||
      "Новое сообщение";
    const author = message.author || "Новое сообщение";
    const text =
      message.content?.trim() ||
      (message.attachments?.length ? "Вложение" : "Откройте чат");

    await showDesktopNotification({
      title: chatTitle,
      body: `${author}: ${text}`,
    });
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setPresenceNow(Date.now());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!isMobileViewport || !activeThreadId) {
      setMobileView("inbox");
    }
  }, [activeThreadId, isMobileViewport]);

  const handleCheckSpeed = async () => {
    if (isSpeedChecking) {
      return;
    }
    setIsSpeedChecking(true);
    try {
      const start = performance.now();
      const { sizeBytes } = await api.speedTest(200000);
      const durationMs = performance.now() - start;
      const mbps = (sizeBytes * 8) / (durationMs / 1000) / 1_000_000;
      setConnectionSpeedMbps(mbps);
    } catch (error) {
      setConnectionSpeedMbps(null);
    } finally {
      setIsSpeedChecking(false);
    }
  };

  const loadChats = async (nextActiveId) => {
    const data = await api.chats();
    setThreads(data.chats);

    setActiveThreadId((prev) => {
      if (data.chats.length === 0) {
        return null;
      }

      if (nextActiveId && data.chats.some((chat) => chat.id === nextActiveId)) {
        return nextActiveId;
      }

      if (prev && data.chats.some((chat) => chat.id === prev)) {
        return prev;
      }

      return data.chats[0].id;
    });

    socketRef.current?.emit("join_chats", {
      chatIds: data.chats.map((chat) => chat.id),
    });
  };

  useEffect(() => {
    if (bootstrapStartedRef.current) {
      return;
    }

    bootstrapStartedRef.current = true;

    const bootstrap = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const me = await api.me();
        setUser(me.user);
        setAccount(formatAccount(me.user));
        setIsAuth(true);
        await loadChats();
      } catch (error) {
        localStorage.removeItem("token");
        setIsAuth(false);
      } finally {
        setIsLoading(false);
      }
    };

    bootstrap();
  }, []);

  useEffect(() => {
    if (!isAuth) {
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      return;
    }

    const socket = io(SOCKET_URL, { auth: { token } });
    socketRef.current = socket;

    socket.on("message:new", ({ chatId, message }) => {
      const currentUser = userRef.current;
      const isSelf = message.user_id === currentUser?.id;
      const enriched = {
        ...message,
        isSelf,
        readByCount: message.readByCount ?? 0,
        isRead: message.isRead ?? isSelf,
      };

      setThreads((prev) =>
        prev.map((chat) =>
          chat.id === chatId
            ? { ...chat, preview: message.content, time: message.time }
            : chat
        )
      );

      if (chatId === activeThreadIdRef.current) {
        setMessages((prev) => {
          if (!isSelf) {
            return [...prev, enriched];
          }

          const pendingIndex = prev.findIndex(
            (item) => item.pending && item.content === message.content
          );
          if (pendingIndex === -1) {
            return [...prev, enriched];
          }

          const next = [...prev];
          next[pendingIndex] = enriched;
          return next;
        });
        if (!isSelf) {
          socket.emit("read_messages", { chatId });
        }
      }

      if (!isSelf) {
        notifyAboutMessage(chatId, message).catch(() => {});
      }
    });

    socket.on("message:read", ({ chatId, userId, messageIds }) => {
      if (chatId !== activeThreadIdRef.current) {
        return;
      }

      setMessages((prev) =>
        prev.map((message) => {
          if (!messageIds.includes(message.id)) {
            return message;
          }

          if (userId === userRef.current?.id) {
            return { ...message, isRead: true };
          }

          if (message.user_id === userRef.current?.id) {
            return { ...message, readByCount: (message.readByCount || 0) + 1 };
          }

          return message;
        })
      );
    });

    socket.on("message:updated", ({ chatId, message }) => {
      setMessages((prev) =>
        prev.map((item) =>
          item.id === message.id
            ? {
                ...item,
                content: message.content,
                edited_at: message.edited_at,
              }
            : item
        )
      );

      setThreads((prev) =>
        prev.map((chat) =>
          chat.id === chatId ? { ...chat, preview: message.content } : chat
        )
      );
    });

    socket.on("message:deleted", ({ chatId, messageId }) => {
      setMessages((prev) => prev.filter((item) => item.id !== messageId));
      setThreads((prev) =>
        prev.map((chat) =>
          chat.id === chatId ? { ...chat } : chat
        )
      );
    });

    socket.on("typing", ({ chatId, name, isTyping }) => {
      setTypingByChat((prev) => {
        const current = new Set(prev[chatId] || []);
        if (isTyping) {
          current.add(name);
        } else {
          current.delete(name);
        }
        return { ...prev, [chatId]: Array.from(current) };
      });
    });

    socket.on("chat:added", ({ chat }) => {
      setThreads((prev) => {
        if (prev.find((item) => item.id === chat.id)) {
          return prev;
        }
        return [chat, ...prev];
      });
      socket.emit("join_chats", { chatIds: [chat.id] });
    });

    socket.on("chat:updated", ({ chatId, preview, time }) => {
      setThreads((prev) =>
        prev.map((chat) =>
          chat.id === chatId ? { ...chat, preview, time } : chat
        )
      );
    });

    socket.on("presence:update", (payload) => {
      if (!payload?.userId) {
        return;
      }
      setPresenceByUser((prev) => ({
        ...prev,
        [payload.userId]: payload,
      }));
    });

    const sendPing = () => {
      socket.emit("presence:ping");
    };

    const handleActivity = () => {
      if (!notificationPermissionRequestedRef.current) {
        notificationPermissionRequestedRef.current = true;
        primeNotifications().catch(() => {});
      }
      sendPing();
    };

    sendPing();
    const pingInterval = setInterval(sendPing, 30000);
    window.addEventListener("focus", handleActivity);
    window.addEventListener("pointerdown", handleActivity);
    window.addEventListener("keydown", handleActivity);

    return () => {
      clearInterval(pingInterval);
      window.removeEventListener("focus", handleActivity);
      window.removeEventListener("pointerdown", handleActivity);
      window.removeEventListener("keydown", handleActivity);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [isAuth]);

  useEffect(() => {
    const fetchMessages = async () => {
      if (!activeThreadId || !isAuth) {
        setMessages([]);
        return;
      }

      setIsChatLoading(true);
      try {
        const data = await api.messages(activeThreadId);
        const currentUser = userRef.current;
        const mapped = data.messages.map((message) => ({
          ...message,
          isSelf: message.user_id === currentUser?.id,
        }));
        setMessages(mapped);
        socketRef.current?.emit("read_messages", { chatId: activeThreadId });
      } catch (error) {
        setMessages([]);
      } finally {
        setIsChatLoading(false);
      }
    };

    fetchMessages();
  }, [activeThreadId, isAuth]);

  useEffect(() => {
    if (!isAuth || threads.length === 0) {
      return;
    }
    const userIds = Array.from(
      new Set(
        threads
          .filter((thread) => thread.is_direct && thread.direct_user_id)
          .map((thread) => thread.direct_user_id)
          .filter((id) => id && id !== user?.id)
      )
    );

    if (userIds.length === 0) {
      return;
    }

    api
      .presence(userIds)
      .then((data) => {
        if (!data?.presence) {
          return;
        }
        setPresenceByUser((prev) => {
          const next = { ...prev };
          data.presence.forEach((item) => {
            if (item?.userId) {
              next[item.userId] = item;
            }
          });
          return next;
        });
      })
      .catch(() => {});
  }, [threads, isAuth, user?.id]);

  const handleAuthSubmit = async (event) => {
    event.preventDefault();
    setAuthError("");

    try {
      let data;
      if (authMode === "login") {
        if (!loginValue || !passwordValue) {
          setAuthError("Введите логин и пароль.");
          return;
        }

        data = await api.login({ login: loginValue, password: passwordValue });
      } else {
        if (!emailValue || !loginValue || !passwordValue || !firstNameValue) {
          setAuthError("Заполните обязательные поля.");
          return;
        }

        if (passwordValue !== confirmPasswordValue) {
          setAuthError("Пароли не совпадают.");
          return;
        }

        data = await api.register({
          email: emailValue,
          login: loginValue,
          password: passwordValue,
          firstName: firstNameValue,
          lastName: lastNameValue,
        });
      }

      localStorage.setItem("token", data.token);
      setUser(data.user);
      setAccount(formatAccount(data.user));
      setIsAuth(true);
      await loadChats();
    } catch (error) {
      setAuthError(error.message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setIsAuth(false);
    setAccount(null);
    setUser(null);
    setThreads([]);
    setMessages([]);
    setActiveThreadId(null);
    setIsAccountOpen(false);
    setTypingByChat({});
    setPresenceByUser({});
    setLoginValue("");
    setPasswordValue("");
    setConfirmPasswordValue("");
    setEmailValue("");
    setFirstNameValue("");
    setLastNameValue("");
    setMobileView("inbox");
  };

  const handleSelectThread = (threadId) => {
    setActiveThreadId(threadId);
    if (isMobileViewport) {
      setMobileView("chat");
    }
  };

  const handleProfileUpdate = async (payload) => {
    const data = await api.updateProfile(payload);
    setUser(data.user);
    setAccount(formatAccount(data.user));
  };

  const handleOpenSettings = () => {
    setIsAccountOpen(true);
  };

  const handleAddMember = () => {
    setIsAddMemberOpen(true);
  };

  const handleCreateChat = async (title) => {
    try {
      const result = await api.createChat(title);
      await loadChats(result.chat?.id);
      if (result.chat?.id) {
        setActiveThreadId(result.chat.id);
        if (isMobileViewport) {
          setMobileView("chat");
        }
      }
    } catch (error) {
      // ignore
    }
  };

  const handleOpenDirect = () => {
    setIsDirectOpen(true);
  };

  const handleSendMessage = async (content, replyTo, attachments = []) => {
    if (!activeThreadId) {
      return;
    }

    const now = new Date();
    const previewText = content || (attachments.length > 0 ? "Вложение" : "");
    const currentUser = userRef.current;
    const optimistic = {
      id: `temp-${now.getTime()}`,
      content,
      reply: replyTo
        ? messages.find((item) => item.id === replyTo) ?? null
        : null,
      attachments,
      time: formatTime(now),
      edited_at: null,
      author:
        account?.name ||
        (currentUser
          ? `${currentUser.first_name}${currentUser.last_name ? ` ${currentUser.last_name}` : ""}`
          : currentUser?.nickname || "Вы"),
      role: "вы",
      user_id: currentUser?.id,
      isSelf: true,
      readByCount: 0,
      isRead: true,
      pending: true,
    };

    setMessages((prev) => [...prev, optimistic]);
    setThreads((prev) =>
      prev.map((chat) =>
        chat.id === activeThreadId
          ? { ...chat, preview: previewText, time: optimistic.time }
          : chat
      )
    );

    try {
      await api.sendMessage(activeThreadId, content, replyTo, attachments);
    } catch (error) {
      setMessages((prev) => {
        const next = prev.filter((item) => item.id !== optimistic.id);
        if (activeThreadId) {
          const lastMessage = next[next.length - 1];
          setThreads((threadsPrev) =>
            threadsPrev.map((chat) =>
              chat.id === activeThreadId
                ? {
                    ...chat,
                    preview: lastMessage?.content || "",
                    time: lastMessage?.time || "",
                  }
                : chat
            )
          );
        }
        return next;
      });
    }
  };

  const handleTyping = (isTyping) => {
    if (!activeThreadId) {
      return;
    }
    socketRef.current?.emit("typing", { chatId: activeThreadId, isTyping });
  };

  const handleUploadFiles = async (files) => {
    if (!files || files.length === 0) {
      return [];
    }
    return api.uploadFiles(files);
  };

  const handleEditMessage = async (messageId, content) => {
    if (!messageId) {
      return;
    }
    const now = new Date();
    setMessages((prev) => {
      const next = prev.map((message) =>
        message.id === messageId
          ? { ...message, content, edited_at: now.toISOString() }
          : message
      );
      const lastMessage = next[next.length - 1];
      if (activeThreadId && lastMessage?.id === messageId) {
        setThreads((threadsPrev) =>
          threadsPrev.map((chat) =>
            chat.id === activeThreadId
              ? { ...chat, preview: content, time: lastMessage.time }
              : chat
          )
        );
      }
      return next;
    });
    try {
      await api.updateMessage(messageId, content);
    } catch (error) {
      // ignore
    }
  };

  const handleDeleteMessage = async (messageId) => {
    if (!messageId) {
      return;
    }
    setMessages((prev) => {
      const nextMessages = prev.filter((item) => item.id !== messageId);
      if (activeThreadId) {
        const lastMessage = nextMessages[nextMessages.length - 1];
        setThreads((threadsPrev) =>
          threadsPrev.map((chat) =>
            chat.id === activeThreadId
              ? {
                  ...chat,
                  preview: lastMessage?.content || "",
                  time: lastMessage?.time || "",
                }
              : chat
          )
        );
      }
      return nextMessages;
    });
    try {
      await api.deleteMessage(messageId);
    } catch (error) {
      // ignore
    }
  };

  const handleDeleteChat = async (chatId) => {
    const targetChatId = chatId ?? activeThreadId;
    const targetChat =
      threads.find((thread) => thread.id === targetChatId) ?? activeThread;

    if (!targetChatId) {
      return;
    }

    if (targetChat?.is_direct && !window.confirm("Удалить чат?")) {
      return;
    }

    try {
      console.info("[chat:leave] request", {
        targetChatId,
        activeThreadId,
        isDirect: targetChat?.is_direct ?? null,
        title: targetChat?.title ?? null,
      });
      await api.deleteChat(targetChatId);
      console.info("[chat:leave] success", {
        targetChatId,
        activeThreadId,
      });
      await loadChats(targetChatId === activeThreadId ? null : activeThreadId);

      if (targetChatId === activeThreadId) {
        setMessages([]);
        if (isMobileViewport) {
          setMobileView("inbox");
        }
      }
    } catch (error) {
      console.error("[chat:leave] failed", {
        targetChatId,
        activeThreadId,
        status: error?.status,
        path: error?.path,
        payload: error?.payload,
        message: error?.message,
      });
      window.alert(error.message || "Не удалось удалить чат");
    }
  };

  if (isLoading) {
    return (
      <div className="auth">
        <div className="auth-card">
          <h1>Загрузка...</h1>
        </div>
      </div>
    );
  }

  if (!isAuth) {
    return (
      <div className="auth">
        <div className="auth-card">
          <h1>{authMode === "login" ? "Вход" : "Регистрация"}</h1>
          <p className="auth-sub">
            {authMode === "login"
              ? "Введите логин и пароль"
              : "Создайте новый аккаунт"}
          </p>
          <form className="auth-form" onSubmit={handleAuthSubmit}>
            {authMode === "register" && (
              <>
                <label>
                  Почта
                  <input
                    type="email"
                    value={emailValue}
                    onChange={(event) => setEmailValue(event.target.value)}
                    placeholder="name@example.com"
                  />
                </label>
                <label>
                  Имя
                  <input
                    type="text"
                    value={firstNameValue}
                    onChange={(event) => setFirstNameValue(event.target.value)}
                    placeholder="Имя"
                  />
                </label>
                <label>
                  Фамилия (необязательно)
                  <input
                    type="text"
                    value={lastNameValue}
                    onChange={(event) => setLastNameValue(event.target.value)}
                    placeholder="Фамилия"
                  />
                </label>
              </>
            )}
            <label>
              Логин
              <input
                type="text"
                value={loginValue}
                onChange={(event) => setLoginValue(event.target.value)}
                placeholder="Например: 1"
              />
            </label>
            <label>
              Пароль
              <input
                type="password"
                value={passwordValue}
                onChange={(event) => setPasswordValue(event.target.value)}
                placeholder="Например: 1"
              />
            </label>
            {authMode === "register" && (
              <label>
                Подтвердите пароль
                <input
                  type="password"
                  value={confirmPasswordValue}
                  onChange={(event) =>
                    setConfirmPasswordValue(event.target.value)
                  }
                  placeholder="Повторите пароль"
                />
              </label>
            )}
            {authError && <div className="auth-error">{authError}</div>}
            <button className="primary" type="submit">
              {authMode === "login" ? "Войти" : "Создать аккаунт"}
            </button>
          </form>
          <button
            className="ghost auth-switch"
            type="button"
            onClick={() => {
              setAuthMode(authMode === "login" ? "register" : "login");
              setAuthError("");
              setConfirmPasswordValue("");
            }}
          >
            {authMode === "login"
              ? "Нет аккаунта? Регистрация"
              : "Уже есть аккаунт? Войти"}
          </button>
        </div>
      </div>
    );
  }

  const chatPanelProps = {
    messages,
    thread: activeThread,
    isLoading: isChatLoading,
    presenceMeta: activePresenceMeta,
    onSend: handleSendMessage,
    onUpload: handleUploadFiles,
    onEdit: handleEditMessage,
    onDelete: handleDeleteMessage,
    onAddMember: handleAddMember,
    onTyping: handleTyping,
    typingUsers: activeTyping,
    currentUserId: user?.id,
    onDeleteChat: handleDeleteChat,
  };

  const conversationListProps = {
    threads,
    activeId: activeThread?.id,
    presenceByUser,
    presenceNow,
    getPresenceMeta,
    onSelect: handleSelectThread,
    onCreateChat: handleCreateChat,
    onCreateDirect: handleOpenDirect,
    onDeleteChat: handleDeleteChat,
    isMobile: isMobileViewport,
  };

  return (
    <div className={`app ${isMobileViewport ? "app-ios" : ""}`}>
      {!isMobileViewport && <Backdrop />}

      <main
        className={`shell ${isMobileViewport ? "shell-mobile shell-ios" : ""}`}
      >
        {isMobileViewport ? (
          mobileView === "chat" && activeThread ? (
            <IOSChatPanel
              {...chatPanelProps}
              onBack={() => setMobileView("inbox")}
            />
          ) : (
            <IOSHome
              account={account}
              quickActions={quickActions}
              threads={threads}
              activeId={activeThread?.id}
              presenceByUser={presenceByUser}
              presenceNow={presenceNow}
              getPresenceMeta={getPresenceMeta}
              connectionSpeedMbps={connectionSpeedMbps}
              isSpeedChecking={isSpeedChecking}
              onCheckSpeed={handleCheckSpeed}
              onOpenSettings={handleOpenSettings}
              onSelect={handleSelectThread}
              onCreateChat={handleCreateChat}
              onCreateDirect={handleOpenDirect}
              onDeleteChat={handleDeleteChat}
            />
          )
        ) : (
          <>
            <NavigationRail
              quickActions={quickActions}
              account={account}
              connectionSpeedMbps={connectionSpeedMbps}
              isSpeedChecking={isSpeedChecking}
              onCheckSpeed={handleCheckSpeed}
              onOpenSettings={handleOpenSettings}
            />
            <ConversationList {...conversationListProps} isMobile={false} />
            <ChatPanel {...chatPanelProps} />
          </>
        )}
      </main>
      <AccountModal
        account={account}
        user={user}
        isOpen={isAccountOpen}
        onClose={() => setIsAccountOpen(false)}
        onLogout={handleLogout}
        onUpdateProfile={handleProfileUpdate}
      />
      <UserModal
        title="Личный чат"
        placeholder="Никнейм пользователя"
        isOpen={isDirectOpen}
        onClose={() => setIsDirectOpen(false)}
        onSubmit={async (login) => {
          const result = await api.createDirectChat(login);
          await loadChats(result.chat?.id);
          if (result.chat?.id) {
            setActiveThreadId(result.chat.id);
            if (isMobileViewport) {
              setMobileView("chat");
            }
          }
        }}
      />
      <UserModal
        title="Добавить участника"
        placeholder="Никнейм пользователя"
        isOpen={isAddMemberOpen}
        onClose={() => setIsAddMemberOpen(false)}
        onSubmit={async (login) => {
          if (!activeThreadId) {
            return;
          }
          await api.addMember(activeThreadId, login);
          await loadChats(activeThreadId);
        }}
      />
    </div>
  );
}

export default App;
