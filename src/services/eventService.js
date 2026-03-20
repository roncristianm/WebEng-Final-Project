import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '../config/firebase'
import { getTeacherAssignments } from './assignmentService'
import { getTeacherAnnouncements } from './announcementService'
import { getStudentAssignments } from './assignmentService'
import { getStudentAnnouncements } from './announcementService'
import { getStudentClasses, getTeacherClasses } from './classService'

/**
 * Get combined events for teacher's calendar
 */
export const getTeacherEvents = async (teacherId) => {
  try {
    const [assignments, announcements] = await Promise.all([
      getTeacherAssignments(teacherId),
      getTeacherAnnouncements(teacherId)
    ])

    const assignmentEvents = assignments.map(assignment => ({
      id: assignment.id,
      title: `${assignment.title} (${assignment.className})`,
      date: assignment.createdAt.toDate ? assignment.createdAt.toDate() : new Date(assignment.createdAt), // Use created date for display
      type: 'assignment',
      className: assignment.className,
      details: assignment
    }))

    const announcementEvents = announcements.map(announcement => ({
      id: announcement.id,
      title: `${announcement.title} (${announcement.className})`,
      date: announcement.createdAt.toDate ? announcement.createdAt.toDate() : new Date(announcement.createdAt),
      type: 'announcement',
      className: announcement.className,
      details: announcement
    }))

    const events = [...assignmentEvents, ...announcementEvents].sort((a, b) => {
      return a.date.getTime() - b.date.getTime()
    })

    return events
  } catch (error) {
    console.error('Error fetching teacher events:', error)
    return []
  }
}

/**
 * Get combined events for student's calendar
 */
export const getStudentEvents = async (studentId) => {
  try {
    const [assignments, announcements, studentClasses] = await Promise.all([
      getStudentAssignments(studentId, null), // null classIds gets all
      getStudentAnnouncements(studentId),
      getStudentClasses(studentId)
    ])

    const assignmentEvents = assignments.map(assignment => ({
      id: assignment.id,
      title: `${assignment.title} (${assignment.className})`,
      date: new Date(assignment.deadline), // Deadline for student view
      type: 'assignment',
      className: assignment.className,
      details: assignment
    }))

    const announcementEvents = announcements.map(announcement => ({
      id: announcement.id,
      title: `${announcement.title} (${announcement.className})`,
      date: announcement.createdAt?.toDate ? announcement.createdAt.toDate() : new Date(),
      type: 'announcement',
      className: announcement.className,
      details: announcement
    }))

    const events = [...assignmentEvents, ...announcementEvents].sort((a, b) => {
      return a.date.getTime() - b.date.getTime()
    })

    return events
  } catch (error) {
    console.error('Error fetching student events:', error)
    return []
  }
}

