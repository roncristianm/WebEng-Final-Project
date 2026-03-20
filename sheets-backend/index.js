require('dotenv').config()
const express = require('express')
const bodyParser = require('body-parser')
const { google } = require('googleapis')

const app = express()
const PORT = process.env.PORT || 4000

app.use(bodyParser.json({ limit: '1mb' }))

// Helper to initialize sheets client using service account credentials stored in env var
function getSheetsClient() {
  const raw = process.env.GOOGLE_SHEETS_CREDENTIALS
  if (!raw) throw new Error('Missing GOOGLE_SHEETS_CREDENTIALS env var')
  const credentials = JSON.parse(raw)
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  })
  return google.sheets({ version: 'v4', auth })
}

// Append a row to the given sheet (sheetId and range or sheet name expected)
app.post('/append-grade', async (req, res) => {
  try {
    const { sheetId, range = 'Sheet1!A:Z', values } = req.body
    if (!sheetId || !values) return res.status(400).json({ error: 'sheetId and values required' })

    const sheets = getSheetsClient()
    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [values] }
    })

    return res.json({ success: true })
  } catch (err) {
    console.error('append-grade error', err)
    return res.status(500).json({ success: false, error: err.message })
  }
})

app.get('/health', (req, res) => res.json({ ok: true }))

app.listen(PORT, () => console.log(`Sheets backend running on port ${PORT}`))
