import { useLanguage } from '@/i18n/LanguageContext';
import { Button } from '@/components/ui/button';
import { Languages } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Languages className="h-4 w-4" />
          <span className="hidden sm:inline">
            {language === 'en' ? 'English' : 'Bahasa Melayu'}
          </span>
          <span className="sm:hidden">
            {language === 'en' ? 'EN' : 'MS'}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => setLanguage('en')}
          className={language === 'en' ? 'bg-accent' : ''}
        >
          <span className="mr-2">🇬🇧</span>
          English
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setLanguage('ms')}
          className={language === 'ms' ? 'bg-accent' : ''}
        >
          <span className="mr-2">🇲🇾</span>
          Bahasa Melayu
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
