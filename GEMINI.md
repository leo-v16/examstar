# ExamStar

## Project Overview
ExamStar (also referred to as "ExamEdge" in the UI) is a web application designed to help students prepare for competitive exams like JEE and NEET. It provides a centralized platform to access study resources such as Previous Year Questions (PYQs) and notes.

### Key Features
-   **Exam Browsing**: Users can search and browse through various exams.
-   **Resource Access**: Detailed view for each exam organized by Subject, Class, and Chapter to find specific notes or PYQs.
-   **Admin Interface**: A dedicated admin section (`/admin`) for managing exam structures and uploading resources.
-   **Dark/Light Mode**: Fully supported theming using `next-themes`.
-   **Responsive Design**: Built with Tailwind CSS for mobile and desktop compatibility.

## Tech Stack
-   **Framework**: Next.js 16 (App Router)
-   **Language**: TypeScript
-   **Styling**: Tailwind CSS v4, shadcn/ui (Radix UI primitives)
-   **Icons**: Lucide React
-   **Backend**: Firebase (Firestore for database, Storage for files)
-   **Deployment**: Vercel (inferred from `vercel.svg` and `next.config.ts`)

## Architecture & Directory Structure

### Key Directories
-   `app/`: Contains the Next.js App Router pages and layouts.
    -   `page.tsx`: The landing page with search and exam listing.
    -   `actions.ts`: Server Actions for secure, server-side operations (fetching/saving exam structures, deleting exams) using Firebase Admin SDK.
    -   `exam/[examId]/page.tsx`: Dynamic route for specific exam resources.
    -   `admin/`: Admin dashboard.
    -   `login/`: Authentication page.
-   `components/`: React components.
    -   `ui/`: Reusable UI components (buttons, cards, inputs, etc.) from shadcn/ui.
    -   `admin/`: Admin-specific components (`ResourceUploader`, `SkeletonBuilder`).
    -   `ExamView.tsx`: The main component for displaying exam resources.
-   `lib/`: Utility functions and backend integration.
    -   `firebase.ts`: Firebase Client SDK initialization.
    -   `firebase-admin.ts`: Firebase Admin SDK initialization (server-side only).
    -   `firestore.ts`: Helper functions for interacting with Firestore from the client.
    -   `utils.ts`: General utility functions (e.g., `cn` for class merging).

### Data Model (Firestore)
The application relies on two main collections in Firestore:

1.  **`exams`**
    -   `id` (string): Slug for the exam (e.g., "jee-mains").
    -   `name` (string): Display name.
    -   `structure` (object): Hierarchical structure of the exam content.
        -   `subjects` (array) -> `classes` (array) -> `chapters` (array).

2.  **`resources`**
    -   `examId` (string): Reference to the exam.
    -   `subject`, `class`, `chapter` (strings): Categorization tags.
    -   `type` (string): 'note' or 'pyq'.
    -   `title` (string): Resource title.
    -   `fileUrl` (string): Download link (from Firebase Storage).
    -   `year` (string, optional): For PYQs.

## Development

### Scripts
-   `npm run dev`: Start the development server.
-   `npm run build`: Build the application for production.
-   `npm run start`: Start the production server.
-   `npm run lint`: Run ESLint.

### Data Access Strategy
The project employs a hybrid approach to data access:
-   **Client-Side**: Read-heavy operations (viewing exams, listing resources) often use the Client SDK (`lib/firestore.ts`) for real-time capabilities and direct access.
-   **Server-Side**: Write operations, administrative tasks, and initial data pre-fetching (for SEO/metadata) use Server Actions (`app/actions.ts`) powered by the Firebase Admin SDK (`lib/firebase-admin.ts`).

### Conventions
-   **Components**: Use functional components with TypeScript interfaces for props.
-   **Styling**: Use Tailwind CSS utility classes. For complex conditional classes, use the `cn()` utility.
-   **UI Library**: When adding new UI elements, prefer using or extending existing shadcn/ui components in `components/ui`.
