export interface LoggedInAdminUser {
  _id?: string;
  id?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  contactNumber?: string;
  role?: string | string[];
  status?: string | number;
  avatar?: string;
  profileImage?: string;
  profileImg?: string;
  createdAt?: string;
  updatedAt?: string;
  lastLogin?: string;
  department?: string;
  designation?: string;
  permissions?: string[];
  [key: string]: any;
}

export function getLoggedInUserSession(): { token: string | null; user: LoggedInAdminUser | null } {
  try {
    const userStr = localStorage.getItem("user");
    if (!userStr) return { token: null, user: null };
    const parsed = JSON.parse(userStr);
    return {
      token: parsed.token || null,
      user: parsed.user || null,
    };
  } catch (err) {
    console.error("Error reading logged-in user session:", err);
    return { token: null, user: null };
  }
}

export function updateLoggedInUserSession(updatedFields: Partial<LoggedInAdminUser>): LoggedInAdminUser | null {
  try {
    const { token, user: currentUser } = getLoggedInUserSession();
    if (!currentUser) return null;

    const mergedUser: LoggedInAdminUser = {
      ...currentUser,
      ...updatedFields,
    };

    localStorage.setItem(
      "user",
      JSON.stringify({
        token,
        user: mergedUser,
      })
    );

    // Trigger cross-component update notification event
    window.dispatchEvent(new Event("lottmart_user_session_updated"));
    return mergedUser;
  } catch (err) {
    console.error("Error updating logged-in user session:", err);
    return null;
  }
}

export function getUserDisplayName(user: LoggedInAdminUser | null): string {
  if (!user) return "Administrator";
  if (user.fullName && user.fullName.trim()) return user.fullName.trim();
  if (user.name && user.name.trim()) return user.name.trim();
  if (user.firstName || user.lastName) {
    return `${user.firstName || ""} ${user.lastName || ""}`.trim();
  }
  if (user.email) return user.email.split("@")[0];
  return "Administrator";
}

export function getUserRoleDisplay(user: LoggedInAdminUser | null): string {
  if (!user) return "Super Admin";
  if (Array.isArray(user.role)) {
    return user.role.length > 0 ? user.role.join(", ") : "Super Admin";
  }
  if (typeof user.role === "string" && user.role.trim()) {
    const r = user.role.trim();
    if (r.toLowerCase() === "superadmin" || r.toLowerCase() === "super_admin") return "Super Admin";
    if (r.toLowerCase() === "admin") return "Admin";
    return r.charAt(0).toUpperCase() + r.slice(1);
  }
  return "Super Admin";
}

export function getUserInitials(name: string): string {
  if (!name) return "AD";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + (parts[1][0] || "")).toUpperCase();
  }
  return parts[0].substring(0, 2).toUpperCase();
}
