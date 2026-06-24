/**
 * Copyright by Calmic Sdn Bhd
 */

import { Link } from "wouter";
import { Github, Twitter, Mail } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

export function Footer() {
  const { language } = useLanguage();
  const currentYear = new Date().getFullYear();

  const content = {
    en: {
      about: "About",
      disclaimer: "Disclaimer",
      blog: "Blog",
      contact: "Contact Us",
      madeWith: "Made with",
      by: "by",
      rights: "All rights reserved."
    },
    ms: {
      about: "Perihal",
      disclaimer: "Penafian",
      blog: "Blog",
      contact: "Hubungi Kami",
      madeWith: "Dibuat dengan",
      by: "oleh",
      rights: "Hak cipta terpelihara."
    }
  };

  const currentContent = content[language as keyof typeof content] || content.en;

  return (
    <footer className="w-full border-t bg-background mt-12">
      <div className="container mx-auto px-4 py-8">
        {/* Footer Links and Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-6">
          {/* About Section */}
          <div>
            <h3 className="font-semibold text-lg mb-3">MyParliament Dashboard</h3>
            <p className="text-sm text-muted-foreground">
              {language === 'ms'
                ? 'Platform percuma untuk menjejaki aktiviti parlimen, kehadiran MP, dan banyak lagi.'
                : 'A free platform to track parliamentary activity, MP attendance, and more.'}
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-lg mb-3">
              {language === 'ms' ? 'Pautan Pantas' : 'Quick Links'}
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/disclaimer" className="text-muted-foreground hover:text-primary transition-colors">
                  {currentContent.disclaimer}
                </Link>
              </li>
              <li>
                <Link href="/blog" className="text-muted-foreground hover:text-primary transition-colors">
                  {currentContent.blog}
                </Link>
              </li>
              <li>
                <a
                  href="https://gighala.calmic.com.my?utm_source=myparliament&utm_medium=footer&utm_campaign=cross_promo"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  GigHala
                </a>
              </li>
            </ul>
          </div>

          {/* Contact Section */}
          <div>
            <h3 className="font-semibold text-lg mb-3">{currentContent.contact}</h3>
            <div className="flex space-x-4">
              <a
                href="mailto:contact@myparliament.my"
                className="text-muted-foreground hover:text-primary transition-colors"
                aria-label="Email"
              >
                <Mail className="h-5 w-5" />
              </a>
              <a
                href="https://twitter.com/myparliament"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors"
                aria-label="Twitter"
              >
                <Twitter className="h-5 w-5" />
              </a>
              <a
                href="https://github.com/hamkasu"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors"
                aria-label="GitHub"
              >
                <Github className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t pt-6 text-center text-sm text-muted-foreground">
          <p>
            {currentContent.madeWith} ❤️ {currentContent.by} <span className="font-semibold">CALMIC SDN. BHD.</span>
          </p>
          <p className="mt-1">
            © {currentYear} MyParliament Dashboard. {currentContent.rights}
          </p>
        </div>
      </div>
    </footer>
  );
}
