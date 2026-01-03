# MP Contact Form System Documentation

## Overview

The MP Contact Form system allows constituents to easily contact their Members of Parliament through the MyParliament website. The system includes message tracking, categorization, privacy controls, and an admin dashboard for MPs to manage their messages.

## Features

### 1. Contact Form for Constituents

**Location**: Available on every MP's profile card and detail page

**Fields**:
- **Your Name*** (required)
- **Your Email*** (required)
- **Phone Number** (optional)
- **Category*** (dropdown with 14 categories)
- **Subject*** (brief subject line)
- **Message*** (textarea for detailed message)
- **Privacy Checkbox**: Allow concern to be shared anonymously in public statistics

**Categories Available**:
1. General Inquiry
2. Flooding & Drainage
3. Education
4. Healthcare
5. Infrastructure
6. Housing
7. Employment
8. Safety & Crime
9. Environment
10. Transportation
11. Corruption
12. Youth & Sports
13. Poverty & Welfare
14. Other

**Features**:
- Email validation
- Direct email option (opens mailto: if MP email exists)
- Confirmation email sent to constituent
- Message logged in database
- Rate limited to prevent spam
- IP address and user agent tracking for abuse prevention

### 2. Message Counter Badge

**Location**: Displayed on MP profile cards next to party badge

**Features**:
- Shows total number of messages received
- Clickable badge that opens anonymized statistics
- Only appears if MP has received messages
- Real-time updates via React Query

**Example Display**: `📧 48 messages`

### 3. Anonymized Public Statistics

**Location**: Modal popup when clicking message counter badge

**Privacy Compliant**:
- ✅ Shows category breakdown with percentages
- ✅ Displays total message count
- ✅ Shows only aggregated data
- ❌ Does NOT show personal information
- ❌ Does NOT show full message contents
- ❌ Does NOT show sender names or contact details

**PDPA Compliance**: All data displayed publicly is anonymized and aggregated to comply with Malaysia's Personal Data Protection Act (PDPA).

**Example Display**:
```
Constituent Concerns for [MP Name]
Total: 48 messages

Flooding & Drainage    25%  ████████████░░░░░░░░  12 messages
Education              18%  █████████░░░░░░░░░░░   9 messages
Healthcare             15%  ███████░░░░░░░░░░░░░   7 messages
Infrastructure         12%  ██████░░░░░░░░░░░░░░   6 messages
...
```

### 4. MP Messages Admin Dashboard

**Location**: `/mp-messages-admin` (requires admin authentication)

**Features**:
- Select MP from dropdown
- Filter messages by status (All, Pending, Read, Replied, Resolved, Spam)
- View full message details (name, email, phone, subject, message)
- Mark messages as read
- Reply to messages (stores reply in database)
- Resolve messages
- Track response status and timestamps

**Message Statuses**:
- **Pending**: New message, not yet viewed
- **Read**: MP has viewed the message
- **Replied**: MP has sent a reply
- **Resolved**: Issue has been resolved
- **Spam**: Marked as spam

## Technical Implementation

### Database Schema

**Table**: `mp_contact_messages`

```sql
CREATE TABLE "mp_contact_messages" (
  "id" VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "mp_id" VARCHAR NOT NULL REFERENCES "mps"("id") ON DELETE CASCADE,

  -- Sender information
  "sender_name" TEXT NOT NULL,
  "sender_email" TEXT NOT NULL,
  "sender_phone" TEXT,

  -- Message content
  "subject" TEXT NOT NULL,
  "message" TEXT NOT NULL,

  -- Categorization
  "category" TEXT NOT NULL DEFAULT 'general',

  -- Status tracking
  "status" TEXT NOT NULL DEFAULT 'pending',

  -- Privacy and moderation
  "is_public" BOOLEAN NOT NULL DEFAULT false,
  "is_spam" BOOLEAN NOT NULL DEFAULT false,

  -- Response tracking
  "replied_at" TIMESTAMP,
  "replied_by" VARCHAR,
  "reply_message" TEXT,

  -- Metadata
  "ip_address" TEXT,
  "user_agent" TEXT,
  "email_sent" BOOLEAN NOT NULL DEFAULT false,

  -- Timestamps
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "read_at" TIMESTAMP,
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);
```

**Indexes**:
- `mp_id` - Fast lookup by MP
- `status` - Filter by status
- `category` - Group by category
- `created_at` - Sort by date
- `is_public` - Filter public messages

### API Endpoints

#### 1. Send Message to MP
```
POST /api/mps/:id/contact
```

**Request Body**:
```json
{
  "senderName": "John Doe",
  "senderEmail": "john@example.com",
  "senderPhone": "+60123456789",
  "subject": "Road repair needed",
  "message": "The road near my house needs urgent repairs...",
  "category": "infrastructure",
  "isPublic": true
}
```

