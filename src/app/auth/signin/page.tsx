"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { FileText } from "lucide-react";

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/app";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Invalid email or password");
    } else {
      router.push(callbackUrl);
      router.refresh();
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-black text-white">
            <FileText className="size-6" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-black">
            Ajaia
          </h1>
          <p className="text-sm text-zinc-500">Sign in to your account</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
        >
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-500">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="alice@example.com"
              className="flex h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-base text-black transition-colors placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none sm:text-sm"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-500">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="flex h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-base text-black transition-colors placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none sm:text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="h-11 w-full rounded-xl bg-black px-4 text-sm font-medium text-white transition-colors hover:bg-zinc-800 active:translate-y-px disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div className="rounded-xl bg-zinc-100 p-4 text-sm text-zinc-600">
          <p className="font-medium text-black">Demo accounts</p>
          <p className="mt-1">
            alice@example.com · bob@example.com · carol@example.com ·
            dave@example.com
          </p>
          <p className="mt-1 text-zinc-500">Password: password</p>
        </div>

        <p className="text-center text-sm text-zinc-500">
          Don&apos;t have an account?{" "}
          <Link
            href="/auth/signup"
            className="font-medium text-black hover:underline"
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense>
      <SignInForm />
    </Suspense>
  );
}
