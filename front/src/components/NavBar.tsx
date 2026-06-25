import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { UserCircle, Menu, X, LogOut, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUser } from "@/contexts/UserContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import NotificationBell from "@/components/NotificationBell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { resolveAvatarUrl } from "@/lib/resolveAvatarUrl";

const navLinkClass = (active: boolean) =>
  cn(
    "relative group text-[15px] font-medium transition-colors duration-300",
    active ? "text-white" : "text-white/50 hover:text-[#a78bfa]"
  );

function clearBodyScrollLock() {
  document.body.style.removeProperty("pointer-events");
  document.body.style.removeProperty("overflow");
  document.body.style.removeProperty("padding-right");
  document.body.removeAttribute("data-scroll-locked");
}

const NavBar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useUser();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
    clearBodyScrollLock();
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const isNavActive = (to: string) => {
    const path = location.pathname;
    if (to === "/admin") return path === "/admin" || path.startsWith("/admin/");
    if (to === "/") return path === "/";
    return path === to || path.startsWith(`${to}/`);
  };

  const NavLink = ({ to, children }: { to: string; children: React.ReactNode }) => {
    const active = isNavActive(to);
    return (
      <Link to={to} className={cn(navLinkClass(active), "relative px-1 py-2")}>
        {children}
        <span
          className={cn(
            "absolute -bottom-1 left-0 h-[2px] bg-[#8B5CF6] transition-all duration-300 pointer-events-none",
            active ? "w-full" : "w-0 group-hover:w-full"
          )}
        />
      </Link>
    );
  };

  const headerBtn =
    "h-10 w-10 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-all duration-300";

  const renderAuthButtons = () => {
    if (user) {
      return (
        <div className="flex items-center gap-3">
          <NotificationBell />
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className={headerBtn}>
                <Avatar className="h-9 w-9 ring-1 ring-white/15">
                  <AvatarImage
                    src={resolveAvatarUrl(user.avatarUrl)}
                    alt={user.name}
                    className="object-cover"
                  />
                  <AvatarFallback className="bg-white/10 text-white text-sm font-semibold font-display">
                    {user.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              sideOffset={10}
              collisionPadding={12}
              className="w-56 bg-[#161616] border-white/10 text-white z-[300]"
            >
              {user.isAdmin ? (
                <DropdownMenuItem
                  onClick={() => navigate("/admin")}
                  className="cursor-pointer text-white focus:bg-white/10 focus:text-white"
                >
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  <span>Админ-панель</span>
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuItem
                onClick={() => navigate("/profile")}
                className="cursor-pointer text-white focus:bg-white/10 focus:text-white"
              >
                <UserCircle className="mr-2 h-4 w-4" />
                <span>Профиль</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleLogout}
                className="cursor-pointer text-red-500 focus:bg-red-500/10 focus:text-red-500"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Выйти</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-3">
        <Link
          to="/signin"
          className="hidden sm:inline-flex h-10 items-center px-5 rounded-full text-sm font-medium text-white/85 border border-white/20 hover:border-white/40 hover:bg-white/5 transition-all duration-300"
        >
          Войти
        </Link>
        <Link to="/signup">
          <Button className="h-10 px-6 rounded-full bg-[#8B5CF6] hover:bg-[#7c3aed] text-white font-semibold shadow-none hover:shadow-[0_0_20px_rgba(139,92,246,0.35)] transition-all duration-300 border-0">
            Регистрация
          </Button>
        </Link>
      </div>
    );
  };

  return (
    <>
      <header
        className={cn(
          "fixed top-0 inset-x-0 z-[200] transition-all duration-500 overflow-visible",
          isScrolled
            ? "bg-[#050505]/90 backdrop-blur-xl border-b border-white/5 shadow-2xl"
            : "bg-gradient-to-b from-[#0a0a0a] via-[#0a0a0a]/95 to-transparent"
        )}
      >
        <div className="container px-6 md:px-8 mx-auto">
          <div className="grid h-20 grid-cols-[1fr_auto_1fr] items-center gap-4">
            <Link
              to="/"
              className="justify-self-start text-2xl font-black tracking-tighter text-white font-display hover:text-[#8B5CF6] transition-colors duration-300"
            >
              +Vibe
            </Link>

            <nav className="hidden md:flex items-center gap-8 justify-self-center">
              <NavLink to="/concerts">Концерты</NavLink>
              <NavLink to="/about">О нас</NavLink>
              <NavLink to="/contact">Контакты</NavLink>
              <NavLink to="/faq">FAQ</NavLink>
              {user?.isAdmin ? <NavLink to="/admin">Админ-панель</NavLink> : null}
            </nav>

            <div className="justify-self-end flex items-center gap-2">
              <div className="hidden md:flex items-center">{renderAuthButtons()}</div>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden text-white hover:bg-white/10"
                onClick={() => setIsMobileMenuOpen((open) => !open)}
              >
                {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {isMobileMenuOpen ? (
        <div className="fixed inset-x-0 top-20 z-[199] bg-[#0a0a0a] border-b border-white/10 md:hidden">
          <div className="container px-6 py-8">
            <nav className="flex flex-col space-y-6">
              {[
                ["/concerts", "Концерты"],
                ["/about", "О нас"],
                ["/contact", "Контакты"],
                ["/faq", "FAQ"],
                ...(user?.isAdmin ? [["/admin", "Админ-панель"]] : []),
              ].map(([to, label]) => (
                <Link
                  key={to}
                  to={to}
                  className={cn("text-lg", isNavActive(to) ? "text-white font-medium" : "text-white/50")}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {label}
                </Link>
              ))}
              <div className="h-px bg-white/10" />
              {!user && (
                <div className="flex flex-col gap-3">
                  <Link to="/signin" className="text-center py-2 text-white/50">
                    Войти
                  </Link>
                  <Link
                    to="/signup"
                    className="text-center py-3 rounded-full bg-[#8B5CF6] text-white font-bold"
                  >
                    Регистрация
                  </Link>
                </div>
              )}
            </nav>
          </div>
        </div>
      ) : null}
    </>
  );
};

export default NavBar;
