import "./App.css";
import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import Backdrop from "./components/Backdrop";
import NavigationRail from "./components/NavigationRail";
import ConversationList from "./components/ConversationList";
import ChatPanel from "./components/ChatPanel";
import AccountModal from "./components/AccountModal";
import UserModal from "./components/UserModal";
import { api } from "./api/client";
import { quickActions } from "./data/mockData";

const SOCKET_URL =
  import.meta.env.VITE_API_URL || "http://46.138.243.148:4000";

const formatAccount = (user) => ({
  name: `${user.first_name}${user.last_name ? ` ${user.last_name}` : ""}`,
  handle: `@${user.login}`,
  status: user.status || "Онлайн",
});

function App() {
  const [isMobile, setIsMobile] = useState(false);
  const [activeThreadId, setActiveThreadId] = useState(null);
  const [showChat, setShowChat] = useState(false);
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
  const socketRef = useRef(null);
  const activeThreadIdRef = useRef(null);
  const userRef = useRef(null);

  const activeThread =
    threads.find((thread) => thread.id === activeThreadId) ?? null;
  const activeTyping = activeThreadId ? typingByChat[activeThreadId] || [] : [];

  useEffect(() => {
    activeThreadIdRef.current = activeThreadId;
  }, [activeThreadId]);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

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

    if (data.chats.length > 0) {
      setActiveThreadId((prev) => prev ?? nextActiveId ?? data.chats[0].id);
    } else {
      setActiveThreadId(null);
    }

    socketRef.current?.emit("join_chats", {
      chatIds: data.chats.map((chat) => chat.id),
    });
  };

  useEffect(() => {
    const checkSize = () => {
      setIsMobile(window.innerWidth < 900);
    };

    checkSize();
    window.addEventListener("resize", checkSize);

    return () => {
      window.removeEventListener("resize", checkSize);
    };
  }, []);

  useEffect(() => {
    if (!isMobile) {
      setShowChat(true);
      return;
    }

    setShowChat(false);
  }, [isMobile]);

  useEffect(() => {
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
        setMessages((prev) => [...prev, enriched]);
        if (!isSelf) {
          socket.emit("read_messages", { chatId });
        }
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

    return () => {
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
    setLoginValue("");
    setPasswordValue("");
    setConfirmPasswordValue("");
    setEmailValue("");
    setFirstNameValue("");
    setLastNameValue("");
  };

  const handleSendMessage = async (content, replyTo) => {
    if (!activeThreadId) {
      return;
    }

    try {
      await api.sendMessage(activeThreadId, content, replyTo);
      const data = await api.messages(activeThreadId);
      setMessages(data.messages);
      await loadChats(activeThreadId);
    } catch (error) {
      // ignore
    }
  };

  const handleTyping = (isTyping) => {
    if (!activeThreadId) {
      return;
    }
    socketRef.current?.emit("typing", { chatId: activeThreadId, isTyping });
  };

  const handleEditMessage = async (messageId, content) => {
    if (!messageId) {
      return;
    }
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
    try {
      await api.deleteMessage(messageId);
      if (activeThreadId) {
        const data = await api.messages(activeThreadId);
        setMessages(data.messages);
        await loadChats(activeThreadId);
      }
    } catch (error) {
      // ignore
    }
  };

  const handleDeleteChat = async () => {
    if (!activeThreadId) {
      return;
    }

    if (!window.confirm("Удалить чат?")) {
      return;
    }

    try {
      await api.deleteChat(activeThreadId);
      await loadChats();
      setMessages([]);
      if (isMobile) {
        setShowChat(false);
      }
    } catch (error) {
      // ignore
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

  return (
    <div className={`app ${isMobile ? "app-mobile" : ""}`}>
      <Backdrop />

      <main className={`shell ${isMobile ? "shell-mobile" : ""}`}>
        {isMobile ? (
          <>
            {!showChat && (
              <header className="mobile-header">
                {account && (
                  <div className="mobile-account">
                    <button
                      className="account-pill"
                      type="button"
                      onClick={() => setIsAccountOpen(true)}
                    >
                      <span className="avatar">
                        {account.name
                          .split(" ")
                          .map((part) => part[0])
                          .join("")}
                      </span>
                      <span>
                        <span className="account-name">{account.name}</span>
                        <span className="account-handle">
                          {account.handle}
                        </span>
                      </span>
                    </button>
                    <span className="account-status">{account.status}</span>
                  </div>
                )}
                <div className="mobile-actions">
                  {quickActions.map((item, index) => (
                    <button
                      key={item}
                      className={`rail-button ${
                        index === 0 ? "active" : ""
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </header>
            )}
            {!showChat ? (
              <ConversationList
                threads={threads}
                activeId={activeThread?.id}
                onSelect={(id) => {
                  setActiveThreadId(id);
                  setShowChat(true);
                }}
                onCreateChat={async (title) => {
                  try {
                    const result = await api.createChat(title);
                    await loadChats(result.chat?.id);
                    setActiveThreadId(result.chat?.id ?? activeThreadId);
                  } catch (error) {
                    // ignore
                  }
                }}
                onCreateDirect={() => setIsDirectOpen(true)}
                onDeleteChat={handleDeleteChat}
              />
            ) : (
              <ChatPanel
                messages={messages}
                thread={activeThread}
                isMobile
                isLoading={isChatLoading}
                onBack={() => setShowChat(false)}
                onSend={handleSendMessage}
                onEdit={handleEditMessage}
                onDelete={handleDeleteMessage}
                onAddMember={() => setIsAddMemberOpen(true)}
                onTyping={handleTyping}
                typingUsers={activeTyping}
                currentUserId={user?.id}
                onDeleteChat={handleDeleteChat}
              />
            )}
          </>
        ) : (
          <>
            <NavigationRail
              quickActions={quickActions}
              account={account}
              connectionSpeedMbps={connectionSpeedMbps}
              isSpeedChecking={isSpeedChecking}
              onCheckSpeed={handleCheckSpeed}
              onOpenSettings={() => setIsAccountOpen(true)}
            />
            <ConversationList
              threads={threads}
              activeId={activeThread?.id}
              onSelect={setActiveThreadId}
              onCreateChat={async (title) => {
                try {
                  const result = await api.createChat(title);
                  await loadChats(result.chat?.id);
                  setActiveThreadId(result.chat?.id ?? activeThreadId);
                } catch (error) {
                  // ignore
                }
              }}
              onCreateDirect={() => setIsDirectOpen(true)}
              onDeleteChat={handleDeleteChat}
            />
            <ChatPanel
              messages={messages}
              thread={activeThread}
              isLoading={isChatLoading}
              onSend={handleSendMessage}
              onEdit={handleEditMessage}
              onDelete={handleDeleteMessage}
              onAddMember={() => setIsAddMemberOpen(true)}
              onTyping={handleTyping}
              typingUsers={activeTyping}
              currentUserId={user?.id}
              onDeleteChat={handleDeleteChat}
            />
          </>
        )}
      </main>
      <AccountModal
        account={account}
        isOpen={isAccountOpen}
        onClose={() => setIsAccountOpen(false)}
        onLogout={handleLogout}
      />
      <UserModal
        title="Личный чат"
        placeholder="Логин пользователя"
        isOpen={isDirectOpen}
        onClose={() => setIsDirectOpen(false)}
        onSubmit={async (login) => {
          const result = await api.createDirectChat(login);
          await loadChats(result.chat?.id);
          setActiveThreadId(result.chat?.id ?? activeThreadId);
          setShowChat(true);
        }}
      />
      <UserModal
        title="Добавить участника"
        placeholder="Логин пользователя"
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
