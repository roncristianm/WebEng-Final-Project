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

  // ── Tab name resolver ────────────────────────────────────────────────────────
  const tabCache = {}

  async function resolveTabNames(sheetId, sheets) {
    if (tabCache[sheetId]) return tabCache[sheetId]

    const meta = await sheets.spreadsheets.get({
      spreadsheetId: sheetId,
      fields: 'sheets.properties.title'
    })
    const tabs = meta.data.sheets.map(s => s.properties.title)
    console.log(`📋 Tabs found in sheet ${sheetId}:`, tabs)

    const find = (keywords) => {
      const tab = tabs.find(t => {
        const normalized = t.toLowerCase().replace(/_/g, ' ')
        return keywords.every(kw => normalized.includes(kw.toLowerCase()))
      })
      return tab ? (tab.match(/[\s()']/) ? `'${tab}'` : tab) : null
    }

    const resolved = {
      inputData: find(['input data']) || find(['input']) || find(['input', 'data']),
      q1: find(['q1']),
      q2: find(['q2']),
      q3: find(['q3']),
      q4: find(['q4']),
    }

    console.log(`Resolved tab names:`, resolved)
    tabCache[sheetId] = resolved
    return resolved
  }

  function clearTabCache(sheetId) {
    delete tabCache[sheetId]
  }

  function getQuarterTab(tabs, quarter) {
    const map = { Q1: tabs.q1, Q2: tabs.q2, Q3: tabs.q3, Q4: tabs.q4 }
    return map[quarter] || tabs.q1
  }

  // ── Health ───────────────────────────────────────────────────────────────────
  app.get('/health', (req, res) => res.json({ ok: true }))

  // ── Debug tabs ───────────────────────────────────────────────────────────────
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

  // ── Get tab names ────────────────────────────────────────────────────────────
  app.get('/tab-names', async (req, res) => {
    try {
      const { sheetId } = req.query
      if (!sheetId) return res.status(400).json({ error: 'sheetId required' })
      clearTabCache(sheetId)
      const sheets = getSheetsClient()
      const tabs = await resolveTabNames(sheetId, sheets)
      res.json({ tabs })
    } catch (err) {
      console.error('tab-names error', err.message)
      res.status(500).json({ error: err.message })
    }
  })

  // ── Read all rows from a sheet tab ───────────────────────────────────────────
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

  // ── Read grades for a specific student ───────────────────────────────────────
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

  // ── Add student to INPUT DATA sheet ─────────────────────────────────────────
  app.post('/add-student-to-sheet', async (req, res) => {
    try {
      const { sheetId, studentName, gender = 'Male' } = req.body
      if (!sheetId || !studentName) return res.status(400).json({ error: 'sheetId and studentName required' })

      const sheets = getSheetsClient()
      const tabs = await resolveTabNames(sheetId, sheets)
      const sheetName = tabs.inputData

      if (!sheetName) return res.status(400).json({ error: 'Could not find INPUT DATA tab in this sheet.' })

      console.log(`Using INPUT DATA tab: ${sheetName}`)

      const response = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: sheetName })
      const rows = response.data.values || []

      console.log(`Total rows read from INPUT DATA: ${rows.length}`)

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

      console.log('Writing ranges to INPUT DATA:', updateData.map(d => d.range))

      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: sheetId,
        requestBody: { valueInputOption: 'USER_ENTERED', data: updateData }
      })

      console.log(`Added "${studentName}" to INPUT DATA ${gender} section`)
      res.json({ success: true, message: `Added ${studentName} to INPUT DATA only` })
    } catch (err) {
      console.error('add-student-to-sheet error', err.message)
      res.status(500).json({ error: err.message })
    }
  })

  // ── Record a student score ───────────────────────────────────────────────────
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

      // ── Sheet layout (1-based rows in Google Sheets):
      //   Row 8  → group headers: WRITTEN WORKS, PERFORMANCE TASKS, QUARTERLY ASSESSMENT
      //   Row 9  → sub-headers:   1, 2, 3 … 10, Total, PS, WS
      //   Row 10 → HIGHEST POSSIBLE SCORE
      //   Row 11 → MALE / FEMALE section label
      //   Row 12+ → student data

      const groupHeaderRow = rows[7] || []   // row 8
      const subHeaderRow   = rows[8] || []   // row 9
      const hpsRow         = rows[9] || []   // row 10 — Highest Possible Score
      const SHEET_HPS_ROW  = 10              // 1-based sheet row for HPS

      // ── Find student row ─────────────────────────────────────────────────────
      let targetRowIndex = -1
      for (let i = 11; i < rows.length; i++) {
        const name = String(rows[i][1] || '').trim().toLowerCase()
        if (name === String(studentName).trim().toLowerCase()) {
          targetRowIndex = i
          break
        }
      }
      if (targetRowIndex === -1)
        return res.status(404).json({ error: `Student "${studentName}" not found in ${sheetName}` })

      const studentRow = rows[targetRowIndex] || []

      // ── Find item columns within a section ───────────────────────────────────
      // Returns 0-based column indices whose row-9 sub-header is a number 1–10,
      // scoped to the section that starts at the group-header keyword.
      function findItemColumns(typeKeyword) {
        let sectionStart = -1
        for (let c = 0; c < groupHeaderRow.length; c++) {
          if (String(groupHeaderRow[c] || '').toLowerCase().includes(typeKeyword.toLowerCase())) {
            sectionStart = c
            break
          }
        }
        if (sectionStart === -1) return []

        // Find next section boundary
        let sectionEnd = groupHeaderRow.length
        for (let c = sectionStart + 1; c < groupHeaderRow.length; c++) {
          const v = String(groupHeaderRow[c] || '').trim()
          if (v !== '') { sectionEnd = c; break }
        }

        const itemCols = []
        for (let c = sectionStart; c < sectionEnd; c++) {
          const sub = String(subHeaderRow[c] || '').trim()
          const num = parseInt(sub, 10)
          if (!isNaN(num) && num >= 1 && num <= 10) {
            itemCols.push(c)
          }
        }
        return itemCols
      }

      // ── Resolve target column ────────────────────────────────────────────────
      let colIndex = -1

      if (assignmentType === 'Quarterly Assessment') {
        const qaCols = findItemColumns('quarterly')
        if (qaCols.length === 0)
          return res.status(400).json({ error: 'Could not find Quarterly Assessment column in sheet' })
        colIndex = qaCols[0]

        // Write possible score to HPS row if currently empty
        if (possibleScore !== undefined) {
          const existingPS = String(hpsRow[colIndex] || '').trim()
          if (!existingPS || isNaN(Number(existingPS))) {
            const qaColLetter = columnToLetter(colIndex + 1)
            await sheets.spreadsheets.values.update({
              spreadsheetId: sheetId,
              range: `${sheetName}!${qaColLetter}${SHEET_HPS_ROW}`,
              valueInputOption: 'USER_ENTERED',
              requestBody: { values: [[possibleScore]] }
            })
            console.log(`Written QA possible score ${possibleScore} to ${sheetName}!${qaColLetter}${SHEET_HPS_ROW}`)
          }
        }

      } else {
        // Written Works or Performance Task
        const keyword = assignmentType === 'Written Works' ? 'written' : 'performance'
        const itemCols = findItemColumns(keyword)
        if (itemCols.length === 0)
          return res.status(400).json({ error: `Could not find ${assignmentType} item columns in sheet` })

        // 1. Check if this assignmentId is already mapped to a column
        //    (we store the marker in the HPS row when first assigned)
        for (const c of itemCols) {
          const marker = String(hpsRow[c] || '').trim()
          if (marker === String(assignmentId)) {
            colIndex = c
            break
          }
        }

        if (colIndex === -1) {
          // 2. Find the next available empty slot.
          //    A slot is available when:
          //      a) The HPS cell is blank OR contains only a plain number (no foreign marker)
          //      b) The student's own cell in that column is blank
          for (const c of itemCols) {
            const hpsVal     = String(hpsRow[c] || '').trim()
            const studentVal = String(studentRow[c] || '').trim()
            const hpsIsClaimedByOther = hpsVal !== '' && hpsVal !== String(assignmentId) && isNaN(Number(hpsVal))
            if (!hpsIsClaimedByOther && studentVal === '') {
              colIndex = c
              break
            }
          }
          if (colIndex === -1)
            return res.status(400).json({ error: `All slots for ${assignmentType} are already used` })

          // Write assignmentId marker (or possibleScore if provided) into HPS row
          // so future calls can find this column again
          const colLetter = columnToLetter(colIndex + 1)
          const hpsValue  = possibleScore !== undefined ? possibleScore : assignmentId
          await sheets.spreadsheets.values.update({
            spreadsheetId: sheetId,
            range: `${sheetName}!${colLetter}${SHEET_HPS_ROW}`,
            valueInputOption: 'USER_ENTERED',
            requestBody: { values: [[hpsValue]] }
          })
          console.log(`Mapped assignmentId "${assignmentId}" → column ${colLetter} in ${sheetName}, HPS value: ${hpsValue}`)
        }
      }

      // ── Write the student score ───────────────────────────────────────────────
      // colIndex is already the correct 0-based column — no extra ±1 needed
      const colLetter = columnToLetter(colIndex + 1)
      const cellRange = `${sheetName}!${colLetter}${targetRowIndex + 1}`

      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: cellRange,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [[score]] }
      })

      console.log(`✅ Recorded score ${score} for "${studentName}" → ${cellRange} (${assignmentType}, id=${assignmentId})`)
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