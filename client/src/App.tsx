import { useState, useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppContext } from "@/lib/appContext";
import type { Language, Theme, AppContextType, User } from "@/lib/appContext";
import { SpaceBackground } from "@/components/SpaceBackground";
import Hub from "@/pages/Hub";
import Chat from "@/pages/Chat";
import NotFound from "@/pages/not-found";

// Global Snow Effect Component
function SnowEffect({ isActive }: { isActive: boolean }) {
  const [snowflakes, setSnowflakes] = useState<Array<{id: number; left: number; delay: number; duration: number; size: number; opacity: number; animation: number}>>([]);

  useEffect(() => {
    if (!isActive) {
      setSnowflakes([]);
      return;
    }

    const count = 150;
    const flakes = [];
    for (let i = 0; i < count; i++) {
      flakes.push({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 5,
        duration: Math.random() * 3 + 3,
        size: Math.random() * 5 + 2,
        opacity: Math.random() * 0.6 + 0.4,
        animation: Math.floor(Math.random() * 4),
      });
    }
    setSnowflakes(flakes);
  }, [isActive]);

  if (!isActive) return null;

  const animations = ['snowWave1', 'snowWave2', 'snowWave3', 'snowWave4'];

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      <style>{`
        @keyframes snowWave1 {
          0% { transform: translateY(-10px) translateX(0) rotate(0deg); }
          25% { transform: translateY(25vh) translateX(30px) rotate(90deg); }
          50% { transform: translateY(50vh) translateX(-20px) rotate(180deg); }
          75% { transform: translateY(75vh) translateX(25px) rotate(270deg); }
          100% { transform: translateY(100vh) translateX(0) rotate(360deg); }
        }
        @keyframes snowWave2 {
          0% { transform: translateY(-10px) translateX(0) rotate(0deg); }
          25% { transform: translateY(25vh) translateX(-35px) rotate(-90deg); }
          50% { transform: translateY(50vh) translateX(25px) rotate(-180deg); }
          75% { transform: translateY(75vh) translateX(-30px) rotate(-270deg); }
          100% { transform: translateY(100vh) translateX(5px) rotate(-360deg); }
        }
        @keyframes snowWave3 {
          0% { transform: translateY(-10px) translateX(0) scale(1); }
          20% { transform: translateY(20vh) translateX(40px) scale(1.1); }
          40% { transform: translateY(40vh) translateX(-30px) scale(0.9); }
          60% { transform: translateY(60vh) translateX(35px) scale(1.1); }
          80% { transform: translateY(80vh) translateX(-25px) scale(0.95); }
          100% { transform: translateY(100vh) translateX(10px) scale(1); }
        }
        @keyframes snowWave4 {
          0% { transform: translateY(-10px) translateX(0); }
          15% { transform: translateY(15vh) translateX(-40px); }
          30% { transform: translateY(30vh) translateX(30px); }
          45% { transform: translateY(45vh) translateX(-35px); }
          60% { transform: translateY(60vh) translateX(40px); }
          75% { transform: translateY(75vh) translateX(-30px); }
          90% { transform: translateY(90vh) translateX(25px); }
          100% { transform: translateY(100vh) translateX(-10px); }
        }
      `}</style>
      {snowflakes.map((flake) => (
        <div
          key={flake.id}
          style={{
            position: 'absolute',
            left: `${flake.left}%`,
            top: '-10px',
            width: `${flake.size}px`,
            height: `${flake.size}px`,
            backgroundColor: `rgba(255, 255, 255, ${flake.opacity})`,
            borderRadius: '50%',
            animation: `${animations[flake.animation]} ${flake.duration}s ease-in-out ${flake.delay}s infinite`,
            boxShadow: '0 0 4px rgba(255, 255, 255, 0.6)',
          }}
        />
      ))}
    </div>
  );
}

function Router() {
  const [location] = useLocation();
  
  // Use full URL path + query parameters for the key
  // This ensures Chat component remounts when query params change
  const chatKey = `${location}${typeof window !== "undefined" ? window.location.search : ""}`;
  
  return (
    <Switch>
      <Route path="/" component={Hub} />
      <Route path="/chat">
        {() => <Chat key={chatKey} />}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  return (
    <div className="relative min-h-screen">
      {/* Animated Space Background */}
      <SpaceBackground />

      {/* Content Layer */}
      <div className="relative z-10">
        <Router />
      </div>
    </div>
  );
}

function generateGuestId(): string {
  return `guest-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function App() {
  const [language, setLanguage] = useState<Language>("ar");
  const [theme, setTheme] = useState<Theme>("dark");
  const [user, setUser] = useState<User | null>({ id: "anonymous", name: "مستخدم", email: "" });
  const [token, setToken] = useState<string | null>("anonymous-token");
  const [guestId, setGuestId] = useState<string>("");
  const [isSnowing, setIsSnowing] = useState<boolean>(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as Theme | null;
    const savedLang = localStorage.getItem("language") as Language | null;
    const savedToken = localStorage.getItem("authToken");
    let savedGuestId = localStorage.getItem("guestId");

    if (savedTheme) setTheme(savedTheme);
    if (savedLang) setLanguage(savedLang);
    
    // Restore or create guestId from localStorage
    if (!savedGuestId) {
      savedGuestId = generateGuestId();
      localStorage.setItem("guestId", savedGuestId);
      console.log("[App] Created new guestId:", savedGuestId);
    } else {
      console.log("[App] Restored guestId from localStorage:", savedGuestId);
    }
    setGuestId(savedGuestId);
    
    // Restore token from localStorage if available
    if (savedToken) {
      console.log("[App] Restoring token from localStorage");
      setToken(savedToken);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("theme", theme);
    localStorage.setItem("language", language);
    
    if (theme === "light") {
      document.documentElement.classList.add("light");
    } else {
      document.documentElement.classList.remove("light");
    }

    document.documentElement.setAttribute("lang", language);
  }, [theme, language]);

  const contextValue: AppContextType = {
    language,
    theme,
    user: user ? { ...user, id: guestId || user.id } : null,
    token,
    setLanguage,
    setTheme,
    setUser,
    setToken,
    showAuthModal: false,
    setShowAuthModal: () => {},
    isLogin: false,
    setIsLogin: () => {},
    isSnowing,
    setIsSnowing,
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppContext.Provider value={contextValue}>
          <Toaster />
          <AppContent />
          <SnowEffect isActive={isSnowing} />
        </AppContext.Provider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
