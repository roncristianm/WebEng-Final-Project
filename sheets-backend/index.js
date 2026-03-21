require('dotenv').config()
const express = require('express')
const bodyParser = require('body-parser')
const { google } = require('googleapis')
const fs = require('fs')
const path = require('path')

const app = express()
const PORT = process.env.PORT || 4000

app.use(bodyParser.json({ limit: '1mb' }))
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.sendStatus(200)
  next()
})

function getSheetsClient() {
  let credentials

  // Option 1: credentials.json file in same directory (easiest, check first)
  const localKeyFile = path.join(__dirname, 'credentials.json')
  if (fs.existsSync(localKeyFile)) {
    credentials = JSON.parse(fs.readFileSync(localKeyFile, 'utf8'))
    console.log('📄 Using credentials.json from sheets-backend folder')
  }
  // Option 2: use a key file path from env var
  else if (process.env.GOOGLE_SHEETS_KEY_FILE) {
    const keyPath = path.resolve(process.env.GOOGLE_SHEETS_KEY_FILE)
    credentials = JSON.parse(fs.readFileSync(keyPath, 'utf8'))
  }
  // Option 3: use inline JSON string in env var
  else if (process.env.GOOGLE_SHEETS_CREDENTIALS) {
    const raw = process.env.GOOGLE_SHEETS_CREDENTIALS
    try {
      credentials = JSON.parse(raw)
    } catch (e) {
      try {
        credentials = JSON.parse(raw.replace(/\\n/g, '\n'))
      } catch (e2) {
        throw new Error('GOOGLE_SHEETS_CREDENTIALS is not valid JSON. Place credentials.json in the sheets-backend folder instead.')
      }
    }
  }
  else {
    throw new Error('No credentials found. Place credentials.json in the sheets-backend folder.')
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  })
  return google.sheets({ version: 'v4', auth })
}

function columnToLetter(col) {
  let temp = col, letter = ''
  while (temp > 0) {
    let mod = (temp - 1) % 26
    letter = String.fromCharCode(65 + mod) + letter
    temp = Math.floor((temp - mod) / 26)
  }
  return letter
}

// ── Health ─────────────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ ok: true }))

// ── Read all rows from a sheet tab ──────────────────────────────────────────
app.get('/read-grades', async (req, res) => {
  try {
    const { sheetId, sheetName = 'Sheet1' } = req.query
    if (!sheetId) return res.status(400).json({ error: 'sheetId required' })
    const sheets = getSheetsClient()
    const response = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: sheetName })
    res.json({ values: response.data.values || [] })
  } catch (err) {
    console.error('read-grades error', err.message)
    res.status(500).json({ error: err.message })
  }
})

// ── Read grades for a specific student by name ──────────────────────────────
app.get('/student-grades', async (req, res) => {
  try {
    const { sheetId, studentName, sheetName = 'ENGLISH Q1' } = req.query
    if (!sheetId || !studentName) return res.status(400).json({ error: 'sheetId and studentName required' })
    const sheets = getSheetsClient()
    const response = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: sheetName })
    const allRows = response.data.values || []
    if (allRows.length === 0) return res.json({ headers: [], row: [], rowIndex: -1 })

    // Row 8 (index 7) has group headers, row 9 (index 8) has sub-headers
    const groupHeaders = allRows[7] || []
    const subHeaders = allRows[8] || []

    // Find student row by name in col B (index 1)
    let studentRow = null, rowIndex = -1
    for (let i = 9; i < allRows.length; i++) {
      const name = String(allRows[i][1] || '').trim().toLowerCase()
      if (name === String(studentName).trim().toLowerCase()) {
        studentRow = allRows[i]
        rowIndex = i
        break
      }
    }

    res.json({ groupHeaders, subHeaders, row: studentRow || [], rowIndex })
  } catch (err) {
    console.error('student-grades error', err.message)
    res.status(500).json({ error: err.message })
  }
})