**Response**:
```json
{
  "success": true,
  "emailSent": true,
  "messageId": "uuid-here",
  "message": "Your message has been sent to the MP's office.",
  "mpName": "MP Name",
  "mpEmail": "mp@example.com"
}
```

**Rate Limit**: 300 requests / 15 minutes (mutation rate limit)

#### 2. Get Message Statistics (Public)
```
GET /api/mps/:id/message-stats
```

**Response**:
```json
{
  "mpId": "uuid-here",
  "mpName": "MP Name",
  "total": 48,
  "byCategory": {
    "flooding_drainage": 12,
    "education": 9,
    "healthcare": 7,
    "infrastructure": 6,
    "general": 8,
    "other": 6
  }
}
```

#### 3. Get All Messages for MP (Admin Only)
```
GET /api/mps/:id/messages?status=pending&limit=50
```

**Authentication Required**: Yes (admin/MP)

**Query Parameters**:
- `status` (optional): Filter by status
- `limit` (optional): Limit number of results

**Response**:
```json
[
  {
    "id": "uuid-here",
    "mpId": "mp-uuid",
    "senderName": "John Doe",
    "senderEmail": "john@example.com",
    "senderPhone": "+60123456789",
    "subject": "Road repair needed",
    "message": "The road near my house...",
    "category": "infrastructure",
    "status": "pending",
    "isPublic": true,
    "isSpam": false,
    "emailSent": true,
    "createdAt": "2024-01-15T10:30:00Z",
    "readAt": null,
    "updatedAt": "2024-01-15T10:30:00Z"
  }
]
```

#### 4. Update Message Status (Admin Only)
```
PATCH /api/messages/:id
```

**Authentication Required**: Yes (admin/MP)

**Request Body**:
```json
{
  "status": "replied",
  "replyMessage": "Thank you for your message. We will look into this...",
  "repliedAt": "2024-01-15T14:00:00Z"
}
```

**Response**: Updated message object

### Frontend Components

#### 1. ContactMPDialog
**File**: `/client/src/components/ContactMPDialog.tsx`

**Props**:
```typescript
interface ContactMPDialogProps {
  mpId: string;
  mpName: string;
  mpEmail?: string | null;
  mpConstituency: string;
  children?: React.ReactNode;
}
```

**Usage**:
```jsx
<ContactMPDialog
  mpId={mp.id}
  mpName={mp.name}
  mpEmail={mp.email}
  mpConstituency={mp.constituency}
>
  <Button>Contact MP</Button>
</ContactMPDialog>
```

#### 2. MPMessageStats
**File**: `/client/src/components/MPMessageStats.tsx`

**Props**:
```typescript
interface MPMessageStatsProps {
  mpId: string;
  mpName: string;
  onClick?: (e: React.MouseEvent) => void;
}
```

**Features**:
- Fetches message statistics
- Displays badge with count
- Opens MessageStatsDialog on click
- Hides if no messages

#### 3. MessageStatsDialog
**File**: `/client/src/components/MessageStatsDialog.tsx`

**Props**:
```typescript
interface MessageStatsDialogProps {
  mpId: string;
  mpName: string;
  stats: {
    total: number;
    byCategory: Record<string, number>;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
```

**Features**:
- Shows anonymized category breakdown
- Progress bars for each category
- PDPA compliance notice
- Color-coded categories

#### 4. MPMessagesAdmin Page
**File**: `/client/src/pages/MPMessagesAdmin.tsx`

**Route**: `/mp-messages-admin`

**Features**:
- MP selection dropdown
- Status filter
- Message list with full details
- Mark as read button
- Reply dialog
- Resolve message button
- Timestamp display (relative time)

### Email Integration

**Service**: Resend

**Environment Variables Required**:
```bash
RESEND_API_KEY=your-api-key
FROM_EMAIL=noreply@myparliament.calmic.com.my
ADMIN_EMAIL=admin@myparliament.calmic.com.my
```

**Email Templates**:

