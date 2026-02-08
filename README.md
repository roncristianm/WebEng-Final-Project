# WebEng Final Project

A modern web application built with React, Vite, and Firebase.

## 📁 Project Structure

```
WebEng-Final-Project/
├── public/
│   └── vite.svg
├── src/
│   ├── components/      # Reusable React components
│   ├── config/
│   │   └── firebase.js  # Firebase configuration
│   ├── context/         # React Context providers
│   ├── hooks/           # Custom React hooks
│   ├── pages/
│   │   ├── Home.jsx
│   │   └── Home.css
│   ├── services/        # API and Firebase service functions
│   ├── utils/           # Utility functions
│   ├── App.jsx
│   ├── App.css
│   ├── main.jsx
│   └── index.css
├── .env.example         # Environment variables template
├── .eslintrc.cjs        # ESLint configuration
├── .gitignore
├── index.html
├── package.json
├── vite.config.js
└── README.md
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Firebase account

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd WebEng-Final-Project
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Firebase**
   - Create a new Firebase project at [Firebase Console](https://console.firebase.google.com/)
   - Enable Authentication, Firestore, and Storage services
   - Copy your Firebase configuration

4. **Configure environment variables**
   - Copy `.env.example` to `.env`
     ```bash
     cp .env.example .env
     ```
   - Fill in your Firebase credentials in the `.env` file:
     ```
     VITE_FIREBASE_API_KEY=your_api_key
     VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
     VITE_FIREBASE_PROJECT_ID=your_project_id
     VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
     VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
     VITE_FIREBASE_APP_ID=your_app_id
     ```

5. **Start the development server**
   ```bash
   npm run dev
   ```
   The app will open at `http://localhost:3000`

## 📦 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## 🛠️ Tech Stack

- **React 18** - UI library
- **Vite** - Build tool and dev server
- **Firebase** - Backend services (Auth, Firestore, Storage)
- **React Router** - Client-side routing
- **ESLint** - Code linting

## 📝 Firebase Services Setup

The project includes Firebase configuration for:

- **Authentication** (`auth`) - User authentication
- **Firestore** (`db`) - NoSQL database
- **Storage** (`storage`) - File storage

Import these services from `src/config/firebase.js`:

```javascript
import { auth, db, storage } from './config/firebase'
```

## 🎯 Next Steps

1. Set up your Firebase environment variables
2. Create additional pages in `src/pages/`
3. Build reusable components in `src/components/`
4. Add authentication logic using Firebase Auth
5. Create database operations in `src/services/`
6. Implement custom hooks in `src/hooks/`

## 📄 License

This project is for educational purposes.