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

// ── Credentials ─────────────────────────────────────────────────────────────
function getSheetsClient() {
  let credentials
  const localKeyFile = path.join(__dirname, 'credentials.json')
  if (fs.existsSync(localKeyFile)) {
    credentials = JSON.parse(fs.readFileSync(localKeyFile, 'utf8'))
  } else if (process.env.GOOGLE_SHEETS_KEY_FILE) {
    credentials = JSON.parse(fs.readFileSync(path.resolve(process.env.GOOGLE_SHEETS_KEY_FILE), 'utf8'))
  } else if (process.env.GOOGLE_SHEETS_CREDENTIALS) {
    const raw = process.env.GOOGLE_SHEETS_CREDENTIALS
    try { credentials = JSON.parse(raw) }
    catch (e) {
      try { credentials = JSON.parse(raw.replace(/\\n/g, '\n')) }
      catch (e2) { throw new Error('Invalid GOOGLE_SHEETS_CREDENTIALS JSON. Place credentials.json in sheets-backend folder instead.') }
    }
  } else {
    throw new Error('No credentials found. Place credentials.json in the sheets-backend folder.')
  }
  const auth = new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/spreadsheets'] })
  return google.sheets({ version: 'v4', auth })
}

// Drive client — needed to share sheets with the service account
function getDriveClient() {
  let credentials
  const localKeyFile = path.join(__dirname, 'credentials.json')
  if (fs.existsSync(localKeyFile)) {
    credentials = JSON.parse(fs.readFileSync(localKeyFile, 'utf8'))
  } else if (process.env.GOOGLE_SHEETS_KEY_FILE) {
    credentials = JSON.parse(fs.readFileSync(path.resolve(process.env.GOOGLE_SHEETS_KEY_FILE), 'utf8'))
  } else if (process.env.GOOGLE_SHEETS_CREDENTIALS) {
    const raw = process.env.GOOGLE_SHEETS_CREDENTIALS
    try { credentials = JSON.parse(raw) }
    catch (e) { credentials = JSON.parse(raw.replace(/\\n/g, '\n')) }
  }
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive'
    ]
  })
  return google.drive({ version: 'v3', auth })
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

// ── Tab name resolver (auto-detects tabs by keyword, caches per sheetId) ───
const tabCache = {} // { sheetId: { inputData, q1, q2, q3, q4 } }

async function resolveTabNames(sheetId, sheets) {
  if (tabCache[sheetId]) return tabCache[sheetId]

  // Fetch all sheet tab names from the spreadsheet metadata
  const meta = await sheets.spreadsheets.get({
    spreadsheetId: sheetId,
    fields: 'sheets.properties.title'
  })
  const tabs = meta.data.sheets.map(s => s.properties.title)
  console.log(`📋 Tabs found in sheet ${sheetId}:`, tabs)

  // Match tabs by keyword (case-insensitive, flexible)
  const find = (keywords) => {
    const tab = tabs.find(t =>
      keywords.every(kw => t.toLowerCase().includes(kw.toLowerCase()))
    )
    // Wrap in single quotes if tab name has spaces or special chars
    return tab ? (tab.match(/[\s()]/) ? `'${tab}'` : tab) : null
  }

  const resolved = {
    inputData: find(['input']) || find(['input', 'data']),
    q1: find(['q1']) || find(['first', 'quarter']) || find(['1st', 'quarter']),
    q2: find(['q2']) || find(['second', 'quarter']) || find(['2nd', 'quarter']),
    q3: find(['q3']) || find(['third', 'quarter']) || find(['3rd', 'quarter']),
    q4: find(['q4']) || find(['fourth', 'quarter']) || find(['4th', 'quarter']),
  }

  console.log(`✅ Resolved tab names:`, resolved)
  tabCache[sheetId] = resolved
  return resolved
}

// Clear cache for a sheet (call if tab names change)
function clearTabCache(sheetId) {
  delete tabCache[sheetId]
}

function getQuarterTab(tabs, quarter) {
  const map = { Q1: tabs.q1, Q2: tabs.q2, Q3: tabs.q3, Q4: tabs.q4 }
  return map[quarter] || tabs.q1
}

// ── Health ──────────────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ ok: true }))

