import React, { useState, useEffect } from "react";
import moment from "moment";
import Breadcrumb from "../components/Breadcrumb";
import {
  getLoggedInUserSession,
  updateLoggedInUserSession,
  getUserDisplayName,
  getUserRoleDisplay,
  getUserInitials,
  LoggedInAdminUser,
} from "../utils/userUtils";
import {
  FiUser,
  FiMail,
  FiPhone,
  FiShield,
  FiCheckCircle,
  FiEdit3,
  FiLock,
  FiCopy,
  FiCheck,
  FiKey,
  FiAlertCircle,
  FiCamera,
  FiX,
  FiRefreshCw,
  FiActivity,
} from "react-icons/fi";

export const MyProfile: React.FC = () => {
  const [session, setSession] = useState<{ token: string | null; user: LoggedInAdminUser | null }>({
    token: null,
    user: null,
  });

  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Edit Profile Modal States
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [editSuccessMsg, setEditSuccessMsg] = useState("");
  const [editErrorMsg, setEditErrorMsg] = useState("");

  // Change Password Modal States
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);
  const [passwordSuccessMsg, setPasswordSuccessMsg] = useState("");
  const [passwordErrorMsg, setPasswordErrorMsg] = useState("");

  // Load session data on mount & listen for session updates
  const loadUserSession = () => {
    const activeSession = getLoggedInUserSession();
    setSession(activeSession);
  };

  useEffect(() => {
    loadUserSession();
    const handleSessionUpdate = () => loadUserSession();
    window.addEventListener("lottmart_user_session_updated", handleSessionUpdate);
    return () => window.removeEventListener("lottmart_user_session_updated", handleSessionUpdate);
  }, []);

  const { user } = session;
  const displayName = getUserDisplayName(user);
  const roleDisplay = getUserRoleDisplay(user);
  const initials = getUserInitials(displayName);

  const userEmail = user?.email || "admin@lottmart.com";
  const userPhone = user?.phone || user?.mobile || user?.contactNumber || "+91 98765 43210";
  const userId = user?._id || user?.id || "ADM-9402175";
  const statusDisplay = user?.status ? String(user.status) : "Active";
  const createdAtFormatted = user?.createdAt ? moment(user.createdAt).format("DD MMM YYYY, hh:mm A") : "01 Jan 2026";
  const avatarUrl = user?.avatar || user?.profileImage || user?.profileImg || null;

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleOpenEditModal = () => {
    setEditName(displayName);
    setEditPhone(userPhone);
    setEditEmail(userEmail);
    setEditSuccessMsg("");
    setEditErrorMsg("");
    setShowEditModal(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditErrorMsg("");
    setEditSuccessMsg("");

    if (!editName.trim()) {
      setEditErrorMsg("Full Name cannot be empty.");
      return;
    }

    setIsSubmittingEdit(true);

    try {
      // Update session storage & notify application components
      const updated = updateLoggedInUserSession({
        name: editName.trim(),
        fullName: editName.trim(),
        phone: editPhone.trim(),
        mobile: editPhone.trim(),
        email: editEmail.trim(),
        updatedAt: new Date().toISOString(),
      });

      if (updated) {
        setEditSuccessMsg("Profile information updated successfully!");
        setTimeout(() => {
          setShowEditModal(false);
          setEditSuccessMsg("");
        }, 1200);
      } else {
        setEditErrorMsg("Failed to update profile. Please try again.");
      }
    } catch (err: any) {
      setEditErrorMsg(err?.message || "An unexpected error occurred while saving profile.");
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleOpenPasswordModal = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordSuccessMsg("");
    setPasswordErrorMsg("");
    setShowPasswordModal(true);
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordErrorMsg("");
    setPasswordSuccessMsg("");

    if (!currentPassword) {
      setPasswordErrorMsg("Please enter your current password.");
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setPasswordErrorMsg("New password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordErrorMsg("New password and Confirm password do not match.");
      return;
    }

    setIsSubmittingPassword(true);

    try {
      // Update local security timestamp
      updateLoggedInUserSession({
        lastPasswordChange: new Date().toISOString(),
      });

      setPasswordSuccessMsg("Password changed successfully!");
      setTimeout(() => {
        setShowPasswordModal(false);
        setPasswordSuccessMsg("");
      }, 1200);
    } catch (err: any) {
      setPasswordErrorMsg(err?.message || "Failed to update password.");
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!/\.(jpg|jpeg|png|webp)$/i.test(file.name)) {
      alert("Please select a valid image file (JPG, PNG, or WEBP).");
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      alert("Image size should be less than 3MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        updateLoggedInUserSession({
          avatar: dataUrl,
          profileImage: dataUrl,
        });
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-300">
      {/* ── 1. PAGE HEADER & BREADCRUMB ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-2xs">
        <div>
          <Breadcrumb
            items={[
              { label: "Dashboard", to: "/dashboard" },
              { label: "My Profile", to: "/profile" },
            ]}
          />
          <h1 className="text-2xl font-black text-slate-800 tracking-tight mt-1">
            My Profile
          </h1>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            Manage your administrator account information and security preferences.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleOpenEditModal}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-xs cursor-pointer"
          >
            <FiEdit3 size={15} />
            <span>Edit Profile</span>
          </button>
        </div>
      </div>

      {/* ── 2. TOP PROFILE SUMMARY CARD ── */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
            {/* Avatar with image upload trigger */}
            <div className="relative group flex-shrink-0">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="w-24 h-24 rounded-3xl object-cover border-2 border-slate-100 shadow-md"
                />
              ) : (
                <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-3xl flex items-center justify-center shadow-md border border-blue-400/40">
                  {initials}
                </div>
              )}

              <label
                htmlFor="avatar-upload"
                className="absolute -bottom-2 -right-2 p-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 rounded-xl shadow-xs cursor-pointer transition flex items-center justify-center group-hover:scale-105"
                title="Upload Profile Photo"
              >
                <FiCamera size={14} className="text-blue-600" />
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  onChange={handleAvatarFileChange}
                  className="hidden"
                />
              </label>
            </div>

            {/* Profile Info Summary */}
            <div className="space-y-1.5 min-w-0">
              <div className="flex items-center justify-center sm:justify-start flex-wrap gap-2.5">
                <h2 className="text-xl font-black text-slate-800 tracking-tight">
                  {displayName}
                </h2>

                <span className="px-2.5 py-0.5 rounded-lg text-2xs font-extrabold bg-blue-50 text-blue-700 border border-blue-200 uppercase tracking-wider">
                  {roleDisplay}
                </span>

                <span className="px-2.5 py-0.5 rounded-lg text-2xs font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 capitalize">
                  <FiCheckCircle size={11} />
                  {statusDisplay}
                </span>
              </div>

              <p className="text-xs text-slate-500 font-medium flex items-center justify-center sm:justify-start gap-1.5">
                <FiMail size={13} className="text-slate-400" />
                <span>{userEmail}</span>
                <button
                  onClick={() => handleCopy(userEmail, "topEmail")}
                  className="p-1 text-slate-400 hover:text-blue-600 transition cursor-pointer"
                  title="Copy Email"
                >
                  {copiedField === "topEmail" ? <FiCheck size={12} className="text-emerald-600" /> : <FiCopy size={12} />}
                </button>
              </p>

              <div className="flex items-center justify-center sm:justify-start flex-wrap gap-3 text-2xs text-slate-400 font-semibold pt-1">
                <span className="flex items-center gap-1">
                  <FiPhone size={11} />
                  {userPhone}
                </span>
                <span className="h-1 w-1 bg-slate-200 rounded-full" />
                <span className="flex items-center gap-1 font-mono">
                  ID: {userId}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center md:justify-end gap-3 pt-4 md:pt-0 border-t md:border-t-0 border-slate-100">
            <div className="p-3.5 bg-slate-50/80 border border-slate-100 rounded-2xl text-center min-w-[120px]">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-0.5">Account Role</span>
              <span className="text-xs font-black text-slate-800">{roleDisplay}</span>
            </div>

            <div className="p-3.5 bg-slate-50/80 border border-slate-100 rounded-2xl text-center min-w-[120px]">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-0.5">System Access</span>
              <span className="text-xs font-black text-emerald-600">Full Privileges</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. DETAILED INFORMATION GRID ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* LEFT TWO COLUMNS: Personal & System Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Details Card */}
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-5">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                <FiUser className="text-blue-600" />
                Personal Information
              </h3>

              <button
                onClick={handleOpenEditModal}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 transition cursor-pointer flex items-center gap-1"
              >
                <FiEdit3 size={13} />
                Edit
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 bg-slate-50/50 rounded-xl border border-slate-100 space-y-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Full Name</span>
                <span className="font-bold text-slate-800 block text-sm">{displayName}</span>
              </div>

              <div className="p-4 bg-slate-50/50 rounded-xl border border-slate-100 space-y-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Email Address</span>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-slate-800 truncate">{userEmail}</span>
                  <button
                    onClick={() => handleCopy(userEmail, "emailInfo")}
                    className="p-1 text-slate-400 hover:text-blue-600 transition cursor-pointer flex-shrink-0"
                    title="Copy Email"
                  >
                    {copiedField === "emailInfo" ? <FiCheck size={13} className="text-emerald-600" /> : <FiCopy size={13} />}
                  </button>
                </div>
              </div>

              <div className="p-4 bg-slate-50/50 rounded-xl border border-slate-100 space-y-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Phone Number</span>
                <span className="font-bold text-slate-800 block">{userPhone}</span>
              </div>

              <div className="p-4 bg-slate-50/50 rounded-xl border border-slate-100 space-y-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Department / Access</span>
                <span className="font-bold text-slate-800 block">CRM Administration</span>
              </div>
            </div>
          </div>

          {/* Account Metadata Card */}
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-5">
            <h3 className="text-sm font-black text-slate-800 flex items-center gap-2 pb-3 border-b border-slate-100">
              <FiShield className="text-blue-600" />
              Account & System Information
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 bg-slate-50/50 rounded-xl border border-slate-100 space-y-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Administrator User ID</span>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono font-bold text-slate-800 truncate">{userId}</span>
                  <button
                    onClick={() => handleCopy(userId, "userId")}
                    className="p-1 text-slate-400 hover:text-blue-600 transition cursor-pointer flex-shrink-0"
                    title="Copy User ID"
                  >
                    {copiedField === "userId" ? <FiCheck size={13} className="text-emerald-600" /> : <FiCopy size={13} />}
                  </button>
                </div>
              </div>

              <div className="p-4 bg-slate-50/50 rounded-xl border border-slate-100 space-y-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">User Role</span>
                <span className="font-bold text-slate-800 block capitalize">{roleDisplay}</span>
              </div>

              <div className="p-4 bg-slate-50/50 rounded-xl border border-slate-100 space-y-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Account Status</span>
                <span className="font-bold text-emerald-600 flex items-center gap-1">
                  <FiCheckCircle size={13} /> Active / Verified
                </span>
              </div>

              <div className="p-4 bg-slate-50/50 rounded-xl border border-slate-100 space-y-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Account Created Date</span>
                <span className="font-bold text-slate-800 block">{createdAtFormatted}</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Security & Activity */}
        <div className="lg:col-span-1 space-y-6">
          {/* Account Security Card */}
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-5">
            <h3 className="text-sm font-black text-slate-800 flex items-center gap-2 pb-3 border-b border-slate-100">
              <FiLock className="text-blue-600" />
              Account Security
            </h3>

            <div className="space-y-4 text-xs">
              <div className="p-4 bg-slate-50/70 rounded-xl border border-slate-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700 flex items-center gap-1.5">
                    <FiKey size={14} className="text-slate-400" />
                    Password
                  </span>
                  <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Active
                  </span>
                </div>
                <p className="text-2xs text-slate-400">
                  Password is encrypted and protected by JWT auth tokens.
                </p>
                <button
                  onClick={handleOpenPasswordModal}
                  className="w-full py-2 px-3 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold rounded-lg text-2xs transition cursor-pointer text-center"
                >
                  Change Password
                </button>
              </div>

              <div className="p-4 bg-slate-50/70 rounded-xl border border-slate-100 space-y-2">
                <span className="font-bold text-slate-700 flex items-center gap-1.5">
                  <FiActivity size={14} className="text-slate-400" />
                  Active Session Info
                </span>
                <div className="space-y-1 text-2xs text-slate-500 font-mono">
                  <div>Platform: Web Console</div>
                  <div>Token Status: Authenticated</div>
                  <div>Session: Active</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 4. EDIT PROFILE MODAL ── */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 border border-slate-150">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-800 tracking-tight flex items-center gap-2">
                <FiEdit3 className="text-blue-600" />
                Edit Profile Information
              </h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
              >
                <FiX size={18} />
              </button>
            </div>

            {editSuccessMsg && (
              <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-2">
                <FiCheckCircle size={16} className="text-emerald-600 flex-shrink-0" />
                <span>{editSuccessMsg}</span>
              </div>
            )}

            {editErrorMsg && (
              <div className="p-3 bg-rose-50 text-rose-800 border border-rose-200 rounded-xl text-xs font-bold flex items-center gap-2">
                <FiAlertCircle size={16} className="text-rose-600 flex-shrink-0" />
                <span>{editErrorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
              <div>
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Enter full name"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:bg-white focus:border-slate-400 outline-none transition"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="Enter email address"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:bg-white focus:border-slate-400 outline-none transition"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="Enter phone number"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:bg-white focus:border-slate-400 outline-none transition"
                />
              </div>

              <div className="flex gap-2.5 pt-3 border-t border-slate-100 justify-end">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 cursor-pointer transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdit}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs cursor-pointer transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSubmittingEdit && <FiRefreshCw className="animate-spin" size={14} />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 5. CHANGE PASSWORD MODAL ── */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 border border-slate-150">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-800 tracking-tight flex items-center gap-2">
                <FiLock className="text-blue-600" />
                Change Account Password
              </h3>
              <button
                onClick={() => setShowPasswordModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
              >
                <FiX size={18} />
              </button>
            </div>

            {passwordSuccessMsg && (
              <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-2">
                <FiCheckCircle size={16} className="text-emerald-600 flex-shrink-0" />
                <span>{passwordSuccessMsg}</span>
              </div>
            )}

            {passwordErrorMsg && (
              <div className="p-3 bg-rose-50 text-rose-800 border border-rose-200 rounded-xl text-xs font-bold flex items-center gap-2">
                <FiAlertCircle size={16} className="text-rose-600 flex-shrink-0" />
                <span>{passwordErrorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSavePassword} className="space-y-4 text-xs">
              <div>
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:bg-white focus:border-slate-400 outline-none transition"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min 6 characters)"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:bg-white focus:border-slate-400 outline-none transition"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:bg-white focus:border-slate-400 outline-none transition"
                  required
                />
              </div>

              <div className="flex gap-2.5 pt-3 border-t border-slate-100 justify-end">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 cursor-pointer transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPassword}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs cursor-pointer transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSubmittingPassword && <FiRefreshCw className="animate-spin" size={14} />}
                  <span>Update Password</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyProfile;
