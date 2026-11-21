# Deploying BizFlow ERP Frontend to Vercel

This guide walks you through deploying the **Next.js 15 Web Dashboard** (`apps/web`) to **Vercel** in 2 minutes, connected to your live NestJS Backend API running on Render (`https://bizflow-api-v5m3.onrender.com/api/v1`).

---

## Architecture Overview

```
                      ┌──────────────────────────────────────┐
                      │             User Browser             │
                      └──────────────────┬───────────────────┘
                                         │
                    ┌────────────────────┴────────────────────┐
                    │                                         │
                    ▼                                         ▼
   ┌────────────────────────────────┐       ┌────────────────────────────────┐
   │     Vercel Edge Network        │       │       Render Web Service       │
   │   (https://bizflow.vercel.app) │       │ (https://bizflow-api-v5m3...)  │
   │                                │       │                                │
   │   Next.js 15 Frontend UI       │──────▶│   NestJS Core REST API         │
   │   (Static Pages & React 19)    │       │   (Business Logic & Auth)      │
   └────────────────────────────────┘       └────────────────┬───────────────┘
                                                             │
                                                             ▼
                                            ┌────────────────────────────────┐
                                            │      Supabase PostgreSQL       │
                                            │     (Database & Storage)       │
                                            └────────────────────────────────┘
```

---

## Step-by-Step Vercel Deployment Instructions

### Step 1: Sign in to Vercel
1. Go to **[vercel.com](https://vercel.com)** and log in with your GitHub account (`vinayVeddulapalli`).

---

### Step 2: Import Your GitHub Repository
1. On your Vercel Dashboard, click **Add New...** > **Project**.
2. Find **`bizflow-erp`** (or `vinayVeddulapalli/bizFlow-erp`) in the list of repositories.
3. Click the **Import** button next to it.

---

### Step 3: Configure Project Settings (IMPORTANT)

In the **Configure Project** screen, set the following:

1. **Project Name:** `bizflow-erp` (or any name you prefer).
2. **Framework Preset:** Select **Next.js** (usually auto-detected).
3. **Root Directory:**
   - Click **Edit** next to Root Directory.
   - Select **`apps/web`** and click **Continue**.
   - *(Vercel will automatically detect the root `turbo.json` monorepo structure)*.

4. **Build and Output Settings:**
   - You can leave these as default, or if overridden:
     - **Build Command:** `turbo run build --filter=@bizflow/web...` (or default `next build`)
     - **Output Directory:** `.next`
     - **Install Command:** `pnpm install`

---

### Step 4: Add Environment Variables

Expand the **Environment Variables** section and add the following key-value pair:

| Key | Value | Description |
| :--- | :--- | :--- |
| **`NEXT_PUBLIC_API_URL`** | `https://bizflow-api-v5m3.onrender.com/api/v1` | Points your frontend to your live Render backend API. |

*(Note: Even if you forget to add this variable, our code has an automatic fallback that routes all `*.vercel.app` requests directly to `https://bizflow-api-v5m3.onrender.com/api/v1`).*

---

### Step 5: Click Deploy!

1. Click the blue **Deploy** button.
2. Vercel will install dependencies using pnpm, build the `@bizflow/*` packages, compile the Next.js static pages (34/34 routes), and assign your live domain:
   ```
   https://bizflow-erp-xxxx.vercel.app
   ```
3. Click **Continue to Dashboard** or visit your new `.vercel.app` URL!

---

## Login to Your New Vercel Deployment

Once the build completes:
1. Open your Vercel URL: `https://bizflow-erp-xxxx.vercel.app/login`
2. Sign in with your administrator credentials:
   - **Email:** `vinayveddulapall2002@gmail.com` *(or `admin@bizflow.local`)*
   - **Password:** `Password@123`

---

## Troubleshooting & FAQ

### Q: Why deploy frontend on Vercel and backend on Render?
- **Vercel** is the native host for Next.js, offering instant global CDN edge distribution, automatic image optimization, and zero cold-starts for UI pages.
- **Render** runs the persistent Node.js/NestJS server and handles background workers, WebSockets, and long-lived database connection pools to Supabase.

### Q: Are there CORS issues between Vercel and Render?
No. The NestJS backend API has been configured with CORS allowing `*.vercel.app`, `*.onrender.com`, and `localhost` with full credentials support.
