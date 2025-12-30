import { Helmet } from "react-helmet-async";

interface PageMetaProps {
  title: string;
  description: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: string;
  structuredData?: any | any[]; // JSON-LD structured data
  ogImageWidth?: string;
  ogImageHeight?: string;
  locale?: string; // For hreflang support
  alternateLocale?: string;
  alternateUrl?: string;
}

export function PageMeta({
  title,
  description,
  keywords,
  image = "https://myparliament.calmic.com.my/android-chrome-512x512.png",
  url = "https://myparliament.calmic.com.my",
  type = "website",
  structuredData,
  ogImageWidth = "512",
  ogImageHeight = "512",
  locale = "en_MY",
  alternateLocale,
  alternateUrl,
}: PageMetaProps) {
  const fullTitle = `${title} | Malaysian Parliament Dashboard`;

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}
      <link rel="canonical" href={url} />

      {/* Language/Locale Tags */}
      <html lang={locale.split('_')[0]} />
      <meta property="og:locale" content={locale} />
      {alternateLocale && alternateUrl && (
        <>
          <meta property="og:locale:alternate" content={alternateLocale} />
          <link rel="alternate" hrefLang={alternateLocale.split('_')[0]} href={alternateUrl} />
        </>
      )}

      {/* Open Graph Meta Tags */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={image} />
      <meta property="og:image:width" content={ogImageWidth} />
      <meta property="og:image:height" content={ogImageHeight} />
      <meta property="og:site_name" content="Malaysian Parliament Dashboard" />

      {/* Twitter/X Card Meta Tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
      <meta name="twitter:site" content="@MyParliamentMY" />

      {/* WhatsApp/Facebook specific OG tags */}
      <meta property="og:image:alt" content={`${title} - Malaysian Parliament Dashboard`} />

      {/* PWA Meta Tags */}
      <meta name="theme-color" content="#1e40af" />
      <meta name="mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      <meta name="apple-mobile-web-app-title" content="MY Parliament" />

      {/* Structured Data (JSON-LD) */}
      {structuredData && (
        Array.isArray(structuredData) ? (
          structuredData.map((data, index) => (
            <script key={index} type="application/ld+json">
              {JSON.stringify(data)}
            </script>
          ))
        ) : (
          <script type="application/ld+json">
            {JSON.stringify(structuredData)}
          </script>
        )
      )}
    </Helmet>
  );
}
