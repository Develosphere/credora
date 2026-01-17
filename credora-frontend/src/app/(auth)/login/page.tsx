"use client";

import Link from "next/link";
import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { authApi } from "@/lib/api/auth";
import { Eye, EyeOff, ArrowRight, Sparkles } from "lucide-react";

function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ email: "", password: "" });

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    setError(null);
    try {
      const { redirectUrl } = await authApi.googleLogin();
      sessionStorage.setItem("auth_callback_url", callbackUrl);
      window.location.href = redirectUrl;
    } catch (err) {
      setError("Failed to initiate login. Please try again.");
      setIsGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const { redirectUrl } = await authApi.googleLogin();
      sessionStorage.setItem("auth_callback_url", callbackUrl);
      window.location.href = redirectUrl;
    } catch (err) {
      setError("Failed to sign in. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="text-center space-y-3">
        <h1 className="text-4xl font-bold text-white animate-slide-up">Log In Account</h1>
        <p className="text-gray-400 text-lg animate-slide-up-delayed">Enter your credentials to access your account.</p>
      </div>

      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-sm text-red-400 animate-scale-in">{error}</div>
      )}

      {/* OAuth Button */}
      <button
        onClick={handleGoogleLogin}
        disabled={isGoogleLoading}
        className="group relative w-full flex items-center justify-center gap-3 px-4 py-4 rounded-xl border border-gray-700 bg-gray-900/50 text-white font-medium overflow-hidden transition-all duration-300 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
        type="button"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/10 to-primary/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
        {isGoogleLoading ? (
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        ) : (
          <svg className="h-5 w-5 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
        )}
        <span className="relative z-10">Continue with Google</span>
      </button>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-800"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-4 bg-[#0a0a0a] text-gray-600">Or</span>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="group">
          <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="eg. john@example.com"
            className="w-full px-4 py-4 rounded-xl bg-gray-900/50 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-gray-900 transition-all duration-300"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="Enter your password"
              className="w-full px-4 py-4 rounded-xl bg-gray-900/50 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-gray-900 transition-all duration-300 pr-12"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-primary transition-colors"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-end">
          <Link href="/forgot-password" className="text-sm text-primary hover:text-secondary transition-colors">
            Forgot password?
          </Link>
        </div>

        {/* Enhanced CTA Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="group relative w-full py-4 rounded-xl font-semibold text-lg overflow-hidden transition-all duration-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {/* Animated gradient background */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary via-secondary to-primary bg-[length:200%_100%] animate-gradient-x" />
          
          {/* Shimmer effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
          
          {/* Glow effect */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-r from-primary/50 via-secondary/50 to-primary/50 blur-xl" />
          
          {/* Border glow */}
          <div className="absolute inset-0 rounded-xl border border-white/20 group-hover:border-white/40 transition-colors duration-300" />
          
          {/* Button content */}
          <span className="relative z-10 flex items-center justify-center gap-2 text-white">
            {isLoading ? (
              <>
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Signing in...
              </>
            ) : (
              <>
                <Sparkles size={20} className="group-hover:animate-pulse" />
                Log In
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform duration-300" />
              </>
            )}
          </span>
          
          {/* Particle effects on hover */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-4 w-1 h-1 bg-white/60 rounded-full opacity-0 group-hover:opacity-100 group-hover:animate-ping" />
            <div className="absolute top-1/2 right-4 w-1 h-1 bg-white/60 rounded-full opacity-0 group-hover:opacity-100 group-hover:animate-ping animation-delay-200" />
            <div className="absolute top-1/4 left-1/4 w-0.5 h-0.5 bg-white/40 rounded-full opacity-0 group-hover:opacity-100 group-hover:animate-ping animation-delay-300" />
            <div className="absolute bottom-1/4 right-1/4 w-0.5 h-0.5 bg-white/40 rounded-full opacity-0 group-hover:opacity-100 group-hover:animate-ping animation-delay-400" />
          </div>
        </button>
      </form>

      {/* Footer */}
      <p className="text-center text-sm text-gray-400">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="text-primary font-semibold hover:text-secondary transition-colors">
          Sign up
        </Link>
      </p>
    </div>
  );
}

function LoginFormSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="text-center">
        <div className="h-9 bg-gray-800 rounded-full w-48 mx-auto mb-2"></div>
        <div className="h-5 bg-gray-800 rounded-full w-64 mx-auto"></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="h-14 bg-gray-800 rounded-xl"></div>
        <div className="h-14 bg-gray-800 rounded-xl"></div>
      </div>
      <div className="h-14 bg-gray-800 rounded-xl"></div>
      <div className="h-14 bg-gray-800 rounded-xl"></div>
      <div className="h-14 bg-gray-800 rounded-xl"></div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFormSkeleton />}>
      <LoginForm />
    </Suspense>
  );
}
