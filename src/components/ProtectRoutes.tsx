import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import {
  FaUserCircle,
  FaList,
  FaClipboardCheck,
  FaTags,
  FaCube,
  FaUsers,
  FaImage,
  FaThLarge,
  FaCoins,
  FaFileInvoiceDollar,
  FaChartBar,
  FaSlidersH,
  FaBell,
} from "react-icons/fa";
import { FiMenu, FiLogOut } from "react-icons/fi";
import { FaShop } from "react-icons/fa6";
import { STATIC_NOTIFICATIONS } from "../constants/staticNotifications";

export const ProtectRoute = ({ children }: { children: React.ReactNode }) => {
  const token = localStorage.getItem("user");
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(true);
  const navigate = useNavigate();
  const [openMenu, setOpenMenu] = useState(false);
  const [openNotifications, setOpenNotifications] = useState(false);

  if (!token) {
    return <Navigate to="/" />;
  }

  const navItems = [
    { path: "/dashboard", label: "Dashboard", icon: <FaThLarge /> },
    { path: "/users", label: "Users", icon: <FaUsers /> },

    { path: "/category-list", label: "Category List", icon: <FaTags /> },
    // { path: "/create-master", label: "Create Master", icon: <FaThLarge /> },
    {
      path: "/master-product-list",
      label: "Master Product List",
      icon: <FaList />,
    },
    {
      path: "/approvals",
      label: "Approvals",
      icon: <FaClipboardCheck />,
    },
    { path: "/products", label: "Products", icon: <FaCube /> },

    { path: "/orders", label: "Orders", icon: <FaShop /> },
    { path: "/banners", label: "Banners", icon: <FaImage /> },
    { path: "/notifications", label: "Notifications", icon: <FaBell /> },

    // Wallet Module Header
    { isHeader: true, label: "Wallet Module" },
    { path: "/wallet/withdrawals", label: "Withdrawal Requests", icon: <FaCoins /> },
    { path: "/wallet/commission-rules", label: "Commission Rules", icon: <FaFileInvoiceDollar /> },
    { path: "/wallet/analytics", label: "Wallet Analytics", icon: <FaChartBar /> },
    { path: "/wallet/settings", label: "Wallet Settings", icon: <FaSlidersH /> },
    { path: "/wallet/details", label: "Wallet Details", icon: <FaUserCircle />, hideInSidebar: true },
  ];

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/");
  };
  return (
    <div className="flex h-screen bg-[#f8fafc] overflow-hidden font-sans">
      {/* Sidebar */}
      <aside
        className={`${
          isOpen ? "w-64" : "w-20"
        } transition-all duration-300 ease-in-out bg-gradient-to-b from-slate-900 via-[#0b0f19] to-slate-950 flex flex-col text-white shadow-2xl z-30 relative border-r border-slate-800/40`}
      >
        {/* Sidebar Top with Toggle */}
        <div className={`flex items-center p-4 border-b border-slate-800/60 ${isOpen ? 'justify-between' : 'flex-col gap-4 justify-center'}`}>
          {isOpen ? (
            <div className="flex items-center">
              <div className="bg-white rounded-xl px-3 py-1.5 shadow-md border border-slate-100 flex items-center justify-center transition-all duration-200">
                <img
                  src="/lottmart-logo.png"
                  alt="LOTTMART"
                  className="h-8 w-auto object-contain max-w-[145px]"
                />
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl p-1.5 shadow-md border border-slate-100 flex items-center justify-center transition-transform hover:scale-105">
              <img
                src="/lottmart-icon.png"
                alt="LOTTMART"
                className="h-7 w-7 object-contain"
              />
            </div>
          )}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-1.5 cursor-pointer rounded-lg hover:bg-slate-800/80 text-slate-400 hover:text-white transition-all duration-200"
            title={isOpen ? "Collapse Sidebar" : "Expand Sidebar"}
          >
            <FiMenu size={18} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-1.5 p-3 mt-4 overflow-y-auto overflow-x-hidden custom-scrollbar flex-1">
          {navItems.map((item, index) => {
            if ("isHeader" in item && item.isHeader) {
              return isOpen ? (
                <div key={index} className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-4 pt-5 pb-1">
                  {item.label}
                </div>
              ) : (
                <div key={index} className="border-t border-slate-800/60 my-3" />
              );
            }

            if ("hideInSidebar" in item && item.hideInSidebar) {
              return null;
            }

            const linkItem = item as { path: string; label: string; icon: React.ReactNode };
            const isActive = location.pathname === linkItem.path;
            return (
              <Link
                key={linkItem.path}
                to={linkItem.path}
                className={`flex items-center gap-3.5 px-4 py-3 rounded-xl transition-all duration-200 group relative ${
                  isActive
                    ? "bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 text-white shadow-[0_4px_20px_rgba(59,130,246,0.25)] font-semibold"
                    : "hover:bg-slate-800/60 text-slate-400 hover:text-slate-100"
                }`}
              >
                {isActive && (
                  <div className="absolute left-0 top-3 bottom-3 w-1 bg-blue-500 rounded-r-full" />
                )}
                <span className={`text-lg transition-all duration-200 ${
                  isActive ? "scale-110 text-white" : "group-hover:scale-110 text-slate-400 group-hover:text-slate-100"
                }`}>
                  {linkItem.icon}
                </span>
                {isOpen && (
                  <span className="text-sm whitespace-nowrap overflow-hidden text-ellipsis tracking-wide">
                    {linkItem.label}
                  </span>
                )}
                {!isOpen && (
                  <div className="absolute left-20 bg-slate-900 border border-slate-800 text-slate-200 px-3 py-1.5 rounded-lg text-xs font-medium opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 translate-x-2 group-hover:translate-x-0 whitespace-nowrap z-50 shadow-xl shadow-black/40">
                    {linkItem.label}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        {isOpen ? (
          <div className="p-4 border-t border-slate-800/60 bg-slate-950/25 flex flex-col gap-3">
            <div className="flex items-center gap-3 px-2 py-1">
              <div className="relative flex-shrink-0">
                <FaUserCircle size={36} className="text-slate-400" />
                <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-slate-950 rounded-full"></div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-200 truncate">Administrator</p>
                <p className="text-[10px] text-slate-500 font-medium truncate">Super Admin</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center justify-center gap-2 w-full px-4 py-2.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all duration-200 group border border-dashed border-slate-800 hover:border-red-500/20 font-medium text-xs cursor-pointer"
            >
              <FiLogOut size={16} className="group-hover:-translate-x-0.5 transition-transform" />
              <span>Sign Out</span>
            </button>
          </div>
        ) : (
          <div className="p-4 border-t border-slate-800/60 bg-slate-950/25 flex flex-col items-center gap-4">
            <div className="relative group/avatar cursor-pointer">
              <FaUserCircle size={32} className="text-slate-400" />
              <div className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-500 border border-slate-950 rounded-full"></div>
              <div className="absolute left-14 bottom-1 bg-slate-900 border border-slate-800 text-slate-200 px-3 py-1.5 rounded-lg text-xs font-medium opacity-0 group-hover/avatar:opacity-100 pointer-events-none transition-all duration-200 translate-x-2 group-hover/avatar:translate-x-0 whitespace-nowrap z-50 shadow-xl shadow-black/40">
                Administrator (Super Admin)
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center justify-center p-2.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all duration-200 group relative cursor-pointer"
              title="Sign Out"
            >
              <FiLogOut size={20} className="group-hover:scale-110 transition-transform" />
              <div className="absolute left-14 bg-slate-900 border border-slate-800 text-slate-200 px-3 py-1.5 rounded-lg text-xs font-medium opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 translate-x-2 group-hover:translate-x-0 whitespace-nowrap z-50 shadow-xl shadow-black/40">
                Sign Out
              </div>
            </button>
          </div>
        )}
      </aside>

      {/* Main Section */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between bg-white px-8 py-4 border-b border-slate-100 shadow-sm z-20">
          <div className="flex items-center gap-3">
            <h1
              onClick={() => navigate("/dashboard")}
              className="text-xl font-bold text-slate-800 cursor-pointer hover:text-blue-600 transition-colors"
            >
              {navItems.find((item) => location.pathname === item.path)?.label || "Overview"}
            </h1>
          </div>

          <div className="flex items-center gap-6">
            <div className="h-8 w-px bg-slate-200 hidden sm:block"></div>
            
            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => {
                  setOpenNotifications(!openNotifications);
                  setOpenMenu(false);
                }}
                className="relative p-2.5 rounded-xl bg-slate-50 text-slate-500 hover:text-blue-600 hover:bg-blue-50/50 transition-all duration-200 cursor-pointer flex items-center justify-center border border-slate-100"
                title="Notifications"
              >
                <FaBell size={18} />
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white ring-2 ring-white animate-pulse">
                  5
                </span>
              </button>

              {openNotifications && (
                <div className="absolute right-0 mt-3 w-96 bg-white border border-slate-100 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                  {/* Header */}
                  <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/50">
                    <div>
                      <h3 className="font-bold text-slate-800 text-sm">Recent Alerts</h3>
                      <p className="text-[11px] text-slate-400 font-medium">You have 5 unread alerts</p>
                    </div>
                    <button
                      className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
                      onClick={() => setOpenNotifications(false)}
                    >
                      Mark all as read
                    </button>
                  </div>

                  {/* Notification List */}
                  <div className="max-h-[360px] overflow-y-auto divide-y divide-slate-50">
                    {STATIC_NOTIFICATIONS.filter(n => n.readStatus === "unread").slice(0, 4).map((notif) => {
                      let iconColor = "bg-blue-50 text-blue-600 border border-blue-100";
                      let iconChar = "🔔";

                      if (notif.module === "user") { iconColor = "bg-teal-50 text-teal-600 border border-teal-100"; iconChar = "👤"; }
                      else if (notif.module === "seller") { iconColor = "bg-amber-50 text-amber-600 border border-amber-100"; iconChar = "🏪"; }
                      else if (notif.module === "product") { iconColor = "bg-purple-50 text-purple-600 border border-purple-100"; iconChar = "📦"; }
                      else if (notif.module === "order") { iconColor = "bg-emerald-50 text-emerald-600 border border-emerald-100"; iconChar = "🛍️"; }
                      else if (notif.module === "wallet") { iconColor = "bg-indigo-50 text-indigo-600 border border-indigo-100"; iconChar = "💳"; }
                      else if (notif.module === "system") { iconColor = "bg-red-50 text-red-600 border border-red-100"; iconChar = "⚠️"; }

                      return (
                        <div
                          key={notif.id}
                          className="p-4 hover:bg-slate-50/70 transition-colors flex gap-3.5 cursor-pointer"
                          onClick={() => {
                            setOpenNotifications(false);
                            navigate("/notifications");
                          }}
                        >
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-semibold flex-shrink-0 ${iconColor}`}>
                            {iconChar}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-xs font-bold text-slate-700 truncate">{notif.title}</p>
                              <span className="text-[10px] text-slate-400 whitespace-nowrap">{notif.createdTime}</span>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-1 leading-normal line-clamp-2">{notif.description}</p>
                            {notif.entityName && (
                              <div className="mt-1.5 flex items-center gap-1.5">
                                <span className="text-[9px] font-semibold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-md">
                                  {notif.module.toUpperCase()}: {notif.entityName}
                                </span>
                                {notif.priority === "high" && (
                                  <span className="text-[9px] font-semibold bg-red-50 text-red-600 px-1.5 py-0.5 rounded-md">
                                    High
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Footer Link */}
                  <div className="border-t border-slate-100 p-3 bg-slate-50/50 flex justify-center">
                    <button
                      onClick={() => {
                        setOpenNotifications(false);
                        navigate("/notifications");
                      }}
                      className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors w-full text-center py-1 cursor-pointer"
                    >
                      View All Activity →
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="relative">
              <div
                className="flex items-center gap-3 cursor-pointer group"
                onClick={() => {
                  setOpenMenu(!openMenu);
                  setOpenNotifications(false);
                }}
              >
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-semibold text-slate-700 leading-none">Administrator</p>
                  <p className="text-[11px] text-slate-400 font-medium mt-1">Super Admin</p>
                </div>
                <div className="relative">
                  <FaUserCircle
                    size={36}
                    className="text-slate-300 group-hover:text-blue-600 transition-all shadow-inner rounded-full"
                  />
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></div>
                </div>
              </div>

              {openMenu && (
                <div className="absolute right-0 mt-3 w-56 bg-white border border-slate-100 rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="px-4 py-3 border-b border-slate-50 mb-2">
                    <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Account</p>
                  </div>
                  <button
                    className="w-full text-left px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 flex items-center gap-3 transition-colors"
                    onClick={() => setOpenMenu(false)}
                  >
                    My Profile
                  </button>
                  <button
                    className="w-full text-left px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 flex items-center gap-3 transition-colors"
                    onClick={() => setOpenMenu(false)}
                  >
                    Settings
                  </button>
                  <div className="h-px bg-slate-50 my-1"></div>
                  <button
                    className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors font-medium"
                    onClick={handleLogout}
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 p-8 overflow-auto bg-[#f8fafc]">
          <div className="max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