// POST /add-student-to-sheet { sheetId, studentName, gender }
// gender: 'Male' | 'Female'
app.post('/add-student-to-sheet', async (req, res) => {
  try {
    const { sheetId, studentName, gender = 'Male' } = req.body
    if (!sheetId || !studentName) return res.status(400).json({ error: 'sheetId and studentName required' })

    const sheets = getSheetsClient()

    // Try to find the correct sheet tab name
    let sheetName = null
    const candidates = ["'INPUT DATA (1)'", "'INPUT DATA'", "'INPUT_DATA (1)'", 'INPUT_DATA']
    for (const candidate of candidates) {
      try {
        await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: `${candidate}!A1` })
        sheetName = candidate
        console.log(`✅ Found INPUT DATA tab as: ${candidate}`)
        break
      } catch (e) {
        console.log(`Tab "${candidate}" not found, trying next...`)
      }
    }
    if (!sheetName) return res.status(400).json({ error: 'Could not find INPUT_DATA sheet tab. Check the tab name in your Google Sheet.' })

    // Read the whole INPUT_DATA sheet
    const response = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: sheetName })
    const rows = response.data.values || []

    console.log(`Total rows read from INPUT_DATA: ${rows.length}`)

    // Find MALE and FEMALE section header rows by checking col B (index 1)
    let maleHeaderRow = -1, femaleHeaderRow = -1
    for (let i = 0; i < rows.length; i++) {
      const val = String(rows[i][1] || '').trim().toUpperCase()
      if (val === 'MALE') maleHeaderRow = i
      if (val === 'FEMALE') femaleHeaderRow = i
    }

    console.log(`MALE header at row index: ${maleHeaderRow}, FEMALE at: ${femaleHeaderRow}`)

    if (maleHeaderRow === -1) return res.status(400).json({ error: 'Could not find MALE section in INPUT_DATA (1)' })

    const isMale = gender.toUpperCase() === 'MALE'
    // sectionStart is the first data row index (0-based) after the gender header
    const sectionStart = isMale ? maleHeaderRow + 1 : femaleHeaderRow + 1
    const sectionEnd = isMale
      ? (femaleHeaderRow > -1 ? femaleHeaderRow : rows.length)
      : rows.length

    console.log(`Section: rows[${sectionStart}] to rows[${sectionEnd - 1}] (0-based)`)

    // Collect existing names in this section from col B (index 1)
    let names = []
    for (let i = sectionStart; i < sectionEnd; i++) {
      const name = String(rows[i][1] || '').trim()
      if (name) names.push(name)
    }

    console.log(`Existing names in ${gender} section:`, names)

    // Check if already exists (case-insensitive)
    const alreadyExists = names.some(n => n.toLowerCase() === studentName.trim().toLowerCase())
    if (alreadyExists) return res.json({ success: true, message: 'Student already in sheet' })

    // Add new name and sort alphabetically
    names.push(studentName.trim())
    names.sort((a, b) => a.localeCompare(b))

    console.log(`Sorted names after adding "${studentName}":`, names)

    // Write sorted names back — sectionStart is 0-based index, sheet row = index + 1
    const updateData = names.map((name, idx) => ({
      range: `${sheetName}!B${sectionStart + idx + 1}`,
      values: [[name]]
    }))

    console.log('Writing ranges:', updateData.map(d => d.range))

    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: sheetId,
      requestBody: {
        valueInputOption: 'USER_ENTERED',
        data: updateData
      }
    })

    console.log(`✅ Added "${studentName}" to ${gender} section at sheet rows: ${sectionStart + 1} to ${sectionStart + names.length}`)
    res.json({ success: true, message: `Added ${studentName} to ${gender} section` })
  } catch (err) {
    console.error('add-student-to-sheet error', err.message)
    res.status(500).json({ error: err.message })
  }
})

