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
    if (!sheetId || !values || (Array.isArray(values) && values.length === 0)) return res.status(400).json({ error: 'sheetId and non-empty values array required' })

    const sheets = getSheetsClient()
    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: Array.isArray(values) ? values : [values] }
    })

    return res.json({ success: true })
  } catch (err) {
    console.error('append-grade error', err)
    return res.status(500).json({ success: false, error: err.message })
  }
})

// Add student name as a header column if not present
app.post('/add-student-column', async (req, res) => {
  try {
    const { sheetId, sheetName = 'Sheet1', headerRow = 1, studentName } = req.body
    if (!sheetId || !studentName) return res.status(400).json({ error: 'sheetId and studentName required' })

    const sheets = getSheetsClient()

    // Read header row
    const headerRange = `${sheetName}!${headerRow}:${headerRow}`
    const getResp = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: headerRange })
    const headers = (getResp.data.values && getResp.data.values[0]) || []

    // Check if name already exists (case-insensitive)
    const foundIndex = headers.findIndex(h => String(h || '').trim().toLowerCase() === String(studentName).trim().toLowerCase())
    if (foundIndex >= 0) {
      return res.json({ success: true, message: 'Name already present', columnIndex: foundIndex + 1 })
    }

    // Compute next column index and A1 column letter
    const nextColIndex = headers.length + 1 // 1-based

    function columnToLetter(column) {
      let temp = column
      let letter = ''
      while (temp > 0) {
        let mod = (temp - 1) % 26
        letter = String.fromCharCode(65 + mod) + letter
        temp = Math.floor((temp - mod) / 26)
      }
      return letter
    }

    const colLetter = columnToLetter(nextColIndex)
    const writeRange = `${sheetName}!${colLetter}${headerRow}`

    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: writeRange,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [[studentName]] }
    })

    return res.json({ success: true, message: 'Added student header', columnIndex: nextColIndex })
  } catch (err) {
    console.error('add-student-column error', err)
    return res.status(500).json({ success: false, error: err.message })
  }
})

app.get('/health', (req, res) => res.json({ ok: true }))

app.listen(PORT, () => console.log(`Sheets backend running on port ${PORT}`))
