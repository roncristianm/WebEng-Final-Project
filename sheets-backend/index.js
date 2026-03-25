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

  // ── Shared: find item columns for a section ──────────────────────────────────
  // Returns 0-based column indices sorted by their numbered sub-header (1–10),
  // scoped to the section whose group-header contains `typeKeyword`.
  // itemCols[0] = item 1, itemCols[1] = item 2, etc.
  function findItemColumns(groupHeaderRow, subHeaderRow, typeKeyword) {
    let sectionStart = -1
    for (let c = 0; c < groupHeaderRow.length; c++) {
      if (String(groupHeaderRow[c] || '').toLowerCase().includes(typeKeyword.toLowerCase())) {
        sectionStart = c; break
      }
    }
    if (sectionStart === -1) return []

    let sectionEnd = groupHeaderRow.length
    for (let c = sectionStart + 1; c < groupHeaderRow.length; c++) {
      if (String(groupHeaderRow[c] || '').trim() !== '') { sectionEnd = c; break }
    }

    const itemCols = []
    for (let c = sectionStart; c < sectionEnd; c++) {
      const num = parseInt(String(subHeaderRow[c] || '').trim(), 10)
      if (!isNaN(num) && num >= 1 && num <= 10) itemCols.push({ col: c, num })
    }
    itemCols.sort((a, b) => a.num - b.num)
    return itemCols.map(x => x.col)
  }

  // Resolve 0-based column index using assignment type + 1-based itemNumber.
  function resolveColumnByItemNumber(groupHeaderRow, subHeaderRow, assignmentType, itemNumber) {
    let keyword
    if      (assignmentType === 'Written Works')        keyword = 'written'
    else if (assignmentType === 'Performance Task')     keyword = 'performance'
    else if (assignmentType === 'Quarterly Assessment') keyword = 'quarterly'
    else return -1

    const itemCols = findItemColumns(groupHeaderRow, subHeaderRow, keyword)
    if (itemCols.length === 0) return -1

    // QA only has one slot — always use first column regardless of itemNumber
    if (assignmentType === 'Quarterly Assessment') return itemCols[0]

    const idx = itemNumber - 1   // itemNumber is 1-based
    return (idx >= 0 && idx < itemCols.length) ? itemCols[idx] : -1
  }

  // ── Set Highest Possible Score (call this when a teacher creates an assignment)
  app.post('/set-highest-possible-score', async (req, res) => {
    try {
      const { sheetId, assignmentType, itemNumber, possibleScore, quarter = 'Q1' } = req.body

      if (!sheetId || !assignmentType || itemNumber === undefined || possibleScore === undefined)
        return res.status(400).json({
          error: 'Missing required fields: sheetId, assignmentType, itemNumber, possibleScore'
        })

      const sheets    = getSheetsClient()
      const tabs      = await resolveTabNames(sheetId, sheets)
      const sheetName = getQuarterTab(tabs, quarter)
      if (!sheetName) return res.status(400).json({ error: `Could not find tab for ${quarter}` })

      // Only read the two header rows — avoids pulling the whole sheet
      const headerResp = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: `${sheetName}!A8:AJ9`
      })
      const headerRows     = headerResp.data.values || []
      const groupHeaderRow = headerRows[0] || []
      const subHeaderRow   = headerRows[1] || []

      const colIndex = resolveColumnByItemNumber(groupHeaderRow, subHeaderRow, assignmentType, itemNumber)
      if (colIndex === -1)
        return res.status(400).json({
          error: `Cannot map ${assignmentType} item ${itemNumber} to a sheet column. ` +
                 `Check the sheet has numbered slots 1–10 in the correct section.`
        })

      const SHEET_HPS_ROW = 10   // row 10 = HIGHEST POSSIBLE SCORE (1-based)
      const colLetter     = columnToLetter(colIndex + 1)
      const hpsCell       = `${sheetName}!${colLetter}${SHEET_HPS_ROW}`

      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: hpsCell,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [[possibleScore]] }
      })

      console.log(`✅ HPS set: ${assignmentType} item ${itemNumber} → ${hpsCell} = ${possibleScore} (${quarter})`)
      res.json({ success: true, cell: hpsCell, assignmentType, itemNumber, possibleScore })

    } catch (err) {
      console.error('set-highest-possible-score error', err.message)
      res.status(500).json({ error: err.message })
    }
  })

  // ── Repair HPS row (fixes misplaced possible scores from old empty-slot logic) ─
  // POST body: { sheetId, quarter, assignments: [{ assignmentType, itemNumber, possibleScore }] }
  // Clears the entire HPS row for the section(s) touched, then rewrites each
  // assignment to the correct itemNumber column.  Safe to call multiple times.
  app.post('/repair-hps', async (req, res) => {
    try {
      const { sheetId, quarter = 'Q1', assignments } = req.body

      if (!sheetId || !Array.isArray(assignments) || assignments.length === 0)
        return res.status(400).json({ error: 'sheetId and a non-empty assignments array are required' })

      const sheets    = getSheetsClient()
      const tabs      = await resolveTabNames(sheetId, sheets)
      const sheetName = getQuarterTab(tabs, quarter)
      if (!sheetName) return res.status(400).json({ error: `Could not find tab for ${quarter}` })

      // Read header rows to resolve column positions
      const headerResp = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: `${sheetName}!A8:AZ9`
      })
      const headerRows     = headerResp.data.values || []
      const groupHeaderRow = headerRows[0] || []
      const subHeaderRow   = headerRows[1] || []

      const SHEET_HPS_ROW = 10

      // Collect all item columns touched by these assignments and clear them first
      // (prevents stale values from the old empty-slot scan from lingering)
      const sectionsToClear = new Set(assignments.map(a => {
        if (a.assignmentType === 'Written Works')        return 'written'
        if (a.assignmentType === 'Performance Task')     return 'performance'
        if (a.assignmentType === 'Quarterly Assessment') return 'quarterly'
        return null
      }).filter(Boolean))

      const clearData = []
      for (const keyword of sectionsToClear) {
        const itemCols = findItemColumns(groupHeaderRow, subHeaderRow, keyword)
        for (const c of itemCols) {
          clearData.push({
            range: `${sheetName}!${columnToLetter(c + 1)}${SHEET_HPS_ROW}`,
            values: [['']]
          })
        }
      }

      if (clearData.length > 0) {
        await sheets.spreadsheets.values.batchUpdate({
          spreadsheetId: sheetId,
          requestBody: { valueInputOption: 'USER_ENTERED', data: clearData }
        })
        console.log(`Cleared ${clearData.length} HPS cells before repair`)
      }

      // Now write each assignment to the correct column
      const writeData = []
      const results   = []
      for (const a of assignments) {
        const { assignmentType, itemNumber, possibleScore } = a
        if (!assignmentType || itemNumber === undefined || possibleScore === undefined) {
          results.push({ assignmentType, itemNumber, error: 'Missing fields' })
          continue
        }
        const colIndex = resolveColumnByItemNumber(groupHeaderRow, subHeaderRow, assignmentType, itemNumber)
        if (colIndex === -1) {
          results.push({ assignmentType, itemNumber, error: 'Could not resolve column' })
          continue
        }
        const cell = `${sheetName}!${columnToLetter(colIndex + 1)}${SHEET_HPS_ROW}`
        writeData.push({ range: cell, values: [[possibleScore]] })
        results.push({ assignmentType, itemNumber, possibleScore, cell, success: true })
      }

      if (writeData.length > 0) {
        await sheets.spreadsheets.values.batchUpdate({
          spreadsheetId: sheetId,
          requestBody: { valueInputOption: 'USER_ENTERED', data: writeData }
        })
      }

      console.log(`✅ repair-hps: wrote ${writeData.length} HPS values for ${quarter}`)
      res.json({ success: true, results })

    } catch (err) {
      console.error('repair-hps error', err.message)
      res.status(500).json({ error: err.message })
    }
  })
  app.post('/record-score', async (req, res) => {
    try {
      const {
        sheetId, studentName, assignmentType,
        assignmentId, itemNumber, score, possibleScore,
        quarter = 'Q1'
      } = req.body

      if (!sheetId || !studentName || !assignmentType || !assignmentId || score === undefined)
        return res.status(400).json({
          error: 'Missing required fields: sheetId, studentName, assignmentType, assignmentId, score'
        })

      const sheets    = getSheetsClient()
      const tabs      = await resolveTabNames(sheetId, sheets)
      const sheetName = getQuarterTab(tabs, quarter)
      if (!sheetName) return res.status(400).json({ error: `Could not find tab for ${quarter}` })

      const response = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: sheetName })
      const rows     = response.data.values || []

      // ── Sheet layout (1-based rows in Google Sheets):
      //   Row 8  → group headers: WRITTEN WORKS (30%) | PERFORMANCE TASKS (50%) | QUARTERLY ASSESSMENT (20%)
      //   Row 9  → sub-headers  : 1, 2, 3 … 10, Total, PS, WS   (per section)
      //   Row 10 → HIGHEST POSSIBLE SCORE
      //   Row 11 → MALE / FEMALE section label
      //   Row 12+→ student data

      const groupHeaderRow = rows[7] || []   // 0-based index 7  = sheet row 8
      const subHeaderRow   = rows[8] || []   // 0-based index 8  = sheet row 9
      const hpsRow         = rows[9] || []   // 0-based index 9  = sheet row 10
      const SHEET_HPS_ROW  = 10              // 1-based sheet row for HPS

      // ── Resolve the target column ─────────────────────────────────────────────
      // Primary path: use itemNumber (stored on the Firestore assignment doc).
      // itemNumber is 1-based and directly encodes the column position within its
      // section, so "Written Works item 3" always lands in the 3rd WW column.
      let colIndex = -1

      if (itemNumber !== undefined && itemNumber !== null) {
        colIndex = resolveColumnByItemNumber(groupHeaderRow, subHeaderRow, assignmentType, itemNumber)
        if (colIndex === -1)
          return res.status(400).json({
            error: `Cannot map ${assignmentType} item ${itemNumber} to a sheet column. ` +
                   `Verify the sheet has numbered slots 1–10 in the correct section.`
          })
        console.log(`Column resolved by itemNumber ${itemNumber} → col ${colIndex} (${columnToLetter(colIndex + 1)})`)

      } else {
        // ── Fallback: legacy empty-slot scan (no itemNumber supplied) ────────────
        // Keeps backward-compatibility with old submissions that predate itemNumber.
        console.warn(`⚠️  No itemNumber for assignmentId="${assignmentId}". Using legacy empty-slot scan.`)

        let keyword
        if      (assignmentType === 'Written Works')        keyword = 'written'
        else if (assignmentType === 'Performance Task')     keyword = 'performance'
        else if (assignmentType === 'Quarterly Assessment') keyword = 'quarterly'
        else return res.status(400).json({ error: `Unknown assignmentType: ${assignmentType}` })

        const itemCols = findItemColumns(groupHeaderRow, subHeaderRow, keyword)
        if (itemCols.length === 0)
          return res.status(400).json({ error: `Could not find ${assignmentType} item columns in sheet` })

        // Check if this assignmentId is already pinned to a column via HPS row
        for (const c of itemCols) {
          if (String(hpsRow[c] || '').trim() === String(assignmentId)) { colIndex = c; break }
        }

        if (colIndex === -1) {
          // Find the first empty slot (HPS blank or numeric, student cell blank)
          let targetRowForScan = -1
          for (let i = 11; i < rows.length; i++) {
            if (String(rows[i][1] || '').trim().toLowerCase() === String(studentName).trim().toLowerCase()) {
              targetRowForScan = i; break
            }
          }
          const studentRowScan = targetRowForScan >= 0 ? (rows[targetRowForScan] || []) : []

          for (const c of itemCols) {
            const hpsVal    = String(hpsRow[c] || '').trim()
            const hpsOther  = hpsVal !== '' && hpsVal !== String(assignmentId) && isNaN(Number(hpsVal))
            if (!hpsOther && String(studentRowScan[c] || '').trim() === '') { colIndex = c; break }
          }
          if (colIndex === -1)
            return res.status(400).json({ error: `All slots for ${assignmentType} are already used` })

          // Pin this assignmentId to the slot via the HPS row
          const colLetterLeg = columnToLetter(colIndex + 1)
          const hpsValueLeg  = possibleScore !== undefined ? possibleScore : assignmentId
          await sheets.spreadsheets.values.update({
            spreadsheetId: sheetId,
            range: `${sheetName}!${colLetterLeg}${SHEET_HPS_ROW}`,
            valueInputOption: 'USER_ENTERED',
            requestBody: { values: [[hpsValueLeg]] }
          })
          console.log(`Legacy pin: assignmentId "${assignmentId}" → col ${colLetterLeg}, HPS = ${hpsValueLeg}`)
        }
      }

      // ── Find student row ──────────────────────────────────────────────────────
      let targetRowIndex = -1
      for (let i = 11; i < rows.length; i++) {
        if (String(rows[i][1] || '').trim().toLowerCase() === String(studentName).trim().toLowerCase()) {
          targetRowIndex = i; break
        }
      }
      if (targetRowIndex === -1)
        return res.status(404).json({ error: `Student "${studentName}" not found in ${sheetName}` })

      // ── Safety-fill HPS if not already set ───────────────────────────────────
      // /set-highest-possible-score should have already written this when the
      // assignment was created.  This is just a safety net for the first submission.
      if (possibleScore !== undefined) {
        const currentHPS = String(hpsRow[colIndex] || '').trim()
        if (!currentHPS || isNaN(Number(currentHPS))) {
          const colLetterHPS = columnToLetter(colIndex + 1)
          await sheets.spreadsheets.values.update({
            spreadsheetId: sheetId,
            range: `${sheetName}!${colLetterHPS}${SHEET_HPS_ROW}`,
            valueInputOption: 'USER_ENTERED',
            requestBody: { values: [[possibleScore]] }
          })
          console.log(`HPS safety-fill: ${colLetterHPS}${SHEET_HPS_ROW} = ${possibleScore}`)
        }
      }

      // ── Write the student score ───────────────────────────────────────────────
      const colLetter = columnToLetter(colIndex + 1)
      const cellRange = `${sheetName}!${colLetter}${targetRowIndex + 1}`

      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: cellRange,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [[score]] }
      })

      console.log(`✅ Score recorded: "${studentName}" → ${cellRange} | ${assignmentType} #${itemNumber ?? '?'} (id=${assignmentId}) = ${score}`)
      res.json({ success: true, cell: cellRange, studentName, score, itemNumber: itemNumber ?? null })

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