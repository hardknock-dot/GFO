# ORBIT Portal - Application Architecture & Documentation

This document describes how the Orbit Resource Management Portal works and provides a prompt for building a simplified version.

---

## 1. How the Application Works

Orbit is a **Multi-Tenant Semiconductor Resource Management & Mobility Hub** engineered for enterprise equipment suppliers. It coordinates resource scheduling, semiconductor tool skill matrices, travel compliance, and visa tracking.

### Tech Stack
* **Frontend Library**: React 18+ (with TypeScript for type safety).
* **Build Tool & Dev Server**: Vite.
* **Styling**: Tailwind CSS (for layout, responsive screens, and general classes) combined with Vanilla CSS (for theme variables and page configurations).
* **Routing**: React Router (v7) for navigation.
* **State & Data Fetching**: TanStack React Query (`@tanstack/react-query`) with Axios for communication (configured for integration with a FastAPI JWT backend).
* **Animations**: Framer Motion.
* **Icons**: Lucide React.

### Core Architecture & State Flow
1. **Multi-Tenancy Context (`CompanyContext.tsx`)**:
   Controls data isolation. Users belong to a specific company tenant (e.g., Lam Research, Axcelis) which filters data queries globally.
2. **Authentication Context (`AuthContext.tsx`)**:
   Tracks user sessions, logins, and logouts. Provides active user metadata (roles, avatar, accessible companies) to pages.
3. **Themes (`ThemeContext.tsx`)**:
   Maintains light/dark modes and injects CSS color variables into the root layout.
4. **Persistent Layout (`AppLayout.tsx` & `Sidebar.tsx`)**:
   - `AppLayout` coordinates the global header, sidebar toggle, responsive spacing, and route outlet.
   - It contains a localized auto-collapse trigger: when entering the `Engineer Search` page, the sidebar automatically minimizes to maximize search workspace, and expands back to normal when navigating away.
   - All sidebar icons are styled uniformly in white.

---

## 2. Key Pages & Components

* **Login (`/`)**: A centered, glassmorphic login card with inputs for User ID and Password.
* **Company Selection (`/company-selection`)**: A page enabling the logged-in admin to choose which tenant's database to view.
* **Dashboard (`/dashboard`)**: Aggregates high-level statistics:
  - Metric cards for Active Engineers, Active Schedules, Expiring Visas, and Total Travel Operations.
  - Quick action links and tables displaying recent updates.
* **Engineer Search (`/engineer-search`)**: Core database searching where administrators filter engineers by tool models, process categories (Etch, Clean, Deposition, etc.), competency levels, and visa status.
* **Engineer Profile (`/engineers/:id`)**: A comprehensive dashboard showing details for a single engineer. Tabs include:
  - *Profile Details*: site join dates, cleanroom safety certifications.
  - *Skills & Tools*: specific tool model certificates and audit dates.
  - *Schedule & Fabs*: active projects, shift assignments.
  - *Travel Itineraries*: flight numbers, destination countries.
  - *Visas & Permits*: passport and visa class expiries.
  - *Performance*: customer satisfaction score and on-time arrival metrics.
* **Data Upload (`/upload`)**: Allows drag-and-drop ingestion of `.xlsx` sheets containing bulk rosters, tool skills, or travel lists.

---

## 3. Developer Prompt: Create a Basic Version

Use this prompt with an AI assistant or tool to construct a simplified version of the application:

```text
Create a basic React + Vite + Tailwind CSS application representing a simplified version of a resource management portal. 

Implement the following features and layout structure:

1. Setup:
   - Configure React Router for navigation.
   - Set up lucide-react for UI icons.
   - Create a global layout (Header, Sidebar, Main Content area) where the sidebar has links for:
     * Dashboard (Home)
     * Search Engineers
     * My Profile
     * Settings

2. Style Theme:
   - Use a sleek dark-themed color palette (slate-950 background, slate-900 panels, and cyan/blue accents).
   - Sidebar icons should be styled in clean, bright white.
   - Main content card borders should be styled with a thin border (slate-800) and rounded corners.

3. Page 1: Login Page (Route: "/")
   - A centered login card with inputs for "User ID" and "Password" and a primary "Sign In" button.
   - Submit action logs in a mock user and redirects to the Dashboard.

4. Page 2: Dashboard/Home Page (Route: "/dashboard")
   - Header displaying "Orbit Portal Dashboard".
   - 3 simple KPI metric cards:
     * Active Engineers (count: 42)
     * Active Projects (count: 12)
     * Alerts (count: 3 visas expiring soon)
   - A short table showing recent schedule logs.

5. Page 3: Search Engineers (Route: "/search")
   - A page with a Search Input box.
   - A table listing 5 mock engineers with fields: Name, Role, Primary Tool, and Availability Status (e.g. "Available", "Deployed").
   - Make the search input filter the list of engineers dynamically by name.
   - Clicking a row or a "View Profile" button navigates the user to the Profile page.

6. Page 4: My Profile Page (Route: "/profile")
   - Displays profile information for a logged-in engineer (avatar, name, email, role).
   - Underneath, show a "Skills & Tools" card list displaying their certifications (e.g. "Centura Etch Chamber - Certified", "Cleanroom Safety - Valid").

Ensure the components are split clean (e.g., separate folder for components, pages, layout) and the codebase uses clean TypeScript interfaces for models.
```
