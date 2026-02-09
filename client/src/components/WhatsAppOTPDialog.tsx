/**
 * Copyright by Calmic Sdn Bhd
 *
 * WhatsApp OTP Login Dialog
 * Two-step flow: enter phone number → receive & enter 6-digit code
 * Localized in Bahasa Melayu.
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface WhatsAppOTPDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountType: string;
  socsoAutoRegister: boolean;
  onSuccess: () => void;
}

type Step = "phone" | "otp";

export function WhatsAppOTPDialog({
  open,
  onOpenChange,
  accountType,
  socsoAutoRegister,
  onSuccess,
}: WhatsAppOTPDialogProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [maskedPhone, setMaskedPhone] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setStep("phone");
      setPhone("");
      setOtp(["", "", "", "", "", ""]);
    }
  }, [open]);

  // Request OTP mutation
  const requestOTP = useMutation({
    mutationFn: async (phoneNumber: string) => {
      const res = await fetch("/api/gig/auth/whatsapp/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: phoneNumber,
          accountType,
          socsoAutoRegister,
        }),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Gagal menghantar OTP");
      }
      return res.json();
    },
    onSuccess: (data) => {
      setMaskedPhone(data.phone || phone);
      setStep("otp");
      // Focus first OTP input after render
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    },
    onError: (error: Error) => {
      toast({
        title: "Gagal",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Verify OTP mutation
  const verifyOTP = useMutation({
    mutationFn: async (code: string) => {
      const res = await fetch("/api/gig/auth/whatsapp/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          code,
          accountType,
          socsoAutoRegister,
        }),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Kod OTP tidak sah");
      }
      return res.json();
    },
    onSuccess: () => {
      onSuccess();
    },
    onError: (error: Error) => {
      toast({
        title: "Pengesahan gagal",
        description: error.message,
        variant: "destructive",
      });
      // Clear OTP and refocus
      setOtp(["", "", "", "", "", ""]);
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    },
  });

  const handlePhoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.trim()) {
      requestOTP.mutate(phone.trim());
    }
  };

  // Handle individual OTP digit input
  const handleOtpChange = useCallback(
    (index: number, value: string) => {
      // Only accept digits
      const digit = value.replace(/\D/g, "").slice(-1);
      const newOtp = [...otp];
      newOtp[index] = digit;
      setOtp(newOtp);

      // Auto-advance to next input
      if (digit && index < 5) {
        otpRefs.current[index + 1]?.focus();
      }

      // Auto-submit when all 6 digits entered
      if (digit && index === 5) {
        const code = newOtp.join("");
        if (code.length === 6) {
          verifyOTP.mutate(code);
        }
      }
    },
    [otp, verifyOTP]
  );

  // Handle backspace in OTP inputs
  const handleOtpKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent) => {
      if (e.key === "Backspace" && !otp[index] && index > 0) {
        otpRefs.current[index - 1]?.focus();
      }
    },
    [otp]
  );

  // Handle paste into OTP
  const handleOtpPaste = useCallback(
    (e: React.ClipboardEvent) => {
      e.preventDefault();
      const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
      if (pasted.length > 0) {
        const newOtp = [...otp];
        for (let i = 0; i < pasted.length && i < 6; i++) {
          newOtp[i] = pasted[i];
        }
        setOtp(newOtp);

        // Focus the next empty input or the last one
        const nextEmpty = newOtp.findIndex((d) => !d);
        if (nextEmpty >= 0) {
          otpRefs.current[nextEmpty]?.focus();
        } else {
          otpRefs.current[5]?.focus();
          // Auto-submit
          const code = newOtp.join("");
          if (code.length === 6) {
            verifyOTP.mutate(code);
          }
        }
      }
    },
    [otp, verifyOTP]
  );

  const isLoading = requestOTP.isPending || verifyOTP.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-xl">
            {step === "phone"
              ? "Log Masuk dengan WhatsApp"
              : "Masukkan Kod OTP"}
          </DialogTitle>
          <DialogDescription className="text-center">
            {step === "phone"
              ? "Masukkan nombor telefon anda untuk menerima kod pengesahan melalui WhatsApp."
              : `Kod 6 digit telah dihantar ke WhatsApp ${maskedPhone}. Kod sah selama 5 minit.`}
          </DialogDescription>
        </DialogHeader>

        {step === "phone" ? (
          /* ====== Step 1: Phone Number ====== */
          <form onSubmit={handlePhoneSubmit} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label htmlFor="wa-phone" className="text-sm font-medium">
                Nombor Telefon
              </Label>
              <div className="flex gap-2">
                <div className="flex items-center px-3 bg-muted rounded-md text-sm font-medium min-w-[60px] justify-center">
                  +60
                </div>
                <Input
                  id="wa-phone"
                  type="tel"
                  placeholder="12-345 6789"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={isLoading}
                  autoFocus
                  className="h-11"
                  autoComplete="tel"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Contoh: 012-345 6789 atau 011-1234 5678
              </p>
            </div>

            <Button
              type="submit"
              className="w-full h-11 bg-[#25D366] hover:bg-[#20BD5A] text-white font-medium"
              disabled={isLoading || !phone.trim()}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Menghantar...
                </>
              ) : (
                "Hantar Kod OTP"
              )}
            </Button>
          </form>
        ) : (
          /* ====== Step 2: OTP Verification ====== */
          <div className="space-y-4 mt-2">
            {/* 6-digit OTP input */}
            <div className="flex justify-center gap-2" onPaste={handleOtpPaste}>
              {otp.map((digit, i) => (
                <Input
                  key={i}
                  ref={(el) => {
                    otpRefs.current[i] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  disabled={isLoading}
                  className="w-12 h-14 text-center text-xl font-bold"
                  aria-label={`Digit ${i + 1}`}
                />
              ))}
            </div>

            {/* Verify button */}
            <Button
              type="button"
              className="w-full h-11 bg-[#25D366] hover:bg-[#20BD5A] text-white font-medium"
              disabled={isLoading || otp.join("").length < 6}
              onClick={() => verifyOTP.mutate(otp.join(""))}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Mengesahkan...
                </>
              ) : (
                "Sahkan Kod"
              )}
            </Button>

            {/* Resend / Back */}
            <div className="flex justify-between text-sm">
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
                onClick={() => {
                  setStep("phone");
                  setOtp(["", "", "", "", "", ""]);
                }}
                disabled={isLoading}
              >
                Tukar nombor
              </button>
              <button
                type="button"
                className="text-emerald-600 hover:text-emerald-700 font-medium underline-offset-4 hover:underline"
                onClick={() => requestOTP.mutate(phone.trim())}
                disabled={isLoading}
              >
                Hantar semula kod
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