// ── Auto-share sheet with service account ───────────────────────────────────
// POST /share-sheet { sheetId }
// Grants the service account Editor access to the sheet automatically
app.post('/share-sheet', async (req, res) => {
  try {
    const { sheetId } = req.body
    if (!sheetId) return res.status(400).json({ error: 'sheetId required' })

    const drive = getDriveClient()

    // Get the service account email from credentials
    const localKeyFile = path.join(__dirname, 'credentials.json')
    const credentials = JSON.parse(fs.readFileSync(localKeyFile, 'utf8'))
    const serviceAccountEmail = credentials.client_email

    // Check if already shared
    const existingPerms = await drive.permissions.list({
      fileId: sheetId,
      fields: 'permissions(id,emailAddress,role)'
    })
    const alreadyShared = existingPerms.data.permissions?.some(
      p => p.emailAddress?.toLowerCase() === serviceAccountEmail.toLowerCase()
    )

    if (alreadyShared) {
      console.log(`✅ Sheet ${sheetId} already shared with ${serviceAccountEmail}`)
      return res.json({ success: true, message: 'Already shared', email: serviceAccountEmail })
    }

    // Grant Editor access to the service account
    await drive.permissions.create({
      fileId: sheetId,
      requestBody: {
        type: 'user',
        role: 'writer',
        emailAddress: serviceAccountEmail
      },
      fields: 'id'
    })

    // Clear tab cache so fresh tab names are read
    clearTabCache(sheetId)

    console.log(`✅ Shared sheet ${sheetId} with ${serviceAccountEmail}`)
    res.json({ success: true, message: `Sheet shared with ${serviceAccountEmail}`, email: serviceAccountEmail })
  } catch (err) {
    console.error('share-sheet error', err.message)
    // If it's a permission error, the sheet owner needs to share manually
    if (err.message.includes('insufficientPermissions') || err.code === 403) {
      return res.status(403).json({
        error: 'Cannot auto-share: The sheet owner must grant access. Share the sheet with ' +
          'nexxus@nexxus-490901.iam.gserviceaccount.com as Editor.',
        manualShare: true
      })
    }
    res.status(500).json({ error: err.message })
  }
})

// ── Get tab names for a sheet (so frontend can display them) ────────────────
app.get('/tab-names', async (req, res) => {
  try {
    const { sheetId } = req.query
    if (!sheetId) return res.status(400).json({ error: 'sheetId required' })
    clearTabCache(sheetId) // always re-fetch fresh
    const sheets = getSheetsClient()
    const tabs = await resolveTabNames(sheetId, sheets)
    res.json({ tabs })
  } catch (err) {
    console.error('tab-names error', err.message)
    res.status(500).json({ error: err.message })
  }
})

// ── Read all rows from a sheet tab ──────────────────────────────────────────
app.get('/read-grades', async (req, res) => {
  try {
    const { sheetId, quarter = 'Q1' } = req.query
    if (!sheetId) return res.status(400).json({ error: 'sheetId required' })
    const sheets = getSheetsClient()
    const tabs = await resolveTabNames(sheetId, sheets)
    const sheetName = getQuarterTab(tabs, quarter)
    if (!sheetName) return res.status(400).json({ error: `Could not find tab for ${quarter}` })
    const response = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: sheetName })
    res.json({ values: response.data.values || [], sheetName })
  } catch (err) {
    console.error('read-grades error', err.message)
    res.status(500).json({ error: err.message })
  }
})

