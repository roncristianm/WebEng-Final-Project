# Sheets Backend

Express server that proxies Google Sheets API calls for the Nexxus BHSA app.

## Setup

1. Install dependencies:
```bash
cd sheets-backend
npm install
```

2. Create a `.env` file (copy from `.env.example`):
```
GOOGLE_SHEETS_CREDENTIALS=<paste your entire service account JSON as a single line>
PORT=4000
```

To get the JSON as a single line, run:
```bash
cat your-credentials.json | tr -d '\n'
```

3. Start the server:
```bash
node index.js
```

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET | `/read-grades?sheetId=&sheetName=` | Read all rows from a sheet |
| GET | `/student-grades?sheetId=&studentId=&sheetName=` | Get one student's grade row |
| POST | `/append-grade` | Append one or multiple rows |
| PUT | `/update-cell` | Update a single cell by A1 range |
| POST | `/add-student-column` | Add student name as a column header |

## Running alongside the frontend

The Vite frontend (port 3000) proxies `/sheets-api/*` → `http://localhost:4000/*`.
So the frontend calls `/sheets-api/read-grades` which hits this server at `/read-grades`.
