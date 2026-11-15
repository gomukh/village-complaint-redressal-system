# GramSeva Portal – Village Complaint Redressal System

Community Service Project (CSP) – a web portal where villagers can report infrastructure issues (roads, streetlights, drainage, water supply, sanitation), track their status with a complaint ID, and where an admin can update statuses.

## Features
- Home dashboard with statistics, categories and recent activity
- File a complaint (name, mobile, village/ward, category, description, photo)
- Track complaint by ID with a progress timeline
- Admin dashboard with category/status filters and status updates
- Responsive layout with light/dark mode
- English / తెలుగు language toggle
- "Use my location" (GPS) on the complaint form, with a Google Maps link for admin and tracking
- Optional shared database (Firebase Firestore) so complaints show on every device in real time

## Tech stack
HTML, CSS, JavaScript (no framework) · Tabler Icons (CDN) · Firebase Firestore (optional)

## Run locally
Open `index.html` in a browser.

## Enable the shared database (optional)
1. console.firebase.google.com → Add project → Build → Firestore Database → Create (test mode).
2. Project settings → Your apps → Web (`</>`) → copy the `firebaseConfig` values.
3. Paste them into the `firebaseConfig` block near the end of `script.js` (replace the `PASTE_...` values), commit.
Without this the site still works using browser storage.

## Live demo (GitHub Pages)
Settings → Pages → Source: `main` branch, `/ (root)` → Save.

> Demo project: data is stored in the browser only (no backend).

## Team
- Puppala Gomukh – Seshadri Rao Gudlavalleru Engineering College (B.Tech AI & DS)
