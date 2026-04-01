# PlaceMate

**PlaceMate** is a comprehensive Placement Management System designed to streamline the recruitment process. It bridges the gap between students, recruiters, and college administrators by providing customized dashboards and tools tailored to their specific needs.

## Features

- **Role-based Access Control**: Dedicated portals for Students, Admins, and Recruiters.
- **Student Dashboard**: Track job applications, view upcoming interviews, and manage profiles.
- **Recruiter Dashboard**: Manage job postings, review candidate applications, and schedule interviews.
- **Admin Dashboard**: Oversee all activities, manage users, handle company partnerships, and view advanced analytics.
- **Real-time Synchronization**: Powered by Firebase Firestore for robust data consistency.
- **Secure Authentication**: Built with Firebase Authentication.

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS, Framer Motion
- **Backend/Database**: Firebase (Authentication, Firestore)
- **Routing**: React Router

## Getting Started

### Prerequisites

- Node.js installed

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Update the `.env.local` or `.env` file with your Firebase and API configurations (see `.env.example`).
4. Start the development server:
   ```bash
   npm run dev
   ```

The application will be running at `localhost:3000` (or whichever port Vite assigns).
