// sheets-backend/verificationService.js
// Handles email verification token logic.
// Tokens are stored in Firestore under `emailVerifications/{token}`

const { initializeApp, cert, getApps } = require('firebase-admin/app')
const { getFirestore }                  = require('firebase-admin/firestore')
const crypto                            = require('crypto')
const path                              = require('path')
const fs                                = require('fs')

// ── Init Firebase Admin (reuse if already initialised) ────────────────────────
function getAdminDb() {
  if (!getApps().length) {
    let credential

    const localKey = path.join(__dirname, 'credentials.json')
    if (fs.existsSync(localKey)) {
      credential = cert(JSON.parse(fs.readFileSync(localKey, 'utf8')))
    } else if (process.env.GOOGLE_SHEETS_CREDENTIALS) {
      credential = cert(JSON.parse(process.env.GOOGLE_SHEETS_CREDENTIALS))
    } else if (process.env.GOOGLE_SHEETS_KEY_FILE) {
      credential = cert(JSON.parse(fs.readFileSync(process.env.GOOGLE_SHEETS_KEY_FILE, 'utf8')))
    } else {
      throw new Error('No Firebase Admin credentials found.')
    }

    initializeApp({ credential })
  }

  return getFirestore()
}

/**
 * Generate a secure random token and store it in Firestore.
 * Expires in 24 hours.
 *
 * @param {string} uid   - Firebase Auth user UID
 * @param {string} email - user's email address
 * @returns {Promise<string>} the generated token
 */
async function createVerificationToken(uid, email) {
  const db    = getAdminDb()
  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h from now

  await db.collection('emailVerifications').doc(token).set({
    uid,
    email,
    createdAt:  new Date(),
    expiresAt,
    used:       false,
  })

  return token
}

/**
 * Verify a token — marks it as used and sets emailVerified: true on the user.
 *
 * @param {string} token
 * @returns {Promise<{ success: boolean, uid?: string, email?: string, error?: string }>}
 */
async function verifyToken(token) {
  const db  = getAdminDb()
  const ref = db.collection('emailVerifications').doc(token)
  const doc = await ref.get()

  if (!doc.exists) {
    return { success: false, error: 'Invalid verification link.' }
  }

  const data = doc.data()

  if (data.used) {
    return { success: false, error: 'This verification link has already been used.' }
  }

  if (new Date() > data.expiresAt.toDate()) {
    return { success: false, error: 'This verification link has expired. Please request a new one.' }
  }

  // Mark token as used
  await ref.update({ used: true, verifiedAt: new Date() })

  // Mark user as verified in Firestore users collection
  await db.collection('users').doc(data.uid).update({
    emailVerified: true,
    verifiedAt:    new Date(),
  })

  return { success: true, uid: data.uid, email: data.email }
}

/**
 * Invalidate all existing unused tokens for a user and create a fresh one.
 * Used for resend verification.
 *
 * @param {string} uid
 * @param {string} email
 * @returns {Promise<string>} new token
 */
async function refreshVerificationToken(uid, email) {
  const db       = getAdminDb()
  const existing = await db.collection('emailVerifications')
    .where('uid', '==', uid)
    .where('used', '==', false)
    .get()

  // Expire old tokens
  const batch = db.batch()
  existing.docs.forEach((doc) => batch.update(doc.ref, { used: true }))
  await batch.commit()

  return createVerificationToken(uid, email)
}

/**
 * Check if a user has verified their email.
 *
 * @param {string} uid
 * @returns {Promise<boolean>}
 */
async function isEmailVerified(uid) {
  const db  = getAdminDb()
  const doc = await db.collection('users').doc(uid).get()
  if (!doc.exists) return false
  return doc.data().emailVerified === true
}

async function getAdminUserData(uid) {
  const db  = getAdminDb()
  const doc = await db.collection('users').doc(uid).get()
  if (!doc.exists) return null
  return doc.data()
}

module.exports = {
  createVerificationToken,
  verifyToken,
  refreshVerificationToken,
  isEmailVerified,
  getAdminUserData,
}