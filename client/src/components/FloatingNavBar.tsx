import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { Home, Menu, X, ChevronUp, ChevronDown, GripVertical } from "lucide-react";
import { SiWhatsapp } from "react-icons/si";
import { useAppContext } from "@/lib/appContext";
import { t } from "@/lib/translations";

interface FloatingNavBarProps {
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
  isOnChatPage?: boolean;
}

interface Position {
  x: number;
  y: number;
}

const STORAGE_KEY = "floatingNavPosition";
const BUTTON_SIZE = 48;
const PADDING = 12;

export function FloatingNavBar({ isSidebarOpen = false, onToggleSidebar, isOnChatPage = false }: FloatingNavBarProps) {
  const { language } = useAppContext();
  const [location, navigate] = useLocation();
  const [isMobile, setIsMobile] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [hasDragged, setHasDragged] = useState(false);
  const [position, setPosition] = useState<Position>({ x: PADDING, y: window.innerHeight * 0.4 });
  
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ x: number; y: number; posX: number; posY: number } | null>(null);
  const dragThresholdRef = useRef(false);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      
      if (mobile) {
        const savedPosition = sessionStorage.getItem(STORAGE_KEY);
        if (savedPosition) {
          try {
            const parsed = JSON.parse(savedPosition);
            const clampedPosition = clampPosition(parsed.x, parsed.y);
            setPosition(clampedPosition);
          } catch {
            setPosition({ x: PADDING, y: window.innerHeight * 0.4 });
          }
        }
      }
    };
    
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const clampPosition = useCallback((x: number, y: number): Position => {
    const maxX = window.innerWidth - BUTTON_SIZE - PADDING;
    const maxY = window.innerHeight - BUTTON_SIZE - PADDING;
    
    return {
      x: Math.max(PADDING, Math.min(x, maxX)),
      y: Math.max(PADDING, Math.min(y, maxY))
    };
  }, []);

  const savePosition = useCallback((pos: Position) => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(pos));
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!isMobile) return;
    
    const touch = e.touches[0];
    dragStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      posX: position.x,
      posY: position.y
    };
    dragThresholdRef.current = false;
    setHasDragged(false);
  }, [isMobile, position]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!dragStartRef.current || !isMobile) return;
    
    const touch = e.touches[0];
    const deltaX = touch.clientX - dragStartRef.current.x;
    const deltaY = touch.clientY - dragStartRef.current.y;
    
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    if (distance > 5) {
      dragThresholdRef.current = true;
      setIsDragging(true);
      setHasDragged(true);
    }
    
    if (dragThresholdRef.current) {
      e.preventDefault();
      
      const newX = dragStartRef.current.posX + deltaX;
      const newY = dragStartRef.current.posY + deltaY;
      const clampedPos = clampPosition(newX, newY);
      setPosition(clampedPos);
    }
  }, [isMobile, clampPosition]);

  const handleTouchEnd = useCallback(() => {
    if (dragThresholdRef.current) {
      savePosition(position);
    }
    
    dragStartRef.current = null;
    setIsDragging(false);
    
    setTimeout(() => {
      setHasDragged(false);
    }, 100);
  }, [position, savePosition]);

  const handleNavigate = (route: string) => {
    if (hasDragged) return;
    console.log("[FloatingNavBar] Navigating to:", route);
    navigate(route);
    if (isMobile) setIsExpanded(false);
  };

  const toggleExpand = () => {
    if (hasDragged) return;
    setIsExpanded(!isExpanded);
  };

  const handleButtonClick = (callback: () => void) => {
    if (hasDragged) return;
    callback();
  };

  if (isMobile) {
    return (
      <div 
        ref={containerRef}
        className="fixed flex flex-col gap-2"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          zIndex: 99999,
          pointerEvents: "auto",
          touchAction: "none",
          transition: isDragging ? "none" : "transform 0.1s ease-out"
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        data-testid="floating-nav-container"
      >
        {isExpanded && (
          <div 
            className="flex flex-col gap-2"
            style={{
              animation: "slideUp 0.25s ease-out forwards"
            }}
          >
            <button
              type="button"
              onClick={() => handleButtonClick(() => handleNavigate("/"))}
              className="p-3 rounded-full backdrop-blur-lg cursor-pointer"
              style={{
                backgroundColor: location === "/" ? "rgba(0, 0, 0, 0.8)" : "rgba(0, 0, 0, 0.6)",
                border: location === "/" ? "2px solid rgba(0, 240, 255, 1)" : "1px solid rgba(0, 240, 255, 0.4)",
                boxShadow: location === "/" ? "0 0 12px rgba(0, 240, 255, 0.6)" : "0 0 8px rgba(0, 240, 255, 0.2)",
                pointerEvents: "auto"
              }}
              title={t("nav.home", language)}
              data-testid="button-floating-nav-home"
            >
              <Home className="w-5 h-5 text-cyan-400" />
            </button>

            <a
              href="https://wa.me/qr/P6WIWVS7UAU5P1"
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => { if (hasDragged) e.preventDefault(); }}
              className="p-3 rounded-full backdrop-blur-lg cursor-pointer inline-flex items-center justify-center"
              style={{
                backgroundColor: "rgba(0, 0, 0, 0.6)",
                border: "1px solid rgba(31, 193, 120, 0.4)",
                boxShadow: "0 0 8px rgba(31, 193, 120, 0.2)",
                pointerEvents: "auto"
              }}
              title="Contact via WhatsApp"
              data-testid="button-floating-nav-whatsapp"
            >
              <SiWhatsapp className="w-5 h-5" style={{ color: "#1fC158" }} />
            </a>

            {isOnChatPage && onToggleSidebar && (
              <button
                type="button"
                onClick={() => handleButtonClick(() => {
                  onToggleSidebar();
                  setIsExpanded(false);
                })}
                className="p-3 rounded-full backdrop-blur-lg cursor-pointer"
                style={{
                  backgroundColor: isSidebarOpen ? "rgba(0, 0, 0, 0.8)" : "rgba(0, 0, 0, 0.6)",
                  border: isSidebarOpen ? "2px solid rgba(255, 0, 110, 1)" : "1px solid rgba(255, 0, 110, 0.4)",
                  boxShadow: isSidebarOpen ? "0 0 12px rgba(255, 0, 110, 0.6)" : "0 0 8px rgba(255, 0, 110, 0.2)",
                  pointerEvents: "auto"
                }}
                title={isSidebarOpen ? "إخفاء القائمة" : "عرض القائمة"}
                data-testid="button-floating-nav-sidebar-toggle"
              >
                {isSidebarOpen ? (
                  <X className="w-5 h-5" style={{ color: "#FF006E" }} />
                ) : (
                  <Menu className="w-5 h-5" style={{ color: "#FF006E" }} />
                )}
              </button>
            )}
          </div>
        )}

        <div className="relative">
          <button
            type="button"
            onClick={toggleExpand}
            className="p-3 rounded-full backdrop-blur-lg cursor-pointer relative"
            style={{
              backgroundColor: isExpanded ? "rgba(0, 0, 0, 0.9)" : "rgba(0, 0, 0, 0.7)",
              border: isExpanded ? "2px solid rgba(180, 100, 255, 1)" : "2px solid rgba(180, 100, 255, 0.6)",
              boxShadow: isDragging 
                ? "0 0 20px rgba(180, 100, 255, 0.9), 0 4px 12px rgba(0, 0, 0, 0.4)" 
                : isExpanded 
                  ? "0 0 15px rgba(180, 100, 255, 0.7)" 
                  : "0 0 10px rgba(180, 100, 255, 0.4)",
              pointerEvents: "auto",
              transition: isDragging ? "box-shadow 0.1s ease" : "all 0.2s ease",
              transform: isDragging ? "scale(1.1)" : "scale(1)"
            }}
            title={isExpanded ? "إغلاق القائمة" : "فتح القائمة"}
            data-testid="button-floating-nav-toggle"
          >
            {isDragging ? (
              <GripVertical className="w-5 h-5" style={{ color: "#B466FF" }} />
            ) : isExpanded ? (
              <ChevronDown className="w-5 h-5" style={{ color: "#B466FF" }} />
            ) : (
              <ChevronUp className="w-5 h-5" style={{ color: "#B466FF" }} />
            )}
          </button>
          
          {!isExpanded && !isDragging && (
            <div 
              className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 text-xs opacity-50 pointer-events-none whitespace-nowrap"
              style={{ color: "#B466FF", fontSize: "8px" }}
            >
              اسحب للتحريك
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div 
      className="fixed flex gap-2 transition-all duration-300"
      style={{
        top: "50%",
        left: "20px",
        transform: "translateY(-50%)",
        flexDirection: "column",
        zIndex: 99999,
        pointerEvents: "auto"
      }}
    >
      <button
        type="button"
        onClick={() => handleNavigate("/")}
        className="p-3 rounded-full transition-all duration-200 backdrop-blur-lg hover:scale-110 active:scale-95 cursor-pointer"
        style={{
          backgroundColor: location === "/" ? "rgba(0, 0, 0, 0.7)" : "rgba(0, 0, 0, 0.5)",
          border: location === "/" ? "2px solid rgba(0, 240, 255, 1)" : "1px solid rgba(0, 240, 255, 0.3)",
          boxShadow: location === "/" ? "0 0 15px rgba(0, 240, 255, 0.8)" : "0 0 10px rgba(0, 240, 255, 0.2)",
          pointerEvents: "auto"
        }}
        title={t("nav.home", language)}
        data-testid="button-floating-nav-home"
      >
        <Home className="w-6 h-6 text-cyan-400" />
      </button>

      <a
        href="https://wa.me/qr/P6WIWVS7UAU5P1"
        target="_blank"
        rel="noopener noreferrer"
        className="p-3 rounded-full transition-all duration-200 backdrop-blur-lg hover:scale-110 active:scale-95 cursor-pointer inline-flex items-center justify-center"
        style={{
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          border: "1px solid rgba(31, 193, 120, 0.3)",
          boxShadow: "0 0 10px rgba(31, 193, 120, 0.2)",
          pointerEvents: "auto"
        }}
        title="Contact via WhatsApp"
        data-testid="button-floating-nav-whatsapp"
      >
        <SiWhatsapp className="w-6 h-6" style={{ color: "#1fC158" }} />
      </a>
    </div>
  );
}
