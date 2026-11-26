# Zuri Healthcare

A React, Express, and MySQL learning app for patients, doctors, and administrators.

## Features

- Patients register, find doctors, request appointments, and track status.
- Doctors review assigned appointments and approve or decline requests.
- Admins create, view, edit, and delete patient and doctor accounts.
- JWT authentication, bcrypt password hashing, and role-protected API routes.

## Run locally

Requirements: Node.js 20+ with npm, and MySQL (XAMPP is fine).

1. **Create the database:** Start MySQL in XAMPP. In `http://localhost/phpmyadmin`, import `server/schema.sql`.
2. **Install dependencies:** In PowerShell, run:

   ```powershell
   Set-Location C:\xampp\htdocs\zuri-healthcare
   npm.cmd run install:all
   ```

   If npm warns that `esbuild`'s install script is awaiting approval, run:

   ```powershell
   Set-Location client
   npm.cmd install-scripts approve esbuild
   npm.cmd install
   Set-Location ..
   ```
3. **Configure the API:** Copy and edit the example settings:

   ```powershell
   Copy-Item server\.env.example server\.env
   notepad server\.env
   ```

   Set your MySQL credentials, a random `JWT_SECRET` of at least 32 characters, and a strong `ADMIN_PASSWORD`. Leave `DB_PASSWORD=` blank if your MySQL root account has no password. To generate a secret in PowerShell, run:

   ```powershell
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

   Keep `server\.env` private; do not commit it.
4. **Create the admin account and launch:**

   ```powershell
   npm.cmd run seed:admin --prefix server
   npm.cmd run dev
   ```

   Open `http://localhost:5173` and sign in with the admin credentials from `.env`. Keep the terminal open. Patients can register; admins create doctor accounts. The React site runs through Vite, not the XAMPP Apache URL.

## React notes

- **Components and JSX:** Build the UI from reusable functions that return JSX.
- **Props:** Pass data and callbacks from parent components to children.
- **State and effects:** `useState` stores changing UI data; `useEffect` loads data after rendering.
- **Events and conditional UI:** Form handlers respond to user actions; role checks show the matching dashboard.
- **Security:** Hiding UI is not access control. The Express API verifies JWTs and user roles.

This is a classroom starter, not a production system for real medical data.
"# ZuriHealthcare" 
