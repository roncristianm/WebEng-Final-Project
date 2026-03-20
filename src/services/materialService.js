import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where,
  serverTimestamp,
  deleteDoc
} from 'firebase/firestore'
import { 
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
  deleteObject 
} from 'firebase/storage'
import { db, storage } from '../config/firebase'

export const createMaterial = async (classId, description, files, teacherId, teacherName) => {
  try {
    if (!description.trim()) throw new Error('Description required')

    const teacherNameFinal = teacherName || 'Teacher'
    
    // Upload multiple files with progress simulation
    const uploadedFiles = []
    if (files && files.length > 0) {
      const uploadPromises = Array.from(files).map(async (file) => {
        const timestamp = Date.now()
        const filename = `${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
        const storagePath = `materials/${classId}/${filename}`
        const fileRef = storageRef(storage, storagePath)
        const snapshot = await uploadBytes(fileRef, file, { contentType: file.type })
        const fileUrl = await getDownloadURL(snapshot.ref)
        return { url: fileUrl, filename: file.name, size: file.size }
      })
      uploadedFiles.push(...await Promise.all(uploadPromises))
    }
    
    // Parse links from description
    const urlRegex = /https?:\/\/[^\s<>"']+/gi
    const processedLinks = []
    let match
    while ((match = urlRegex.exec(description)) !== null) {
      processedLinks.push(match[0])
    }

    // Save to Firestore
    const materialRef = doc(collection(db, 'materials'))
    await setDoc(materialRef, {
      classId,
      teacherId,
      teacherName: teacherNameFinal,
      description: description.trim(),
      files: uploadedFiles,
      links: processedLinks,
      createdAt: serverTimestamp()
    })

    return { success: true, materialId: materialRef.id }
  } catch (error) {
    console.error('Error creating material:', error)
    return { success: false, error: error.message }
  }
}

export const getClassMaterials = async (classId) => {
  try {
    const q = query(
      collection(db, 'materials'), 
      where('classId', '==', classId)
    )
    const snapshot = await getDocs(q)
    
    const materials = []
    snapshot.forEach((doc) => {
      materials.push({ id: doc.id, ...doc.data() })
    })
    
    materials.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0))
    
    return materials
  } catch (error) {
    console.error('Error fetching materials:', error)
    return []
  }
}

export const deleteMaterial = async (materialId) => {
  try {
    const materialRef = doc(db, 'materials', materialId)
    const materialSnap = await getDoc(materialRef)
    if (!materialSnap.exists()) throw new Error('Material not found')

    const data = materialSnap.data()
    
    // Delete all files
    if (data.files && data.files.length > 0) {
      const deletePromises = data.files.map(async (file) => {
        try {
          const fileRef = storageRef(storage, file.url)
          await deleteObject(fileRef)
        } catch (e) {
          console.warn('File delete failed:', e)
        }
      })
      await Promise.all(deletePromises)
    }
    
    await deleteDoc(materialRef)
    
    return { success: true }
  } catch (error) {
    console.error('Error deleting material:', error)
    return { success: false, error: error.message }
  }
}

