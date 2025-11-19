# Hansard PDF Workflow

## Understanding the PDF System

The Malaysian Parliament Dashboard separates Hansard **metadata** from **PDF files**:

- **Hansard Records**: Session info, dates, attendance data, speaker counts
- **PDF Files**: Actual PDF documents stored separately in the database

This design allows you to:
1. Track parliamentary sessions even without PDFs
2. Upload PDFs later when available
3. Replace or update PDFs without losing metadata

## Current State

The seeded database includes:
- ✅ 222 MP records with photos
- ✅ 3 sample Hansard records (metadata only)
- ✅ 7 court cases
- ✅ 1 SPRM investigation
- ❌ **No PDF files** - these need to be uploaded manually

## How to Upload Hansard PDFs

### 1. Access the Admin Interface

1. Navigate to `/login` in your application
2. Login with your admin credentials:
   - **Development**: `admin` / `admin123`
   - **Railway**: Your custom credentials set in environment variables

3. Go to the **Hansard Admin** page

### 2. Upload PDF Files

The system supports:
- **Multiple file upload**: Up to 25 PDFs at once
- **Automatic parsing**: Extracts attendance, speakers, and metadata
- **Duplicate detection**: Uses MD5 hashing to prevent duplicate uploads
- **File size limit**: 50MB per PDF

### 3. What Happens During Upload

```
1. PDF is uploaded → 
2. System calculates MD5 hash →
3. Checks for duplicates →
4. Parses PDF content →
5. Extracts:
   - Session number and date
   - Attended MPs
   - Absent MPs
   - Speech counts
   - Topics discussed
6. Stores PDF binary in database →
7. Links to existing or creates new Hansard record
```

## Current "PDF Not Found" Error

If you see: `{"error":"PDF file not found for this Hansard record"}`

**This is expected!** The seeded Hansard records don't have PDFs attached yet.

### Why This Happens

1. The database seeds Hansard metadata (sessions, attendance)
2. PDF files must be uploaded separately
3. The frontend shows a "Download PDF" button even when no PDF exists
4. Clicking the button returns a 404 error

### Solutions

**Option 1: Upload PDFs via Admin**
- Login as admin
- Go to Hansard Admin page
- Upload Hansard PDF files
- System will parse and attach them

**Option 2: UX Improvement** (coming next)
- Update frontend to check if PDF exists
- Show "No PDF available" instead of download link
- Provide helpful message to upload PDFs

## PDF Storage Architecture

PDFs are stored as **binary data in PostgreSQL**:

```sql
CREATE TABLE hansard_pdf_files (
  id VARCHAR PRIMARY KEY,
  hansard_record_id VARCHAR REFERENCES hansard_records(id),
  pdf_data BYTEA,              -- Binary PDF data
  md5_hash VARCHAR UNIQUE,     -- For duplicate detection
  original_filename VARCHAR,
  content_type VARCHAR,
  file_size_bytes INTEGER,
  is_primary BOOLEAN,
  uploaded_at TIMESTAMP
);
```

### Benefits

- ✅ No file system dependencies
- ✅ Works on Railway, Heroku, Replit
- ✅ Survives deployments and restarts
- ✅ Automatic backups with database
- ✅ No CDN or S3 required

## API Endpoints

### Download PDF
```
GET /api/hansard-records/:id/pdf
```
Returns the primary PDF for a Hansard record.

**Response:**
- `200 OK` - PDF binary data
- `404 Not Found` - No PDF attached to this record

### Upload PDFs
```
POST /api/hansard-records/upload
```
Upload and parse Hansard PDFs (requires admin authentication).

**Body:**
- `pdfs`: Array of PDF files (multipart/form-data)

**Response:**
```json
{
  "message": "Uploaded and parsed 3 PDFs successfully",
  "results": [
    {
      "success": true,
      "fileName": "DR.6.11.2025.pdf",
      "sessionNumber": "DR.6.11.2025",
      "hansardRecordId": "..."
    }
  ]
}
```

## Next Steps

1. **For Development**: Upload sample PDFs via the admin interface
2. **For Production (Railway)**: 
   - Set admin credentials via environment variables
   - Upload PDFs through the admin UI
   - Or use the daily Hansard sync cron job (fetches from parliament.gov.my)

## Daily Hansard Sync

The application includes an automatic daily sync:
- Runs at 12:00 PM Malaysia time (Asia/Kuala_Lumpur)
- Fetches latest Hansard PDFs from parliament.gov.my
- Automatically parses and stores them
- Logs: `✅ [Hansard Cron] Daily sync scheduled`

To trigger manually, restart the server.
