# Parsing Oral Answers PDFs

This document explains how to parse Malaysian Parliamentary Oral Answers (Jawapan Lisan) PDFs to extract and itemize questions by constituency and ministry.

## Quick Start

### Method 1: Parse a PDF File Directly (Standalone)

This method works without database access and is perfect for quickly analyzing a single PDF file.

```bash
npm run parse-pdf <pdf-file-path> [groupBy]
```

**Parameters:**
- `pdf-file-path`: Path to the PDF file to parse (required)
- `groupBy`: How to organize the output - `"constituency"`, `"ministry"`, or `"both"` (default: `"both"`)

**Example:**
```bash
# Download a PDF from Parliament website first
wget https://www.parlimen.gov.my/files/jindex/pdf/JDR02122025.pdf -O oral-answers-02-12-2025.pdf

# Parse it and show results grouped by both constituency and ministry
npm run parse-pdf oral-answers-02-12-2025.pdf both

# Or show results grouped by constituency only
npm run parse-pdf oral-answers-02-12-2025.pdf constituency

# Or show results grouped by ministry only
npm run parse-pdf oral-answers-02-12-2025.pdf ministry
```

### Method 2: Parse from Database (Requires DB Connection)

This method fetches PDFs from the database and parses them.

```bash
npm run parse-oral-answers <date> [groupBy]
```

**Parameters:**
- `date`: Date in YYYY-MM-DD format (required)
- `groupBy`: How to organize the output - `"constituency"`, `"ministry"`, or `"both"` (default: `"both"`)

**Example:**
```bash
npm run parse-oral-answers 2025-12-02 both
```

## Output Format

The parser extracts and displays the following information:

### For Each Question:
- **Question Number**: e.g., S.1, S.2, etc.
- **Questioner Name**: Name of the MP asking the question
- **Questioner Constituency**: Parliamentary constituency
- **Ministry**: The ministry answering the question
- **Minister Name**: Name of the minister (if available)
- **Question Text**: The full question asked
- **Answer Text**: The ministry's answer

### Grouping Options:

#### By Constituency
Questions are organized by the questioner's constituency, showing all questions from MPs in each constituency.

```
📍 PUTRAJAYA
   2 question(s)
─────────────────────────────────────────────────

  1. Question S.1
     Questioner: Dato' Sri Fadillah Yusof
     Ministry: Kementerian Kewangan
     ...
```

#### By Ministry
Questions are organized by the answering ministry, showing all questions directed to each ministry.

```
🏛️  KEMENTERIAN KEWANGAN
   3 question(s)
─────────────────────────────────────────────────

  1. Question S.1
     Questioner: Dato' Sri Fadillah Yusof [Putrajaya]
     ...
```

## Downloading PDFs from Parliament Website

The PDF files for oral answers are typically available at:

```
https://www.parlimen.gov.my/files/jindex/pdf/JDR<DDMMYYYY>.pdf
```

For example, for December 2, 2025:
```
https://www.parlimen.gov.my/files/jindex/pdf/JDR02122025.pdf
```

You can download them using `wget` or `curl`:

```bash
# Using wget
wget https://www.parlimen.gov.my/files/jindex/pdf/JDR02122025.pdf -O oral-answers-02-12-2025.pdf

# Using curl
curl -o oral-answers-02-12-2025.pdf https://www.parlimen.gov.my/files/jindex/pdf/JDR02122025.pdf
```

## How It Works

The parser:

1. **Extracts Text**: Uses `pdf-parse` to extract all text from the PDF
2. **Validates Parliament Session**: Checks if the PDF is from "Parlimen 15" (15th Parliament)
3. **Identifies Questions**: Looks for question number patterns (S.1, S.2, etc.)
4. **Extracts Metadata**: Uses regex patterns to extract:
   - Questioner name and constituency (from patterns like `Tuan [Name] [Constituency]`)
   - Ministry name (from patterns like `Menteri [Ministry]`)
   - Question and answer text
5. **Groups Results**: Organizes questions by constituency and/or ministry
6. **Displays Statistics**: Shows summary with total questions, constituencies, and ministries

## Supported Formats

The parser handles:
- **Malay text**: Soalan, Jawapan, Menteri, etc.
- **English text**: Question, Answer, Minister, etc.
- **Titles**: Dato', Datuk, Y.B., Tuan, Puan, etc.
- **Multiple questions**: Single PDF with multiple S.1, S.2, etc.
- **Single questions**: PDF containing just one question

## Troubleshooting

### No questions extracted

If no questions are extracted:
1. Check the PDF is a valid oral answers document
2. Ensure the PDF contains readable text (not scanned images)
3. Verify the PDF follows the expected format with question numbers and questioner/ministry information

### Incorrect extraction

If data is extracted incorrectly:
1. The PDF format may be different from expected
2. Check if it's from Parlimen 15 (the parser filters by parliament session)
3. Manual inspection of the PDF text may reveal format variations

### File not found

Ensure:
1. The PDF file path is correct
2. You have read permissions for the file
3. The file exists in the specified location

## Examples

### Example 1: Quick parse of a single PDF

```bash
# Download today's oral answers
wget https://www.parlimen.gov.my/files/jindex/pdf/JDR02122025.pdf

# Parse and display by both constituency and ministry
npm run parse-pdf JDR02122025.pdf both
```

### Example 2: Parse and save output to file

```bash
# Parse and redirect output to a text file
npm run parse-pdf JDR02122025.pdf both > parsed-results.txt

# View the results
cat parsed-results.txt
```

### Example 3: Parse multiple PDFs

```bash
# Parse multiple PDFs in sequence
for date in 02122025 03122025 04122025; do
  echo "Parsing JDR${date}.pdf..."
  npm run parse-pdf "JDR${date}.pdf" both > "results-${date}.txt"
done
```

## API Integration

You can also use the parser programmatically in your Node.js code:

```typescript
import { readFileSync } from 'fs';
import { extractQuestionsFromPdf } from './scripts/parse-oral-answers-pdf-standalone';

const pdfBuffer = readFileSync('./oral-answers.pdf');
const questions = await extractQuestionsFromPdf(pdfBuffer);

console.log(`Found ${questions.length} questions`);
questions.forEach(q => {
  console.log(`${q.questionNumber}: ${q.questionerName} [${q.questionerConstituency}]`);
});
```

## Related Commands

- `npm run download-parliamentary-pdfs` - Download all PDFs from database URLs
- `npm run import-parliamentary-answers` - Import oral answers from Parliament website
- `npm run parse-oral-answers` - Parse oral answers from database (requires DB connection)

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the PDF format manually
3. Examine the parser regex patterns in `scripts/parse-oral-answers-pdf-standalone.ts`
