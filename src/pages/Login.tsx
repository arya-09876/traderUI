import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCompleteUrlV1 } from "../utils";
import { FiEye, FiEyeOff } from "react-icons/fi";

const LoginPage = () => {
  const [loginMethod, setLoginMethod] = useState<"otp" | "password">("otp");
  const [input, setInput] = useState(() => {
    return localStorage.getItem("remembered_login_input") || "";
  });
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => {
    return localStorage.getItem("remember_me") === "true";
  });
  const [otp, setOtp] = useState("");
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const validateEmailOrMobile = (value: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const mobileRegex = /^\d{10}$/;
    return emailRegex.test(value) || mobileRegex.test(value);
  };

  const validateEmail = (value: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  };

  const handleTabChange = (method: "otp" | "password") => {
    setLoginMethod(method);
    setError("");
    setIsOtpSent(false);
    setOtp("");
    setPassword("");
  };

  const handleOtpFlowSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    let formattedInput = input.trim();
    if (/^\d{10}$/.test(formattedInput)) {
      formattedInput = `+91-${formattedInput}`;
    }

    if (!isOtpSent) {
      if (!validateEmailOrMobile(input.trim())) {
        setError("Please enter a valid email or 10-digit mobile number");
        return;
      }

      setIsLoading(true);
      try {
        const response = await fetch(getCompleteUrlV1("auth/send-otp"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: formattedInput,
            type: "login_user_verification",
          }),
        });
        const data = await response.json();

        if (response.ok && data.type === "success") {
          setIsOtpSent(true);
        } else {
          setError(data.message || "Failed to send OTP. Please try again.");
        }
      } catch {
        setError("Something went wrong. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    } else {
      if (otp.length !== 6) {
        setError("Please enter a valid 6-digit OTP");
        return;
      }

      setIsLoading(true);
      try {
        const response = await fetch(getCompleteUrlV1("auth/login"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: formattedInput, otp: Number(otp) }),
        });
        const data = await response.json();

        if (response.ok && data.token) {
          localStorage.setItem(
            "user",
            JSON.stringify({
              token: data.token,
              user: data.user,
            })
          );
          if (rememberMe) {
            localStorage.setItem("remembered_login_input", input);
            localStorage.setItem("remember_me", "true");
          } else {
            localStorage.removeItem("remembered_login_input");
            localStorage.removeItem("remember_me");
          }
          navigate("/dashboard");
        } else {
          setError(data.message || "Login Failed. Please check your OTP.");
        }
      } catch {
        setError("Something went wrong. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handlePasswordFlowSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const trimmedInput = input.trim();
    if (!trimmedInput) {
      setError("Please enter your administrator email");
      return;
    }

    if (!validateEmail(trimmedInput) && !validateEmailOrMobile(trimmedInput)) {
      setError("Please enter a valid email address");
      return;
    }

    if (!password) {
      setError("Please enter your password");
      return;
    }

    let formattedInput = trimmedInput;
    if (/^\d{10}$/.test(trimmedInput)) {
      formattedInput = `+91-${trimmedInput}`;
    }

    setIsLoading(true);
    try {
      const response = await fetch(getCompleteUrlV1("auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formattedInput,
          password: password,
          deviceToken: "web-token",
          platform: "android",
          deviceId: "web-device-id",
          appVersion: "1.0.0",
        }),
      });

      const data = await response.json();

      if (response.ok && (data.token || data.type === "success")) {
        localStorage.setItem(
          "user",
          JSON.stringify({
            token: data.token,
            user: data.user || {},
          })
        );

        if (rememberMe) {
          localStorage.setItem("remembered_login_input", input);
          localStorage.setItem("remember_me", "true");
        } else {
          localStorage.removeItem("remembered_login_input");
          localStorage.removeItem("remember_me");
        }

        navigate("/dashboard");
      } else {
        setError(data.message || "Invalid email or password");
      }
    } catch {
      setError("Something went wrong. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      {/* ───── Left Blue Panel ───── */}
      <div className="login-left">
        {/* Logo top-left */}
        <div className="absolute top-8 left-8 z-10 flex items-center">
          <div className="bg-white/95 backdrop-blur-md rounded-2xl px-5 py-3 shadow-xl border border-white/40 transition-all duration-300 hover:shadow-2xl">
            <img
              src="/lottmart-logo.png"
              alt="LOTTMART - Trade at Scale. Earn More."
              className="h-10 w-auto object-contain"
            />
          </div>
        </div>

        {/* Illustration */}
        <div className="relative z-10 mt-12">
          <img
            src="/login-illustration.png"
            alt="Illustration"
            className="w-72 mb-10 drop-shadow-2xl"
          />

          <h1 className="text-white text-[2.2rem] font-extrabold leading-tight mb-4">
            A few more clicks to
            <br />
            sign in to your account.
          </h1>
          <p className="text-blue-200 text-base">
            Manage all your Lottmart App accounts in one place
          </p>
        </div>
      </div>

      {/* ───── Right White Panel ───── */}
      <div className="login-right">
        <div className="w-full max-w-sm">
          {/* Title and Subtitle */}
          <h2 className="text-2xl font-bold text-slate-900 mb-1">
            {loginMethod === "otp" ? "Sign in with OTP" : "Sign in with Password"}
          </h2>
          <p className="text-xs text-slate-500 mb-6">
            {loginMethod === "otp"
              ? "We'll send a verification code to your email."
              : "Use your administrator email and password."}
          </p>

          {/* Segmented Tab Controls */}
          <div className="flex bg-slate-100 p-1 rounded-xl mb-6 border border-slate-200/60">
            <button
              type="button"
              onClick={() => handleTabChange("otp")}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                loginMethod === "otp"
                  ? "bg-white text-[#3644d6] shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Login with OTP
            </button>
            <button
              type="button"
              onClick={() => handleTabChange("password")}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                loginMethod === "password"
                  ? "bg-white text-[#3644d6] shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Login with Password
            </button>
          </div>

          {loginMethod === "otp" ? (
            /* ───── OTP FORM ───── */
            <form onSubmit={handleOtpFlowSubmit} className="space-y-5">
              {!isOtpSent ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Email or Mobile
                  </label>
                  <input
                    id="login-email"
                    type="text"
                    placeholder="admin@example.com"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    disabled={isLoading}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#3644d6] focus:border-transparent outline-none transition-all placeholder:text-slate-400"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-slate-700">
                      Verification Code
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsOtpSent(false);
                        setOtp("");
                      }}
                      className="text-xs font-semibold text-[#3644d6] hover:underline"
                    >
                      Change email?
                    </button>
                  </div>
                  <input
                    id="login-otp"
                    type="text"
                    placeholder="Enter 6-digit OTP"
                    value={otp}
                    maxLength={6}
                    onChange={(e) => setOtp(e.target.value)}
                    disabled={isLoading}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#3644d6] focus:border-transparent outline-none transition-all text-center text-lg font-bold tracking-[0.4em]"
                  />
                  <p className="text-xs text-slate-400 text-center mt-1">
                    OTP sent to{" "}
                    <span className="font-semibold text-slate-600">{input}</span>
                  </p>
                </div>
              )}

              {/* Remember me */}
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 text-slate-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 accent-[#3644d6]"
                  />
                  Remember me
                </label>
              </div>

              {/* Error */}
              {error && (
                <div className="bg-red-50 text-red-600 text-sm py-2.5 px-4 rounded-lg border border-red-100">
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                id="login-submit"
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#3644d6] hover:bg-[#2c38b8] text-white font-semibold py-3 rounded-xl shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed text-sm"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : isOtpSent ? (
                  "Verify & Login"
                ) : (
                  "Send OTP"
                )}
              </button>
            </form>
          ) : (
            /* ───── PASSWORD FORM ───── */
            <form onSubmit={handlePasswordFlowSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Email Address
                </label>
                <input
                  id="login-email"
                  type="text"
                  placeholder="admin@example.com"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={isLoading}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#3644d6] focus:border-transparent outline-none transition-all placeholder:text-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    className="w-full px-4 py-3 pr-11 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#3644d6] focus:border-transparent outline-none transition-all placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                  </button>
                </div>
              </div>

              {/* Remember me / Forgot Password */}
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 text-slate-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 accent-[#3644d6]"
                  />
                  Remember me
                </label>
                <a
                  href="#"
                  className="text-slate-600 hover:text-[#3644d6] font-medium transition-colors text-xs"
                >
                  Forgot Password?
                </a>
              </div>

              {/* Error */}
              {error && (
                <div className="bg-red-50 text-red-600 text-sm py-2.5 px-4 rounded-lg border border-red-100">
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                id="login-submit"
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#3644d6] hover:bg-[#2c38b8] text-white font-semibold py-3 rounded-xl shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed text-sm"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  "Login"
                )}
              </button>
            </form>
          )}

          {/* Alternative mode link at bottom */}
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => handleTabChange(loginMethod === "otp" ? "password" : "otp")}
              className="text-xs font-semibold text-[#3644d6] hover:underline"
            >
              {loginMethod === "otp"
                ? "Or continue with Login with Password"
                : "Or continue with Login with OTP"}
            </button>
          </div>

          {/* Footer */}
          <div className="mt-8">
            <p className="text-xs text-slate-400 leading-relaxed text-center">
              By signing up, you agree to our
              <br />
              <a href="#" className="text-[#3644d6] font-semibold hover:underline">
                Terms and Conditions
              </a>{" "}
              &amp;{" "}
              <a href="#" className="text-[#3644d6] font-semibold hover:underline">
                Privacy Policy
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export { LoginPage };

