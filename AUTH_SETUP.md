# Authentication & Role-Based Access Control

## Overview
This project implements role-based authentication with Firebase, supporting two user types:
- **Students**: Access to Student Dashboard
- **Teachers**: Will have access to Teacher Dashboard (not yet implemented)

## Files Modified/Created

### 1. `firestore.rules` (NEW)
Firebase Firestore security rules that:
- Store user profile data (name, email, gender, role, timestamps)
- Ensure users can only read/update their own profile
- Prevent users from changing their role after signup
- Prevent profile deletion

### 2. `src/services/userService.js` (NEW)
Utility service providing helper functions:
- `getUserData(userId)` - Fetch complete user data
- `getUserRole(userId)` - Get user's role
- `isStudent(userId)` - Check if user is a student
- `isTeacher(userId)` - Check if user is a teacher

### 3. `src/pages/homepage/Signup.jsx` (MODIFIED)
Updated signup flow to:
- Store user data in Firestore during registration
- Include role, name, gender, email, and timestamps
- Redirect based on role (both go to student dashboard for now)

### 4. `src/pages/homepage/LandingPage.jsx` (MODIFIED)
Updated login flow to:
- Fetch user role from Firestore after authentication
- Redirect students to `/dashboard`
- Redirect teachers to `/dashboard` (temporary, until teacher view is created)

### 5. `firebase.json` (MODIFIED)
Added Firestore configuration to link the security rules file

## User Data Structure

When a user signs up, the following data is stored in Firestore under `users/{userId}`:

```javascript
{
  name: string,          // User's full name
  email: string,         // User's email
  gender: string,        // 'male' or 'female'
  role: string,          // 'student' or 'teacher'
  createdAt: Timestamp,  // Account creation time
  updatedAt: Timestamp   // Last update time
}
```

## Deployment Instructions

To deploy the Firestore security rules to Firebase:

```bash
firebase deploy --only firestore:rules
```

## Current Implementation Status

✅ **Completed:**
- User registration with role selection
- Firestore data storage for user profiles
- Security rules for user data
- Role-based login detection
- Student dashboard access

⏳ **Pending:**
- Teacher dashboard view (not yet created)
- Teacher-specific routing (currently redirects to student dashboard)

## Next Steps

When the Teacher Dashboard is created:
1. Create `src/pages/dashboard/TeacherDashboard.jsx`
2. Update `src/App.jsx` to add teacher routes
3. Update LandingPage.jsx and Signup.jsx to redirect teachers to the teacher dashboard
4. Add additional Firestore rules for teacher-specific data (classes, assignments, etc.)

## Testing

### Test Student Account:
1. Sign up with role: "Student"
2. After login, should redirect to `/dashboard` (Student Dashboard)

### Test Teacher Account:
1. Sign up with role: "Teacher"
2. After login, currently redirects to `/dashboard` (temporary)
3. Console will show: "Teacher view not implemented yet, showing student dashboard"