// ── Read grades for a specific student by name ──────────────────────────────
app.get('/student-grades', async (req, res) => {
  try {
    const { sheetId, studentName, quarter = 'Q1' } = req.query
    if (!sheetId || !studentName) return res.status(400).json({ error: 'sheetId and studentName required' })
    const sheets = getSheetsClient()
    const tabs = await resolveTabNames(sheetId, sheets)
    const sheetName = getQuarterTab(tabs, quarter)
    if (!sheetName) return res.status(400).json({ error: `Could not find tab for ${quarter}` })

    const response = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: sheetName })
    const allRows = response.data.values || []
    if (allRows.length === 0) return res.json({ headers: [], row: [], rowIndex: -1 })

    const groupHeaders = allRows[7] || []
    const subHeaders = allRows[8] || []

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

// ── Add student to INPUT DATA sheet (sorted, by gender) ─────────────────────
app.post('/add-student-to-sheet', async (req, res) => {
  try {
    const { sheetId, studentName, gender = 'Male' } = req.body
    if (!sheetId || !studentName) return res.status(400).json({ error: 'sheetId and studentName required' })

    const sheets = getSheetsClient()
    const tabs = await resolveTabNames(sheetId, sheets)
    const sheetName = tabs.inputData

    if (!sheetName) return res.status(400).json({ error: 'Could not find INPUT DATA tab in this sheet. Make sure your sheet has a tab with "input" in the name.' })

    console.log(`Using INPUT DATA tab: ${sheetName}`)

    const response = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: sheetName })
    const rows = response.data.values || []

    console.log(`Total rows read from INPUT DATA: ${rows.length}`)

    // Find MALE and FEMALE section header rows by checking col B (index 1)
    let maleHeaderRow = -1, femaleHeaderRow = -1
    for (let i = 0; i < rows.length; i++) {
      const val = String(rows[i][1] || '').trim().toUpperCase()
      if (val === 'MALE') maleHeaderRow = i
      if (val === 'FEMALE') femaleHeaderRow = i
    }

    console.log(`MALE header at row index: ${maleHeaderRow}, FEMALE at: ${femaleHeaderRow}`)

    if (maleHeaderRow === -1) return res.status(400).json({ error: 'Could not find MALE section in INPUT DATA tab.' })

    const isMale = gender.toUpperCase() === 'MALE'
    const sectionStart = isMale ? maleHeaderRow + 1 : femaleHeaderRow + 1
    const sectionEnd = isMale
      ? (femaleHeaderRow > -1 ? femaleHeaderRow : rows.length)
      : rows.length

    console.log(`Section: rows[${sectionStart}] to rows[${sectionEnd - 1}] (0-based)`)

    let names = []
    for (let i = sectionStart; i < sectionEnd; i++) {
      const name = String(rows[i][1] || '').trim()
      if (name) names.push(name)
    }

    const alreadyExists = names.some(n => n.toLowerCase() === studentName.trim().toLowerCase())
    if (alreadyExists) return res.json({ success: true, message: 'Student already in sheet' })

    names.push(studentName.trim())
    names.sort((a, b) => a.localeCompare(b))

    console.log(`Sorted names after adding "${studentName}":`, names)

    const updateData = names.map((name, idx) => ({
      range: `${sheetName}!B${sectionStart + idx + 1}`,
      values: [[name]]
    }))

    console.log('Writing ranges:', updateData.map(d => d.range))

    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: sheetId,
      requestBody: { valueInputOption: 'USER_ENTERED', data: updateData }
    })

    console.log(`✅ Added "${studentName}" to ${gender} section`)
    res.json({ success: true, message: `Added ${studentName} to ${gender} section` })
  } catch (err) {
    console.error('add-student-to-sheet error', err.message)
    res.status(500).json({ error: err.message })
  }
})

// ── Record a student score (auto-detects tab and item slot) ─────────────────
app.post('/record-score', async (req, res) => {
  try {
    const { sheetId, studentName, assignmentType, assignmentId, score, quarter = 'Q1' } = req.body
    if (!sheetId || !studentName || !assignmentType || !assignmentId || score === undefined)
      return res.status(400).json({ error: 'Missing required fields: sheetId, studentName, assignmentType, assignmentId, score' })

    const sheets = getSheetsClient()
    const tabs = await resolveTabNames(sheetId, sheets)
    const sheetName = getQuarterTab(tabs, quarter)

    if (!sheetName) return res.status(400).json({ error: `Could not find tab for ${quarter}` })

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
      colIndex = 30
    } else {
      return res.status(400).json({ error: 'Invalid assignmentType' })
    }

    // For WW and PT: find existing or next empty slot using assignmentId as marker
    if (colIndex === undefined) {
      const headerRow = rows[8] || []
      let found = -1
      for (let c = startCol; c < startCol + maxItems; c++) {
        if (String(headerRow[c] || '').trim() === assignmentId) {
          found = c; break
        }
      }

      if (found >= 0) {
        colIndex = found
      } else {
        let nextEmpty = -1
        for (let c = startCol; c < startCol + maxItems; c++) {
          if (!headerRow[c] || String(headerRow[c]).trim() === '') {
            nextEmpty = c; break
          }
        }
        if (nextEmpty === -1) return res.status(400).json({ error: `All ${maxItems} slots for ${assignmentType} are already used` })

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
