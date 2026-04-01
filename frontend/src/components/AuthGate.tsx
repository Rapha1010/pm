"use client";

import { useEffect, useState, type FormEvent } from "react";

type AuthGateProps = {
  children: React.ReactNode;
};

const AUTH_STORAGE_KEY = "pm2-authenticated";
const VALID_USERNAME = "user";
const VALID_PASSWORD = "password";

export const AuthGate = ({ children }: AuthGateProps) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (stored === "true") {
      setIsAuthenticated(true);
    }
  }, []);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const isValid = username === VALID_USERNAME && password === VALID_PASSWORD;

    if (!isValid) {
      setError("Invalid credentials. Please try again.");
      return;
    }

    localStorage.setItem(AUTH_STORAGE_KEY, "true");
    setError("");
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    setIsAuthenticated(false);
    setUsername("");
    setPassword("");
    setError("");
  };

  if (!isAuthenticated) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-[var(--surface)]">
        <div className="pointer-events-none absolute left-0 top-0 h-[420px] w-[420px] -translate-x-1/3 -translate-y-1/3 rounded-full bg-[radial-gradient(circle,_rgba(32,157,215,0.22)_0%,_rgba(32,157,215,0.06)_55%,_transparent_70%)]" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-[520px] w-[520px] translate-x-1/4 translate-y-1/4 rounded-full bg-[radial-gradient(circle,_rgba(117,57,145,0.16)_0%,_rgba(117,57,145,0.05)_55%,_transparent_75%)]" />

        <main className="relative mx-auto flex min-h-screen max-w-[1100px] items-center px-6 py-12">
          <div className="w-full max-w-xl rounded-[32px] border border-[var(--stroke)] bg-white/90 p-8 shadow-[var(--shadow)] backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--gray-text)]">
              Project Management MVP
            </p>
            <h1 className="mt-3 font-display text-3xl font-semibold text-[var(--navy-dark)]">
              Sign in
            </h1>
            <p className="mt-3 text-sm leading-6 text-[var(--gray-text)]">
              Use the demo credentials to access the Kanban board.
            </p>
            <p className="mt-2 text-sm font-semibold text-[var(--primary-blue)]">
              Demo: user / password
            </p>

            <form className="mt-8 flex flex-col gap-5" onSubmit={handleSubmit}>
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="username"
                  className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--gray-text)]"
                >
                  Username
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  className="rounded-2xl border border-[var(--stroke)] bg-white px-4 py-3 text-sm text-[var(--navy-dark)] shadow-[0_8px_16px_rgba(3,33,71,0.08)] outline-none transition focus:border-[var(--primary-blue)]"
                  placeholder="user"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="password"
                  className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--gray-text)]"
                >
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="rounded-2xl border border-[var(--stroke)] bg-white px-4 py-3 text-sm text-[var(--navy-dark)] shadow-[0_8px_16px_rgba(3,33,71,0.08)] outline-none transition focus:border-[var(--primary-blue)]"
                  placeholder="password"
                />
              </div>
              {error && (
                <p className="text-sm font-semibold text-[var(--secondary-purple)]" role="alert">
                  {error}
                </p>
              )}
              <button
                type="submit"
                className="mt-2 rounded-full bg-[var(--secondary-purple)] px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white shadow-[0_12px_24px_rgba(117,57,145,0.25)] transition hover:translate-y-[-1px]"
              >
                Sign in
              </button>
            </form>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="absolute right-6 top-6 z-10 flex items-center gap-3 rounded-full border border-[var(--stroke)] bg-white/90 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--navy-dark)] shadow-[var(--shadow)] backdrop-blur">
        <span className="text-[var(--gray-text)]">Signed in</span>
        <button
          type="button"
          onClick={handleLogout}
          className="rounded-full border border-transparent px-3 py-1 text-xs font-semibold text-[var(--secondary-purple)] transition hover:border-[var(--secondary-purple)]"
        >
          Log out
        </button>
      </div>
      {children}
    </div>
  );
};
