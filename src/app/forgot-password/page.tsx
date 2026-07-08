"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EnvelopeSimple, ArrowLeft } from "@phosphor-icons/react";
import toast from "react-hot-toast";
import Link from "next/link";

import { adminForgotPassword } from "@/app/actions/admin-auth";
import { useTransition } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await adminForgotPassword(formData);
      setIsLoading(false);
      if (result?.error) {
        toast.error(result.error);
      } else {
        setIsSuccess(true);
        toast.success("Check your email for reset instructions.");
      }
    });
  };

  return (
    <div className="flex min-h-[100dvh] items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8 rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
            Forgot Password
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            {isSuccess
              ? "We've sent a password reset link to your email."
              : "Enter your email address to receive a reset link."}
          </p>
        </div>

        {!isSuccess ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label
                className="text-sm font-medium text-slate-700 dark:text-slate-300"
                htmlFor="email"
              >
                Email Address
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <EnvelopeSimple size={18} />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="block w-full rounded-lg border-0 py-2.5 pl-10 pr-3 text-slate-900 ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-primary dark:bg-slate-800 dark:text-white dark:ring-slate-700 sm:text-sm sm:leading-6"
                  placeholder="admin@krps.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || isPending}
              className="flex w-full justify-center rounded-lg bg-primary px-3 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-70 disabled:cursor-not-allowed transition-colors active:scale-[0.98]"
            >
              {isLoading || isPending ? "Sending..." : "Send Reset Link"}
            </button>
          </form>
        ) : (
          <div className="flex justify-center pt-4">
            <Link
              href="/login"
              className="flex items-center gap-2 text-sm font-medium text-primary hover:text-primary-hover dark:text-primary dark:hover:text-primary-hover"
            >
              <ArrowLeft size={16} />
              Return to Login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
