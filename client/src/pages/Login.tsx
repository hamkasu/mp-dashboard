/**
 * Copyright by Calmic Sdn Bhd
 *
 * Login / Register page — combined tab-based auth page.
 *
 * After successful login or register, redirects to `?next=` param
 * (default: "/account").  Pricing page sends users here with
 * `?next=/pricing` so they land back on the upgrade flow.
 */

import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, ArrowLeft } from "lucide-react";

// ── API helpers ───────────────────────────────────────────────────────────────

async function apiPost<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data as T;
}

function getNextUrl(): string {
  const params = new URLSearchParams(window.location.search);
  const next = params.get("next");
  // Only allow relative paths (no protocol to prevent open-redirect)
  if (next && next.startsWith("/") && !next.startsWith("//")) return next;
  return "/account";
}

// ── Login form ────────────────────────────────────────────────────────────────

function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      apiPost<{ user: { id: string } }>("/api/auth/login", { email, password }),
    onSuccess,
    onError: (e: Error) => setError(e.message),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    mutation.mutate();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="login-email">Email</Label>
        <Input
          id="login-email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={mutation.isPending}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="login-password">Password</Label>
        <Input
          id="login-password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={mutation.isPending}
        />
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Button type="submit" className="w-full" disabled={mutation.isPending}>
        {mutation.isPending ? (
          <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Signing in…</>
        ) : (
          "Sign in"
        )}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        <button
          type="button"
          className="underline underline-offset-2 hover:no-underline"
          onClick={() => {/* TODO: forgot password flow */}}
        >
          Forgot your password?
        </button>
      </p>
    </form>
  );
}

// ── Register form ─────────────────────────────────────────────────────────────

function RegisterForm({ onSuccess }: { onSuccess: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const mutation = useMutation({
    mutationFn: () =>
      apiPost<{ message: string }>("/api/auth/register", { name, email, password }),
    onSuccess: (data) => {
      // Server auto-logs the user in after register; treat as immediate success
      if (data.message?.includes("verify")) {
        setSuccess(true); // email verification required
      } else {
        onSuccess();
      }
    },
    onError: (e: Error) => setError(e.message),
  });

  if (success) {
    return (
      <Alert>
        <AlertDescription>
          Account created! Check your email to verify your address, then sign in.
        </AlertDescription>
      </Alert>
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    mutation.mutate();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="reg-name">Full name</Label>
        <Input
          id="reg-name"
          type="text"
          autoComplete="name"
          placeholder="Ahmad bin Abdullah"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          disabled={mutation.isPending}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="reg-email">Email</Label>
        <Input
          id="reg-email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={mutation.isPending}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="reg-password">Password</Label>
        <Input
          id="reg-password"
          type="password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={8}
          required
          disabled={mutation.isPending}
        />
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Button type="submit" className="w-full" disabled={mutation.isPending}>
        {mutation.isPending ? (
          <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating account…</>
        ) : (
          "Create account"
        )}
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        By creating an account you agree to our{" "}
        <a href="/disclaimer" className="underline underline-offset-2 hover:no-underline">
          Terms of Service
        </a>
        .
      </p>
    </form>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Login() {
  const [, setLocation] = useLocation();
  const qc = useQueryClient();

  // Default to "login" tab; show "register" if ?tab=register
  const defaultTab =
    new URLSearchParams(window.location.search).get("tab") === "register"
      ? "register"
      : "login";

  function handleAuthSuccess() {
    // Bust the auth cache so useAuth() re-fetches immediately
    qc.invalidateQueries({ queryKey: ["/api/auth/me"] });
    setLocation(getNextUrl());
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Back link */}
        <Button
          variant="ghost"
          size="sm"
          className="gap-1 text-muted-foreground"
          onClick={() => setLocation("/")}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Button>

        <Card>
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-2xl">MyParliament</CardTitle>
            <CardDescription>Sign in or create an account to continue</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue={defaultTab}>
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="login">Sign in</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>
              <TabsContent value="login">
                <LoginForm onSuccess={handleAuthSuccess} />
              </TabsContent>
              <TabsContent value="register">
                <RegisterForm onSuccess={handleAuthSuccess} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Secure login · Your data is never shared
        </p>
      </div>
    </div>
  );
}
