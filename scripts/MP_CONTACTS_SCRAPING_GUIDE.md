# MP Contact Information Scraping Guide

## Overview
This guide will help you scrape MP contact information from the Malaysian Parliament website and update your database.

## Why Use Replit?
The Malaysian Parliament website (https://www.parlimen.gov.my/ahli-dewan.html?uweb=dr&) may block automated requests from certain IPs or locations. Since you mentioned Replit can access the site, these scripts are designed to run there.

## Steps

### 1. Inspect the Parliament Website First

Before running the scraper, you need to:

1. Visit https://www.parlimen.gov.my/ahli-dewan.html?uweb=dr& in your browser
2. Right-click on the page and select "Inspect" or "View Page Source"
3. Find where the MP information is displayed (look for:
   - MP names
   - Email addresses (usually in `mailto:` links)
   - Phone numbers
   - Fax numbers
   - Office addresses
   - Social media links

4. Note the HTML structure:
   - What tags contain the MP cards? (e.g., `<div class="mp-card">`, `<tr>`, etc.)
   - What classes or IDs are used?
   - How is contact information structured?

### 2. Update the Scraper Selectors

Open `scripts/scrape-mp-contacts.js` and update the CSS selectors on **lines 35-45** based on what you found:

```javascript
// Example - adjust these based on actual HTML structure:
const name = $el.find('.mp-name, .nama, td:nth-child(1)').text().trim();
const email = $el.find('.mp-email, .emel, a[href^="mailto:"]').attr('href')?.replace('mailto:', '').trim();
const telephone = $el.find('.mp-tel, .telefon, .phone').text().trim();
// ... etc
```

Common patterns to look for:
- Email: `<a href="mailto:email@example.com">` → selector: `a[href^="mailto:"]`
- Phone: Look for class names like `.phone`, `.tel`, `.telefon`, `.contact-phone`
- Address: Look for class names like `.address`, `.alamat`, `.office-address`

### 3. Run the Scraper on Replit

```bash
# On Replit, run:
node scripts/scrape-mp-contacts.js
```

This will:
- Fetch the MP list page
- Extract contact information using your selectors
- Save the data to `mp-contacts-scraped.json`
- Show you a sample of the first 3 entries

### 4. Review the Scraped Data

Check the `mp-contacts-scraped.json` file:

```json
[
  {
    "name": "YB Dato' Sri Anwar Ibrahim",
    "constituency": "Tambun",
    "party": "PH",
    "email": "example@parlimen.gov.my",
    "telephone": "03-1234-5678",
    "fax": "03-1234-5679",
    "mobileNumber": "012-345-6789",
    "contactAddress": "...",
    "socialMedia": "https://facebook.com/..."
  }
]
```

### 5. Update Your Database

Once you're happy with the scraped data:

```bash
# Run the update script:
tsx scripts/update-mp-contacts.ts
```

This will:
- Read the scraped data
- Match each entry to an MP in your database (by name or constituency)
- Update the contact fields
- Show you a summary of updates

## Expected Output

```
=============================================================
MP Contact Information Update Script
=============================================================

Loading scraped MP contact data...
Found 222 contact records to process

✓ Updated Dato' Sri Anwar Ibrahim: email, telephone, contactAddress
✓ Updated Hannah Yeoh: email, telephone, fax
⚠ No match found for: John Doe (Unknown Constituency)
...

=============================================================
Update Summary:
=============================================================
✓ Successfully updated: 210
⚠ Not found in database: 8
✗ Errors: 4
Total processed: 222

✓ Contact update completed!
```

## Troubleshooting

### Issue: "No matches found" for many MPs

**Solution:** The name matching might be too strict. Check:
- Are titles included? (YB, Dato', etc.)
- Are names in the same language (English vs Malay)?
- Try adjusting the matching logic in `update-mp-contacts.ts`

### Issue: Scraped data is empty or incorrect

**Solution:** The CSS selectors are wrong. You need to:
1. Inspect the actual HTML structure of the Parliament website
2. Update the selectors in `scrape-mp-contacts.js`
3. Test with a small section first

### Issue: Website blocks the scraper

**Solution:**
- Add delays between requests: `await new Promise(r => setTimeout(r, 1000))`
- Use more realistic headers
- Try different User-Agent strings
- Consider scraping during off-peak hours

## Alternative: Manual Data Entry

If scraping doesn't work, you can manually create `mp-contacts-scraped.json`:

```json
[
  {
    "name": "Anwar Ibrahim",
    "constituency": "Tambun",
    "email": "anwar@parlimen.gov.my",
    "telephone": "03-1234-5678"
  }
]
```

Then run the update script to import it.

## Database Schema Reference

The following fields will be updated in the `mps` table:
- `email`: Email address
- `telephone`: Office telephone
- `fax`: Fax number
- `mobileNumber`: Mobile phone
- `contactAddress`: Office/contact address
- `serviceAddress`: Service center address
- `socialMedia`: Social media profile URL

## Next Steps

After updating the database:
1. Visit any MP profile page on your site
2. Check if the contact information displays correctly
3. The contact details appear in the profile header (lines 276-366 of MPProfile.tsx)
4. There's also a dedicated "Contact Information" card (lines 548-676)

## Support

If you need help:
1. Share the HTML structure of the Parliament website
2. Share a sample of the scraped data
3. Share any error messages from the update script
