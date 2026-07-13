"use client";

import { useEffect, useState, useTransition, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import Link from "next/link";
import toast from "react-hot-toast";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const router = useRouter();

  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (searchParams.get("reason") === "expired") {
      setError("Your session has expired. Please sign in again.");
    }
  }, [searchParams]);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setIsLoading(true);

    let hasError = false;
    const newFieldErrors: typeof fieldErrors = {};

    if (!email) {
      newFieldErrors.email = "Email address is required.";
      hasError = true;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newFieldErrors.email = "Please enter a valid email address.";
      hasError = true;
    }

    if (!password) {
      newFieldErrors.password = "Password is required.";
      hasError = true;
    }

    if (hasError) {
      setFieldErrors(newFieldErrors);
      setIsLoading(false);
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });

        const data = await res.json();
        setIsLoading(false);

        if (!res.ok) {
          const errorMsgs = Array.isArray(data.message)
            ? data.message
            : (data.error?.message ? [data.error.message] : [data.message || "Invalid credentials"]);
          const backendFieldErrors: typeof fieldErrors = {};
          let genericError: string | null = null;

          errorMsgs.forEach((msg: string) => {
            const lowercaseMsg = msg.toLowerCase();
            if (lowercaseMsg.includes("email")) {
              backendFieldErrors.email = msg;
            } else if (lowercaseMsg.includes("password")) {
              backendFieldErrors.password = msg;
            } else {
              genericError = msg;
            }
          });

          if (Object.keys(backendFieldErrors).length > 0) {
            setFieldErrors(backendFieldErrors);
          }
          if (genericError) {
            setError(genericError);
          }
        } else {
          toast.success("Welcome back!");
          router.push('/dashboard');
        }
      } catch (err: any) {
        setIsLoading(false);
        setError("Failed to connect to the server.");
      }
    });
  };

  return (
    <div className="flex min-h-[100dvh] items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8 rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
            Clinical Portal
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Sign in to manage patient assessments
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-950/30 dark:text-red-400 rounded-xl border border-red-200 dark:border-red-900/50">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="email">
                Email Address
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Mail className="w-4.5 h-4.5" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  className={`block w-full rounded-lg border-0 py-2.5 pl-10 pr-3 text-slate-900 ring-1 ring-inset placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-primary dark:bg-slate-800 dark:text-white sm:text-sm sm:leading-6 ${fieldErrors.email
                    ? "ring-red-300 focus:ring-red-500"
                    : "ring-slate-300 focus:ring-primary dark:ring-slate-700"
                    }`}
                  placeholder="admin@krps.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              {fieldErrors.email && (
                <p className="text-xs text-red-600 mt-1" role="alert">
                  {fieldErrors.email}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="password">
                  Password
                </label>
              </div>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Lock className="w-4.5 h-4.5" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  className={`block w-full rounded-lg border-0 py-2.5 pl-10 pr-10 text-slate-900 ring-1 ring-inset placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-primary dark:bg-slate-800 dark:text-white sm:text-sm sm:leading-6 ${fieldErrors.password
                    ? "ring-red-300 focus:ring-red-500"
                    : "ring-slate-300 focus:ring-primary dark:ring-slate-700"
                    }`}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="text-xs text-red-600 mt-1" role="alert">
                  {fieldErrors.password}
                </p>
              )}
            </div>
            <div className="flex justify-end">
              <Link href="/forgot-password" className="text-sm font-medium text-primary hover:text-primary-hover dark:text-primary dark:hover:text-primary-hover">
                Forgot password?
              </Link>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || isPending}
            className="flex w-full justify-center rounded-lg bg-primary px-3 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-70 disabled:cursor-not-allowed transition-colors active:scale-[0.98]"
          >
            {isLoading || isPending ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-[100dvh] items-center justify-center p-4">
        <div className="text-slate-500">Loading login...</div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
