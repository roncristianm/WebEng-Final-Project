require('dotenv').config()
const emailRoutes = require('./emailRoutes')
const express = require('express')
const bodyParser = require('body-parser')
const { google } = require('googleapis')
const fs = require('fs')
const path = require('path')

const app = express()
const PORT = process.env.PORT || 4000

app.use(bodyParser.json({ limit: '1mb' }))
app.use('/email', emailRoutes)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.sendStatus(200)
  next()
})



// ── Credentials ─────────────────────────────────────────────────────────────
function loadCredentials() {
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
      catch (e2) { throw new Error('Invalid GOOGLE_SHEETS_CREDENTIALS JSON.') }
    }
  } else {
    throw new Error('No credentials found. Place credentials.json in the sheets-backend folder.')
  }

  // Fix private key — ensure actual newlines are used, not escaped \n
  if (credentials.private_key) {
    credentials.private_key = credentials.private_key.replace(/\\n/g, '\n')
  }

  return credentials
}

function getSheetsClient() {
  const credentials = loadCredentials()
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
    const tab = tabs.find(t => {
      // Normalize: lowercase and replace underscores with spaces for matching
      const normalized = t.toLowerCase().replace(/_/g, ' ')
      return keywords.every(kw => normalized.includes(kw.toLowerCase()))
    })
    // Wrap in single quotes if tab name has spaces or special chars
    return tab ? (tab.match(/[\s()']/) ? `'${tab}'` : tab) : null
  }

  const resolved = {
    inputData: find(['input data']) || find(['input']) || find(['input', 'data']),
    q1: find(['q1']),
    q2: find(['q2']),
    q3: find(['q3']),
    q4: find(['q4']),
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

// ── Debug: see exactly what tabs are found and resolved ─────────────────────
app.get('/debug-tabs', async (req, res) => {
  try {
    const { sheetId } = req.query
    if (!sheetId) return res.status(400).json({ error: 'sheetId required' })
    clearTabCache(sheetId)
    const sheets = getSheetsClient()
    const meta = await sheets.spreadsheets.get({
      spreadsheetId: sheetId,
      fields: 'sheets.properties.title'
    })
    const allTabs = meta.data.sheets.map(s => s.properties.title)
    const resolved = await resolveTabNames(sheetId, sheets)
    res.json({ allTabs, resolved })
  } catch (err) {
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
    for (let i = 11; i < allRows.length; i++) {
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

    // Write sorted names to INPUT DATA
    const updateData = names.map((name, idx) => ({
      range: `${sheetName}!B${sectionStart + idx + 1}`,
      values: [[name]]
    }))

    console.log('Writing ranges to INPUT DATA:', updateData.map(d => d.range))

    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: sheetId,
      requestBody: { valueInputOption: 'USER_ENTERED', data: updateData }
    })

    console.log(`✅ Added "${studentName}" to INPUT DATA ${gender} section`)

    // ── Also write names to all quarter sheets (Q1–Q4) ──────────────────────
    // The quarter sheets have the same MALE/FEMALE structure in col B starting at row 10 (index 9)
    // We write all sorted names to each quarter sheet so they stay in sync
    const quarterTabs = [tabs.q1, tabs.q2, tabs.q3, tabs.q4].filter(Boolean)

    for (const quarterTab of quarterTabs) {
      try {
        const qResponse = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: quarterTab })
        const qRows = qResponse.data.values || []

        // Find MALE and FEMALE headers in quarter sheet
        let qMaleRow = -1, qFemaleRow = -1
        for (let i = 0; i < qRows.length; i++) {
          const val = String(qRows[i][1] || '').trim().toUpperCase()
          if (val === 'MALE') qMaleRow = i
          if (val === 'FEMALE') qFemaleRow = i
        }

        if (qMaleRow === -1) {
          console.log(`⚠️ Could not find MALE section in ${quarterTab}, skipping`)
          continue
        }

        const qSectionStart = isMale ? qMaleRow + 1 : qFemaleRow + 1

        // Write sorted names to this quarter sheet
        const qUpdateData = names.map((name, idx) => ({
          range: `${quarterTab}!B${qSectionStart + idx + 1}`,
          values: [[name]]
        }))

        await sheets.spreadsheets.values.batchUpdate({
          spreadsheetId: sheetId,
          requestBody: { valueInputOption: 'USER_ENTERED', data: qUpdateData }
        })

        console.log(`✅ Synced names to ${quarterTab}`)
      } catch (qErr) {
        console.warn(`⚠️ Could not sync to ${quarterTab}:`, qErr.message)
      }
    }

    res.json({ success: true, message: `Added ${studentName} to all sheets` })
  } catch (err) {
    console.error('add-student-to-sheet error', err.message)
    res.status(500).json({ error: err.message })
  }
})

// ── Record a student score (auto-detects tab and item slot) ─────────────────
app.post('/record-score', async (req, res) => {
  try {
    const { sheetId, studentName, assignmentType, assignmentId, score, possibleScore, quarter = 'Q1' } = req.body
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
    for (let i = 11; i < rows.length; i++) {
      const name = String(rows[i][1] || '').trim().toLowerCase()
      if (name === String(studentName).trim().toLowerCase()) {
        targetRowIndex = i
        break
      }
    }

    if (targetRowIndex === -1) {
      return res.status(404).json({ error: `Student "${studentName}" not found in ${sheetName}` })
    }

    // ── Find correct columns by reading the actual sheet header rows ──────────
    // Row 8 (index 7): group headers — WRITTEN WORKS, PERFORMANCE TASKS, QUARTERLY ASSESSMENT
    // Row 9 (index 8): sub-headers — 1, 2, 3...10, Total, PS, WS
    // Row 10 (index 9): HIGHEST POSSIBLE SCORE
    const groupHeaderRow = rows[7] || []
    const subHeaderRow = rows[8] || []
    const HIGHEST_SCORE_ROW = 10  // 1-based sheet row

    // Find which columns belong to each assignment type by scanning group header row
    // Then within that range, find item slots by reading sub-header numbers
    function findItemColumns(typeKeyword) {
      // Find the start column of this type by searching group header row
      let typeStartCol = -1
      for (let c = 0; c < groupHeaderRow.length; c++) {
        const val = String(groupHeaderRow[c] || '').toLowerCase()
        if (val.includes(typeKeyword.toLowerCase())) {
          typeStartCol = c; break
        }
      }
      if (typeStartCol === -1) return { itemCols: [], typeStartCol: -1 }

      // Collect item columns — sub-header row cells that are numbers 1-10
      const itemCols = []
      for (let c = typeStartCol; c < typeStartCol + 20; c++) {
        const sub = String(subHeaderRow[c] || '').trim()
        const num = parseInt(sub)
        if (!isNaN(num) && num >= 1 && num <= 10) {
          itemCols.push({ col: c, item: num })
        }
      }
      return { itemCols, typeStartCol }
    }

    let startCol, maxItems, colIndex, itemCols

    if (assignmentType === 'Written Works') {
      const result = findItemColumns('written')
      itemCols = result.itemCols
      startCol = result.typeStartCol
      maxItems = 10
    } else if (assignmentType === 'Performance Task') {
      const result = findItemColumns('performance')
      itemCols = result.itemCols
      startCol = result.typeStartCol
      maxItems = 10
    } else if (assignmentType === 'Quarterly Assessment') {
      const result = findItemColumns('quarterly')
      // QA has only 1 item — first item col
      colIndex = result.itemCols.length > 0 ? result.itemCols[0].col : -1
      if (colIndex === -1) return res.status(400).json({ error: 'Could not find Quarterly Assessment column in sheet' })
    } else {
      return res.status(400).json({ error: 'Invalid assignmentType' })
    }

    // For WW and PT: find the right item column using assignmentId marker
    // We store assignmentId markers in HIGHEST POSSIBLE SCORE row itself
    // (row 10, index 9) — only in cells that don't already have the score
    // Actually we use a dedicated marker approach: check row 8 (group header) cells
    // within item range for existing assignmentId
    if (colIndex === undefined) {
      if (!itemCols || itemCols.length === 0) {
        return res.status(400).json({ error: `Could not find ${assignmentType} item columns in sheet` })
      }

      // Check if this assignmentId is already mapped to a column
      // We store markers in the HIGHEST POSSIBLE SCORE row (row 10, index 9)
      // but only as a marker prefix — actually let's use a separate approach:
      // We store assignmentId in row 8 (group header row) cells within item range
      let found = -1
      for (const { col } of itemCols) {
        if (String(groupHeaderRow[col] || '').trim() === assignmentId) {
          found = col; break
        }
      }

      if (found >= 0) {
        colIndex = found
      } else {
        // Find next empty item slot — no assignmentId marker yet
        let nextEmpty = -1
        for (const { col } of itemCols) {
          const marker = String(groupHeaderRow[col] || '').trim()
          // Empty if no assignmentId stored (original value is just a number or blank)
          const isNumber = !isNaN(parseInt(marker)) || marker === ''
          if (isNumber) {
            nextEmpty = col; break
          }
        }
        if (nextEmpty === -1) return res.status(400).json({ error: `All ${maxItems} slots for ${assignmentType} are already used` })

        const headerColLetter = columnToLetter(nextEmpty + 1)

        // Write assignmentId marker in group header row (row 8)
        await sheets.spreadsheets.values.update({
          spreadsheetId: sheetId,
          range: `${sheetName}!${headerColLetter}8`,
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: [[assignmentId]] }
        })

        // Write possible score to HIGHEST POSSIBLE SCORE row (row 10)
        if (possibleScore !== undefined) {
          await sheets.spreadsheets.values.update({
            spreadsheetId: sheetId,
            range: `${sheetName}!${headerColLetter}${HIGHEST_SCORE_ROW}`,
            valueInputOption: 'USER_ENTERED',
            requestBody: { values: [[possibleScore]] }
          })
          console.log(`✅ Written possible score ${possibleScore} to ${sheetName}!${headerColLetter}${HIGHEST_SCORE_ROW}`)
        }

        colIndex = nextEmpty
      }
    } else if (assignmentType === 'Quarterly Assessment') {
      // Write possible score to QA column in HIGHEST POSSIBLE SCORE row if empty
      if (possibleScore !== undefined) {
        const qaColLetter = columnToLetter(colIndex + 1)
        const existingPS = String((rows[9] || [])[colIndex] || '').trim()
        if (!existingPS) {
          await sheets.spreadsheets.values.update({
            spreadsheetId: sheetId,
            range: `${sheetName}!${qaColLetter}${HIGHEST_SCORE_ROW}`,
            valueInputOption: 'USER_ENTERED',
            requestBody: { values: [[possibleScore]] }
          })
          console.log(`✅ Written QA possible score ${possibleScore} to ${sheetName}!${qaColLetter}${HIGHEST_SCORE_ROW}`)
        }
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
