/**
 * Copyright by Calmic Sdn Bhd
 *
 * GigHalal Registration Page
 * Supports: Email/Password, Facebook, Google, Apple, WhatsApp OTP
 * Localized in Bahasa Melayu for Malaysian users.
 */

import { useState, useCallback } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { PageMeta } from "@/components/PageMeta";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { WhatsAppOTPDialog } from "@/components/WhatsAppOTPDialog";

// ---------------------------------------------------------------------------
// Social login SVG icons (inline to avoid external dependencies)
// ---------------------------------------------------------------------------

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

function AppleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.52-3.23 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </svg>
  );
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Registration Page Component
// ---------------------------------------------------------------------------

export default function GigRegister() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Form state
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [accountType, setAccountType] = useState("freelancer");
  const [socsoAutoRegister, setSocsoAutoRegister] = useState(false);
  const [showWhatsApp, setShowWhatsApp] = useState(false);

  // Check URL for error from OAuth redirect
  const urlParams = new URLSearchParams(window.location.search);
  const oauthError = urlParams.get("error");

  // Query available providers
  const { data: providerData } = useQuery({
    queryKey: ["gig-auth-providers"],
    queryFn: async () => {
      const res = await fetch("/api/gig/auth/providers");
      return res.json();
    },
    staleTime: 60_000,
  });

  const providers = providerData?.providers || {
    email: true,
    google: true,
    facebook: false,
    apple: false,
    whatsapp: true,
  };

  // Email/password registration mutation
  const registerMutation = useMutation({
    mutationFn: async (data: {
      username: string;
      email: string;
      password: string;
      accountType: string;
      socsoAutoRegister: boolean;
    }) => {
      const res = await fetch("/api/gig/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Pendaftaran gagal");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Pendaftaran berjaya!",
        description: `Selamat datang, ${data.user.username}!`,
      });
      setLocation("/gig/dashboard");
    },
    onError: (error: Error) => {
      toast({
        title: "Pendaftaran gagal",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username && password) {
      registerMutation.mutate({
        username,
        email,
        password,
        accountType,
        socsoAutoRegister,
      });
    }
  };

  // Social login redirect handlers
  const handleSocialLogin = useCallback(
    (provider: "facebook" | "apple" | "google") => {
      const params = new URLSearchParams({
        accountType,
        socso: socsoAutoRegister.toString(),
      });
      window.location.href = `/api/gig/auth/${provider}?${params}`;
    },
    [accountType, socsoAutoRegister]
  );

  const handleWhatsAppSuccess = useCallback(() => {
    setShowWhatsApp(false);
    toast({
      title: "Log masuk berjaya!",
      description: "Anda telah log masuk melalui WhatsApp.",
    });
    setLocation("/gig/dashboard");
  }, [setLocation, toast]);

  // Map OAuth error codes to Malay messages
  const errorMessages: Record<string, string> = {
    facebook_denied: "Log masuk Facebook dibatalkan. Cuba lagi atau gunakan kaedah lain.",
    facebook_token_failed: "Pengesahan Facebook gagal. Sila cuba lagi.",
    facebook_profile_failed: "Tidak dapat mendapatkan profil Facebook.",
    facebook_server_error: "Ralat pelayan semasa log masuk Facebook.",
    apple_denied: "Log masuk Apple dibatalkan.",
    apple_token_failed: "Pengesahan Apple gagal. Sila cuba lagi.",
    apple_server_error: "Ralat pelayan semasa log masuk Apple.",
    invalid_state: "Sesi tamat tempoh. Sila cuba lagi.",
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <PageMeta
        title="Daftar - GigHalal"
        description="Daftar akaun GigHalal untuk mula mencari atau menawarkan gig halal di Malaysia."
        keywords="gig, halal, freelance, Malaysia, daftar"
        url="https://gighala.calmic.com.my/daftar"
      />

      <Card className="w-full max-w-md shadow-xl border-0">
        <CardHeader className="text-center pb-2">
          {/* GigHalal brand */}
          <div className="mx-auto mb-3 w-16 h-16 rounded-2xl bg-emerald-600 flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-2xl">GH</span>
          </div>
          <CardTitle className="text-2xl font-bold text-emerald-800 dark:text-emerald-400">
            Daftar Akaun
          </CardTitle>
          <CardDescription className="text-base">
            Sertai GigHalal dan mula mendapatkan gig hari ini
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          {/* OAuth error alert */}
          {oauthError && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 text-sm text-red-700 dark:text-red-300">
              {errorMessages[oauthError] || "Ralat semasa log masuk. Sila cuba lagi."}
            </div>
          )}

          {/* ============================================================ */}
          {/* Social Login Buttons                                         */}
          {/* ============================================================ */}
          <div className="space-y-3">
            {/* Facebook — primary social for Malaysia */}
            {providers.facebook && (
              <Button
                type="button"
                variant="outline"
                className="w-full h-12 text-base font-medium bg-[#1877F2] hover:bg-[#166FE5] text-white border-0 hover:text-white"
                onClick={() => handleSocialLogin("facebook")}
              >
                <FacebookIcon className="w-5 h-5 mr-3" />
                Daftar dengan Facebook
              </Button>
            )}

            {/* Google — already partially implemented */}
            {providers.google && (
              <Button
                type="button"
                variant="outline"
                className="w-full h-12 text-base font-medium bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-200 dark:border-gray-600"
                onClick={() => handleSocialLogin("google")}
              >
                <GoogleIcon className="w-5 h-5 mr-3" />
                Daftar dengan Google
              </Button>
            )}

            {/* WhatsApp OTP — very popular in Malaysia */}
            {providers.whatsapp && (
              <Button
                type="button"
                variant="outline"
                className="w-full h-12 text-base font-medium bg-[#25D366] hover:bg-[#20BD5A] text-white border-0 hover:text-white"
                onClick={() => setShowWhatsApp(true)}
              >
                <WhatsAppIcon className="w-5 h-5 mr-3" />
                Log masuk dengan WhatsApp
              </Button>
            )}

            {/* Apple — for iOS users */}
            {providers.apple && (
              <Button
                type="button"
                variant="outline"
                className="w-full h-12 text-base font-medium bg-black hover:bg-gray-900 text-white border-0 hover:text-white"
                onClick={() => handleSocialLogin("apple")}
              >
                <AppleIcon className="w-5 h-5 mr-3" />
                Daftar dengan Apple
              </Button>
            )}
          </div>

          {/* Divider */}
          <div className="relative">
            <Separator />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-900 px-3 text-sm text-muted-foreground">
              ATAU
            </span>
          </div>

          {/* ============================================================ */}
          {/* Email/Password Form                                          */}
          {/* ============================================================ */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div className="space-y-1.5">
              <Label htmlFor="username" className="text-sm font-medium">
                Nama Pengguna
              </Label>
              <Input
                id="username"
                type="text"
                placeholder="cth: ahmad_freelancer"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={registerMutation.isPending}
                autoComplete="username"
                className="h-11"
              />
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium">
                Emel
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="cth: ahmad@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={registerMutation.isPending}
                autoComplete="email"
                className="h-11"
              />
            </div>

            {/* Account Type */}
            <div className="space-y-1.5">
              <Label htmlFor="accountType" className="text-sm font-medium">
                Jenis Akaun
              </Label>
              <Select
                value={accountType}
                onValueChange={setAccountType}
                disabled={registerMutation.isPending}
              >
                <SelectTrigger id="accountType" className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="freelancer">Freelancer</SelectItem>
                  <SelectItem value="employer">Majikan</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium">
                Kata Laluan
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Sekurang-kurangnya 8 aksara"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={registerMutation.isPending}
                  autoComplete="new-password"
                  className="h-11 pr-10"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  aria-label={showPassword ? "Sembunyikan kata laluan" : "Tunjukkan kata laluan"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* SOCSO Checkbox */}
            <div className="flex items-start space-x-3 pt-1">
              <Checkbox
                id="socso"
                checked={socsoAutoRegister}
                onCheckedChange={(checked) =>
                  setSocsoAutoRegister(checked === true)
                }
                disabled={registerMutation.isPending}
                className="mt-0.5"
              />
              <Label
                htmlFor="socso"
                className="text-sm leading-snug text-muted-foreground cursor-pointer"
              >
                Saya setuju untuk mendaftar caruman SOCSO secara automatik bagi
                setiap gig yang diselesaikan.
              </Label>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              className="w-full h-12 text-base font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={
                registerMutation.isPending || !username || !password
              }
            >
              {registerMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Mendaftar...
                </>
              ) : (
                "Daftar Sekarang"
              )}
            </Button>
          </form>

          {/* Login link */}
          <p className="text-center text-sm text-muted-foreground pt-2">
            Sudah ada akaun?{" "}
            <a
              href="/gig/login"
              className="font-medium text-emerald-600 hover:text-emerald-700 underline-offset-4 hover:underline"
            >
              Log Masuk
            </a>
          </p>
        </CardContent>
      </Card>

      {/* WhatsApp OTP Dialog */}
      <WhatsAppOTPDialog
        open={showWhatsApp}
        onOpenChange={setShowWhatsApp}
        accountType={accountType}
        socsoAutoRegister={socsoAutoRegister}
        onSuccess={handleWhatsAppSuccess}
      />
    </div>
  );
}
