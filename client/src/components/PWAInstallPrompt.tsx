/**
 * PWA Install Prompt Component
 * Shows install banner for Progressive Web App
 */

import { useState, useEffect } from "react";
import { X, Download, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check if mobile screen (max-width: 768px)
    const mobileMediaQuery = window.matchMedia('(max-width: 768px)');
    setIsMobile(mobileMediaQuery.matches);

    // Listen for screen size changes
    const handleResize = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches);
    };
    mobileMediaQuery.addEventListener('change', handleResize);

    // Check if already installed
    const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(isInStandaloneMode);

    // Check if mobile device (only show install prompt on mobile)
    const mobileCheck = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
      (typeof window !== 'undefined' && window.innerWidth <= 768 && 'ontouchstart' in window);
    setIsMobile(mobileCheck);

    // Don't show prompt on desktop
    if (!mobileCheck) {
      return;
    }

    // Check if iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(iOS);

    // Check if prompt was dismissed
    const dismissed = localStorage.getItem('pwa-prompt-dismissed');
    const dismissedDate = dismissed ? new Date(dismissed) : null;
    const daysSinceDismissal = dismissedDate
      ? (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24)
      : 999;

    // Show prompt if not installed, not dismissed, or dismissed more than 7 days ago
    if (!isInStandaloneMode && (!dismissed || daysSinceDismissal > 7)) {
      if (iOS) {
        // Show iOS-specific instructions after 3 seconds
        const timer = setTimeout(() => setShowPrompt(true), 3000);
        return () => {
          clearTimeout(timer);
          mobileMediaQuery.removeEventListener('change', handleResize);
        };
      }
    }

    // Handle beforeinstallprompt event (Android mobile only)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);

      // Show prompt after 3 seconds
      setTimeout(() => setShowPrompt(true), 3000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      mobileMediaQuery.removeEventListener('change', handleResize);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('PWA installed');
    } else {
      console.log('PWA install declined');
    }

    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-prompt-dismissed', new Date().toISOString());
  };

  // Don't show if already installed, hidden, or on desktop
  if (isStandalone || !showPrompt || !isMobile) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-sm">
      <Card className="p-4 shadow-2xl border-2 border-blue-500 bg-white">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
              <Smartphone className="h-6 w-6 text-blue-600" />
            </div>
          </div>

          <div className="flex-1">
            <h3 className="font-semibold text-sm mb-1">
              Install MyParliament App
            </h3>

            {isIOS ? (
              <p className="text-xs text-gray-600 mb-3">
                Tap <span className="inline-flex items-center mx-1">
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z" />
                  </svg>
                </span> then "Add to Home Screen"
              </p>
            ) : (
              <p className="text-xs text-gray-600 mb-3">
                Install our app for quick access and offline support
              </p>
            )}

            <div className="flex gap-2">
              {!isIOS && deferredPrompt && (
                <Button
                  size="sm"
                  onClick={handleInstall}
                  className="flex-1"
                >
                  <Download className="h-3 w-3 mr-1" />
                  Install
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={handleDismiss}
                className={isIOS || !deferredPrompt ? 'flex-1' : ''}
              >
                {isIOS || !deferredPrompt ? 'Got it' : 'Later'}
              </Button>
            </div>
          </div>

          <button
            onClick={handleDismiss}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </Card>
    </div>
  );
}
