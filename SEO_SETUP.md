# SEO Setup Guide for Malaysian Parliament MP Dashboard

## Overview
This guide explains the SEO enhancements implemented for the Malaysian Parliament MP Dashboard and provides step-by-step instructions for submitting your sitemap to Google Search Console.

## Implemented SEO Features

### 1. Sitemap.xml (✅ Implemented)
- **Location**: `https://myparliament.calmic.com.my/sitemap.xml`
- **Purpose**: Helps search engines discover and index all pages on your dashboard
- **Contents**:
  - Static pages (home, activity, hansard, attendance, allowances)
  - All 222 individual MP profile pages
  - Priority and change frequency indicators for each page

### 2. Robots.txt (✅ Implemented)
- **Location**: `https://myparliament.calmic.com.my/robots.txt`
- **Purpose**: Controls which pages search engines can crawl
- **Configuration**:
  - Allows crawling of all public pages
  - Blocks admin areas (/hansard-admin, /login, /api/)
  - Blocks AI bots (GPTBot, CCBot, anthropic-ai) from scraping government data
  - References sitemap location

### 3. Schema.org Structured Data (✅ Implemented)
- **Location**: Individual MP profile pages
- **Purpose**: Helps search engines understand government official data
- **Type**: JSON-LD with Person and GovernmentOrganization schemas
- **Benefits**:
  - Enhanced search results with rich snippets
  - Potential knowledge panel display
  - Better AI overview integration

### 4. Enhanced Meta Tags (✅ Implemented)
- **SEO Meta Description**: Emphasizes tracking MPs, voting records, and parliamentary activities
- **Keywords**: Includes relevant terms like "voting records", "MP dashboard", etc.
- **Canonical URL**: Points to production domain
- **Open Graph Tags**: Optimized for social media sharing

### 5. Landing Page Content (✅ Implemented)
- **SEO-optimized H1 heading**: "Malaysian Parliament MP Dashboard"
- **Descriptive paragraph**: Explains dashboard features and value
- **Key features list**: Highlights main functionalities

---

## Google Search Console Setup

### Step 1: Access Google Search Console
1. Go to [Google Search Console](https://search.google.com/search-console)
2. Sign in with your Google account

### Step 2: Add Your Property
1. Click **"+ Add Property"** in the top left
2. Choose **"URL prefix"** method
3. Enter: `https://myparliament.calmic.com.my`
4. Click **Continue**

### Step 3: Verify Ownership
Choose one of these verification methods:

#### Option A: HTML File Upload (Recommended)
1. Download the verification HTML file provided by Google
2. Upload it to your `client/public/` directory
3. It should be accessible at: `https://myparliament.calmic.com.my/google[xxxxx].html`
4. Click **Verify** in Google Search Console

#### Option B: HTML Meta Tag
1. Copy the meta tag provided by Google
2. Add it to `client/index.html` in the `<head>` section:
   ```html
   <meta name="google-site-verification" content="your-verification-code" />
   ```
3. Deploy the changes
4. Click **Verify** in Google Search Console

#### Option C: Google Analytics (If Already Using)
1. Ensure you have Google Analytics installed on your site
2. Use the same Google account for both Analytics and Search Console
3. Verification happens automatically

### Step 4: Submit Your Sitemap
1. Once verified, navigate to **Sitemaps** in the left sidebar (under "Indexing")
2. In the "Add a new sitemap" field, enter: `sitemap.xml`
3. Click **Submit**
4. You should see "Success" status within a few minutes

### Step 5: Monitor Indexing
1. **Coverage Report**: Check which pages are indexed
   - Go to **Coverage** under "Index" in the left sidebar
   - Monitor for errors, warnings, and valid pages

2. **Performance Report**: Track search visibility
   - Go to **Performance** in the left sidebar
   - View clicks, impressions, CTR, and average position

3. **URL Inspection**: Test individual URLs
   - Use the search bar at the top to inspect specific URLs
   - Request indexing for important pages

---

## Expected Indexing Timeline

- **Initial Crawl**: 1-3 days after sitemap submission
- **Full Indexing**: 1-4 weeks for all 227 pages
- **Regular Updates**: Google will automatically re-crawl based on sitemap's `<changefreq>` values

---

## Verification Checklist

Before submitting to Google Search Console, verify:

- [ ] Sitemap is accessible: `https://myparliament.calmic.com.my/sitemap.xml`
- [ ] Robots.txt is accessible: `https://myparliament.calmic.com.my/robots.txt`
- [ ] All MP profile pages load correctly (test a few samples)
- [ ] Meta tags are present in page source (right-click → View Page Source)
- [ ] Schema.org JSON-LD appears on MP profile pages
- [ ] Canonical URLs point to production domain

---

## Testing Your SEO Implementation

### 1. Test Sitemap
```bash
curl https://myparliament.calmic.com.my/sitemap.xml
```
Should return XML with all pages listed.

### 2. Test Robots.txt
```bash
curl https://myparliament.calmic.com.my/robots.txt
```
Should show crawling directives.

### 3. Validate Schema.org
1. Visit any MP profile page
2. Use [Google Rich Results Test](https://search.google.com/test/rich-results)
3. Enter the MP profile URL
4. Verify "Person" schema is detected

### 4. Validate Sitemap Format
1. Use [XML Sitemap Validator](https://www.xml-sitemaps.com/validate-xml-sitemap.html)
2. Enter your sitemap URL
3. Check for format errors

---

## Additional SEO Resources

- [Google Search Console Help](https://support.google.com/webmasters/)
- [Schema.org Person Documentation](https://schema.org/Person)
- [Sitemap Protocol](https://www.sitemaps.org/protocol.html)
- [Robots.txt Specification](https://developers.google.com/search/docs/crawling-indexing/robots/intro)

---

## Troubleshooting

### Sitemap Not Found
- Verify the endpoint is working in development
- Check that the route is not blocked by robots.txt
- Ensure the server is returning `Content-Type: application/xml`

### Pages Not Indexing
- Check Google Search Console Coverage report for errors
- Verify pages are not blocked by robots.txt
- Ensure pages return 200 status code
- Check for `noindex` meta tags (should not be present on public pages)

### Schema Not Detected
- Validate JSON-LD syntax using [Schema Markup Validator](https://validator.schema.org/)
- Ensure script tag is properly rendered in page HTML
- Check browser console for JavaScript errors

---

## Maintenance

### Weekly
- Monitor Google Search Console for crawl errors
- Check indexing status of new pages

### Monthly
- Review search performance metrics
- Update sitemap priority/frequency if needed
- Check for broken links reported by Search Console

### Quarterly
- Audit Schema.org implementation
- Review and update meta descriptions
- Analyze search query performance

---

*Last Updated: November 11, 2025*
