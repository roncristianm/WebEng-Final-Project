const crypto = require('crypto')
const { getFirestore } = require('firebase-admin/firestore')

async function createVerificationToken(uid, email) {
  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)

  await getFirestore().collection('emailVerifications').doc(token).set({
    uid,
    email,
    createdAt: new Date(),
    expiresAt,
    used: false,
  })

  return token
}

async function refreshVerificationToken(uid, email) {
  const existing = await getFirestore()
    .collection('emailVerifications')
    .where('uid', '==', uid)
    .where('used', '==', false)
    .get()

  const batch = getFirestore().batch()
  existing.docs.forEach((doc) => batch.update(doc.ref, { used: true }))
  await batch.commit()

  return createVerificationToken(uid, email)
}

async function verifyToken(token) {
  const ref = getFirestore().collection('emailVerifications').doc(token)
  const snapshot = await ref.get()

  if (!snapshot.exists) return { success: false, error: 'Invalid verification link.' }

  const data = snapshot.data()
  if (data.used) return { success: false, error: 'This verification link has already been used.' }
  if (new Date() > data.expiresAt.toDate()) {
    return { success: false, error: 'This verification link has expired.' }
  }

  await ref.update({ used: true, verifiedAt: new Date() })
  await getFirestore().collection('users').doc(data.uid).update({
    emailVerified: true,
    verifiedAt: new Date(),
  })

  return { success: true }
}

module.exports = { createVerificationToken, refreshVerificationToken, verifyToken }
