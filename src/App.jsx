import "./App.css";
import { useEffect, useState } from "react";
import Backdrop from "./components/Backdrop";
import NavigationRail from "./components/NavigationRail";
import ConversationList from "./components/ConversationList";
import ChatPanel from "./components/ChatPanel";
import AccountModal from "./components/AccountModal";
import { api } from "./api/client";
import { quickActions } from "./data/mockData";

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
  const [threads, setThreads] = useState([]);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isChatLoading, setIsChatLoading] = useState(false);

  const activeThread =
    threads.find((thread) => thread.id === activeThreadId) ?? null;

  const loadChats = async (nextActiveId) => {
    const data = await api.chats();
    setThreads(data.chats);

    if (data.chats.length > 0) {
      setActiveThreadId((prev) => prev ?? nextActiveId ?? data.chats[0].id);
    } else {
      setActiveThreadId(null);
    }
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
    const fetchMessages = async () => {
      if (!activeThreadId || !isAuth) {
        setMessages([]);
        return;
      }

      setIsChatLoading(true);
      try {
        const data = await api.messages(activeThreadId);
        setMessages(data.messages);
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
    setThreads([]);
    setMessages([]);
    setActiveThreadId(null);
    setIsAccountOpen(false);
    setLoginValue("");
    setPasswordValue("");
    setConfirmPasswordValue("");
    setEmailValue("");
    setFirstNameValue("");
    setLastNameValue("");
  };

  const handleSendMessage = async (content) => {
    if (!activeThreadId) {
      return;
    }

    try {
      await api.sendMessage(activeThreadId, content);
      const data = await api.messages(activeThreadId);
      setMessages(data.messages);
      await loadChats(activeThreadId);
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
              />
            ) : (
              <ChatPanel
                messages={messages}
                thread={activeThread}
                isMobile
                isLoading={isChatLoading}
                onBack={() => setShowChat(false)}
                onSend={handleSendMessage}
              />
            )}
          </>
        ) : (
          <>
            <NavigationRail
              quickActions={quickActions}
              account={account}
              onOpenSettings={() => setIsAccountOpen(true)}
            />
            <ConversationList
              threads={threads}
              activeId={activeThread?.id}
              onSelect={setActiveThreadId}
            />
            <ChatPanel
              messages={messages}
              thread={activeThread}
              isLoading={isChatLoading}
              onSend={handleSendMessage}
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
    </div>
  );
}

export default App;