1. **Contact Email (to MP's office)**:
   - Subject: New message from constituent
   - Contains: Sender details, subject, full message
   - Recipient: MP's registered email or admin email (fallback)

2. **Confirmation Email (to constituent)**:
   - Subject: Your message has been sent
   - Contains: Copy of their message, MP details
   - Recipient: Sender's email

### Security Features

1. **Rate Limiting**:
   - Contact form: 300 requests / 15 minutes
   - Message stats: 5000 requests / 15 minutes

2. **Input Validation**:
   - Email format validation
   - Required field checks
   - Category enum validation
   - Status enum validation

3. **Privacy Protection**:
   - IP address logging (for spam detection)
   - User agent logging
   - Public/private flag
   - Admin-only access to full messages

4. **PDPA Compliance**:
   - Only aggregated data shown publicly
   - Personal information never exposed
   - Consent checkbox for public stats
   - Clear privacy notices

## Setup Instructions

### 1. Database Migration

Run the migration to create the table:

```bash
# Apply migration
psql $DATABASE_URL < migrations/0016_create_mp_contact_messages_table.sql
```

Or use your migration tool:
```bash
npm run db:migrate
```

### 2. Environment Variables

Add to your `.env` file:

```bash
# Email configuration (required for sending emails)
RESEND_API_KEY=re_xxxxxxxxxxxxx
FROM_EMAIL=noreply@myparliament.calmic.com.my
ADMIN_EMAIL=admin@myparliament.calmic.com.my

# Database (already configured)
DATABASE_URL=postgresql://user:pass@host:5432/db
```

### 3. Install Dependencies

No new dependencies required! All UI components use existing Radix UI components.

### 4. Access the Features

**For Constituents**:
- Visit any MP profile page
- Click "Contact" button
- Fill out the form
- Submit message

**For Admins/MPs**:
1. Login at `/admin-login`
2. Visit `/mp-messages-admin`
3. Select MP from dropdown
4. View, reply, and manage messages

## Mobile Responsiveness

All components are fully mobile-responsive:

- **Contact Form**:
  - Single column layout on mobile
  - Touch-friendly buttons
  - Auto-resize textareas

- **Message Counter Badge**:
  - Wraps appropriately on small screens
  - Touch-friendly click targets

- **Stats Dialog**:
  - Scrollable on mobile
  - Responsive progress bars
  - Stack layout for narrow screens

- **Admin Dashboard**:
  - Responsive card grid
  - Collapsible message cards
  - Mobile-optimized dropdowns

## Spam Protection

Current spam protection includes:

1. **Rate Limiting**: 300 requests / 15 minutes
2. **Email Validation**: Regex pattern matching
3. **IP Logging**: Track abuse patterns
4. **User Agent Logging**: Detect bots
5. **Manual Spam Marking**: Admin can mark as spam

**Future Enhancements** (recommended):

1. **reCAPTCHA v3**:
   ```bash
   npm install react-google-recaptcha-v3
   ```

2. **Honeypot Field**:
   - Add hidden field to form
   - Reject if filled out (bots fill all fields)

3. **Time-based Validation**:
   - Track form submission time
   - Reject if submitted too quickly (< 3 seconds)

## Privacy & PDPA Compliance

The system is designed to comply with Malaysia's Personal Data Protection Act (PDPA 2010):

### Data Collected
- ✅ Name, email, phone (with consent)
- ✅ Message content (stored securely)
- ✅ IP address (for security only)
- ✅ User agent (for security only)

### Public Display
- ✅ Only aggregated statistics
- ✅ Category breakdowns (anonymized)
- ✅ Message counts (no personal data)
- ❌ NO names, emails, or identifying information
- ❌ NO full message contents publicly

### Consent
- ✅ Explicit checkbox for public statistics
- ✅ Clear notice about data usage
- ✅ Option to keep message private

### Data Security
- ✅ Database encryption at rest
- ✅ HTTPS for data in transit
- ✅ Admin authentication required
- ✅ Rate limiting to prevent abuse

## Troubleshooting

### Issue: Messages not sending emails

**Solution**:
1. Check RESEND_API_KEY is set correctly
2. Verify FROM_EMAIL is configured
3. Check server logs for email errors
4. Ensure MP has a valid email in database

### Issue: Message counter not showing

**Solution**:
1. Verify migration has been run
2. Check API endpoint returns data: `GET /api/mps/{id}/message-stats`
3. Check browser console for errors
4. Ensure MP has at least one message

### Issue: Admin dashboard shows "Unauthorized"

**Solution**:
1. Login at `/admin-login`
2. Check session cookie is set
3. Verify admin user exists in database
4. Check server authentication middleware

### Issue: Categories not validating

**Solution**:
1. Ensure category is from valid enum list
2. Check database constraint is applied
3. Verify migration ran successfully

## Future Enhancements

### Recommended Additions

1. **WhatsApp/SMS Notifications**:
   - Integrate Twilio or similar service
   - Send SMS to MP when message received
   - Optional WhatsApp notifications

2. **Email Reply Feature**:
   - Allow MPs to reply via email
   - Parse incoming emails and update database
   - Use email service webhooks

3. **Advanced Analytics**:
   - Track response times
   - Measure constituent satisfaction
   - Sentiment analysis on messages
   - Trending topics dashboard

4. **Constituent Portal**:
   - Track message status
   - View reply history
   - Upload attachments
   - Schedule appointments

5. **Auto-categorization**:
   - Use AI to suggest categories
   - Keyword-based categorization
   - Machine learning for better accuracy

6. **Multi-language Support**:
   - Bahasa Malaysia translations
   - Auto-detect language
   - Translate messages for MPs

## Support

For issues or questions:
- GitHub: https://github.com/hamkasu/mp-dashboard
- Email: admin@myparliament.calmic.com.my

## License

Copyright by Calmic Sdn Bhd. All rights reserved.