// ── Record a student score in the quarter sheet ─────────────────────────────
// POST /record-score
// { sheetId, studentName, assignmentType, assignmentId, score, quarter }
// Auto-detects the correct item column based on existing assignments
app.post('/record-score', async (req, res) => {
  try {
    const { sheetId, studentName, assignmentType, assignmentId, score, quarter = 'Q1' } = req.body
    if (!sheetId || !studentName || !assignmentType || !assignmentId || score === undefined)
      return res.status(400).json({ error: 'Missing required fields: sheetId, studentName, assignmentType, assignmentId, score' })

    const sheets = getSheetsClient()

    // Auto-detect quarter sheet tab name
    const quarterSheetMap = { 'Q1': 'ENGLISH Q1', 'Q2': 'ENGLISH Q2', 'Q3': 'ENGLISH Q3', 'Q4': 'ENGLISH Q4' }
    let sheetName = null
    const baseName = quarterSheetMap[quarter] || 'ENGLISH Q1'
    const candidates = [`'${baseName}'`, baseName]
    for (const candidate of candidates) {
      try {
        await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: `${candidate}!A1` })
        sheetName = candidate
        break
      } catch (e) {}
    }
    if (!sheetName) return res.status(400).json({ error: `Could not find sheet tab for ${quarter}` })

    // Read the quarter sheet
    const response = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: sheetName })
    const rows = response.data.values || []

    // Find student row by name in col B (index 1), starting after header rows (index 9+)
    let targetRowIndex = -1
    for (let i = 9; i < rows.length; i++) {
      const name = String(rows[i][1] || '').trim().toLowerCase()
      if (name === String(studentName).trim().toLowerCase()) {
        targetRowIndex = i
        break
      }
    }

    if (targetRowIndex === -1) {
      return res.status(404).json({ error: `Student "${studentName}" not found in ${sheetName}` })
    }

    // Column layout (0-based):
    // Written Works items 1-10: cols 4-13
    // Performance Task items 1-10: cols 17-26
    // Quarterly Assessment item 1: col 30

    let startCol, maxItems, colIndex

    if (assignmentType === 'Written Works') {
      startCol = 4; maxItems = 10
    } else if (assignmentType === 'Performance Task') {
      startCol = 17; maxItems = 10
    } else if (assignmentType === 'Quarterly Assessment') {
      colIndex = 30 // fixed single column
    } else {
      return res.status(400).json({ error: 'Invalid assignmentType' })
    }

    // For WW and PT: find the column for this assignmentId, or use next empty slot
    if (colIndex === undefined) {
      // Read the header row (row index 8) to check if assignmentId is already mapped
      const headerRow = rows[8] || []

      // Check if this assignmentId is already written in a header cell
      let found = -1
      for (let c = startCol; c < startCol + maxItems; c++) {
        if (String(headerRow[c] || '').trim() === assignmentId) {
          found = c; break
        }
      }

      if (found >= 0) {
        colIndex = found
      } else {
        // Find next empty slot in the header row for this type range
        let nextEmpty = -1
        for (let c = startCol; c < startCol + maxItems; c++) {
          if (!headerRow[c] || String(headerRow[c]).trim() === '') {
            nextEmpty = c; break
          }
        }
        if (nextEmpty === -1) return res.status(400).json({ error: `All ${maxItems} slots for ${assignmentType} are already used` })

        // Write the assignmentId into the header row so future submissions map to same column
        const headerColLetter = columnToLetter(nextEmpty + 1)
        await sheets.spreadsheets.values.update({
          spreadsheetId: sheetId,
          range: `${sheetName}!${headerColLetter}9`,
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: [[assignmentId]] }
        })
        colIndex = nextEmpty
      }
    }

    // Write the score to the student's row
    const colLetter = columnToLetter(colIndex + 1)
    const cellRange = `${sheetName}!${colLetter}${targetRowIndex + 1}`

    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: cellRange,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [[score]] }
    })

    console.log(`✅ Recorded score ${score} for "${studentName}" → ${cellRange} (${assignmentType})`)
    res.json({ success: true, cell: cellRange, studentName, score })
  } catch (err) {
    console.error('record-score error', err.message)
    res.status(500).json({ error: err.message })
  }
})

// ── Append grade rows ────────────────────────────────────────────────────────
app.post('/append-grade', async (req, res) => {
  try {
    const { sheetId, range = 'Sheet1!A:Z', values } = req.body
    if (!sheetId || !values || (Array.isArray(values) && values.length === 0))
      return res.status(400).json({ error: 'sheetId and non-empty values array required' })
    const sheets = getSheetsClient()
    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: Array.isArray(values[0]) ? values : [values] }
    })
    return res.json({ success: true })
  } catch (err) {
    console.error('append-grade error', err.message)
    return res.status(500).json({ success: false, error: err.message })
  }
})

// ── Update single cell ───────────────────────────────────────────────────────
app.put('/update-cell', async (req, res) => {
  try {
    const { sheetId, range, value } = req.body
    if (!sheetId || !range) return res.status(400).json({ error: 'sheetId and range required' })
    const sheets = getSheetsClient()
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [[value]] }
    })
    res.json({ success: true, range })
  } catch (err) {
    console.error('update-cell error', err.message)
    res.status(500).json({ error: err.message })
  }
})

app.listen(PORT, () => console.log(`✅ Sheets backend running on port ${PORT}`))
