Sheets Backend
----------------

This small Express service provides a single endpoint to append rows to a Google Sheet using a Service Account.

Setup

1. Install dependencies inside `sheets-backend`:

```bash
cd sheets-backend
npm install
```

2. Set environment variables (recommended via a `.env` file):

```
GOOGLE_SHEETS_CREDENTIALS={...json string of service account key...}
PORT=4000
```

The `GOOGLE_SHEETS_CREDENTIALS` should be the JSON content of the service account key, encoded as a single-line string. Do NOT commit the key to source control.

3. Start the server:

```bash
node index.js
```

Usage

POST /append-grade
Body: { sheetId: string, range?: string, values: array }

Note: Current backend appends a single row per request. You can extend it to accept multiple rows (batch append) if needed.

POST /add-student-column
Body: { sheetId: string, studentName: string, sheetName?: string, headerRow?: number }

This endpoint checks the header row for the student name (case-insensitive). If not present it writes the student name into the next empty column in the header row.
