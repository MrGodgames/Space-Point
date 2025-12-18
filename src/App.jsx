import "./App.css";
import { useEffect, useState } from "react";
import Backdrop from "./components/Backdrop";
import NavigationRail from "./components/NavigationRail";
import ConversationList from "./components/ConversationList";
import ChatPanel from "./components/ChatPanel";
import AccountModal from "./components/AccountModal";
import { threads, messages, quickActions, account } from "./data/mockData";

function App() {
  const [isMobile, setIsMobile] = useState(false);
  const [activeThreadId, setActiveThreadId] = useState(threads[0]?.id);
  const [showChat, setShowChat] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);

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

  const activeThread =
    threads.find((thread) => thread.id === activeThreadId) ?? threads[0];

  return (
    <div className={`app ${isMobile ? "app-mobile" : ""}`}>
      <Backdrop />

      <main className={`shell ${isMobile ? "shell-mobile" : ""}`}>
        {isMobile ? (
          <>
            {!showChat && (
              <header className="mobile-header">
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
                      <span className="account-handle">{account.handle}</span>
                    </span>
                  </button>
                  <span className="account-status">{account.status}</span>
                </div>
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
                onBack={() => setShowChat(false)}
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
            <ChatPanel messages={messages} thread={activeThread} />
          </>
        )}
      </main>
      <AccountModal
        account={account}
        isOpen={isAccountOpen}
        onClose={() => setIsAccountOpen(false)}
      />
    </div>
  );
}

export default App;
