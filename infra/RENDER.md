# Render Deployment Guide

This guide will help you deploy the sara-int application to Render. The application consists of:
- **PostgreSQL Database**: Stores application data
- **FastAPI Backend** (`apps/api`): Python API service
- **Next.js Frontend** (`apps/web`): React web application

## Prerequisites

1. A [Render account](https://render.com)
2. Your code pushed to a Git repository (GitHub, GitLab, or Bitbucket)
3. API keys for external services (if needed):
   - Clarivate Web of Science API key (optional)
   - Crossref mailto (optional)

## Quick Start (Using render.yaml)

The easiest way to deploy is using the `render.yaml` file in the repository root.

### Step 1: Connect Your Repository

1. Log in to [Render Dashboard](https://dashboard.render.com)
2. Click **"New +"** → **"Blueprint"**
3. Connect your Git repository
4. Render will detect the `render.yaml` file automatically

### Step 2: Configure Environment Variables

After the services are created, you'll need to set some environment variables:

#### Backend Service (`sara-api`)

1. Go to your **sara-api** service in Render Dashboard
2. Navigate to **Environment** tab
3. Set the following variables:

   **Required:**
   - `CORS_ORIGINS`: Your frontend URL(s), comma-separated
     - Example: `https://sara-web.onrender.com,https://yourdomain.com`
   - `INVITE_EMAILS`: Comma-separated list of allowed email addresses
     - Example: `user1@example.com,user2@example.com`
   - `JWT_SECRET`: A strong random string (Render can generate this automatically)

   **Optional:**
   - `INVITE_CODE`: If you want an additional invite code gate
   - `CROSSREF_MAILTO`: Your email for Crossref API (for better rate limits)
   - `CLARIVATE_API_KEY`: Your Clarivate Web of Science API key

   **Note:** `DATABASE_URL` is automatically set by Render from the database service.

#### Frontend Service (`sara-web`)

1. Go to your **sara-web** service in Render Dashboard
2. Navigate to **Environment** tab
3. Set:
   - `NEXT_PUBLIC_API_BASE_URL`: Your backend service URL
     - Example: `https://sara-api.onrender.com`

### Step 3: Deploy

1. Render will automatically deploy all services
2. Wait for all services to be "Live"
3. The database migrations will run automatically on first startup

### Step 4: Verify Deployment

1. Check backend health: `https://your-api-url.onrender.com/healthz`
2. Check API docs: `https://your-api-url.onrender.com/docs`
3. Visit your frontend URL

## Manual Deployment (Alternative)

If you prefer to set up services manually:

### 1. Create PostgreSQL Database

1. **New +** → **PostgreSQL**
2. Name: `sara-db`
3. Database: `sara`
4. User: `sara`
5. Plan: Choose based on your needs (Starter for dev, Standard/Pro for production)
6. Click **Create Database**
7. Note the **Internal Database URL** (you'll need this)

### 2. Create Backend Service

1. **New +** → **Web Service**
2. Connect your repository
3. Configure:
   - **Name**: `sara-api`
   - **Root Directory**: `apps/api`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `bash start.sh`
   - **Plan**: Choose based on your needs

4. **Environment Variables**:
   - `DATABASE_URL`: Use the database connection string from step 1
     - **Important**: Render provides `postgresql://` but FastAPI needs `postgresql+psycopg://`
     - The `start.sh` script handles this conversion automatically
   - `JWT_SECRET`: Generate a strong random string
   - `PDF_STORAGE_DIR`: `/data/pdfs`
   - `CORS_ORIGINS`: Your frontend URL(s), comma-separated
   - `INVITE_EMAILS`: Comma-separated email addresses
   - (Optional) `INVITE_CODE`, `CROSSREF_MAILTO`, `CLARIVATE_API_KEY`

5. **Add Disk**:
   - Click **"Add Disk"**
   - Name: `sara-pdf-storage`
   - Mount Path: `/data/pdfs`
   - Size: 10GB (adjust as needed)

6. Click **Create Web Service**

### 3. Run Database Migrations

After the backend service is created:

1. Go to your **sara-api** service
2. Click **Shell** tab
3. Run: `python -m alembic upgrade head`
4. Wait for migrations to complete

**Note**: The `start.sh` script runs migrations automatically on startup, so this step is optional but recommended for verification.

### 4. Create Frontend Service

1. **New +** → **Web Service**
2. Connect your repository
3. Configure:
   - **Name**: `sara-web`
   - **Root Directory**: `apps/web`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start -- --port $PORT --hostname 0.0.0.0`
   - **Plan**: Choose based on your needs

4. **Environment Variables**:
   - `NODE_ENV`: `production`
   - `NEXT_PUBLIC_API_BASE_URL`: Your backend service URL (e.g., `https://sara-api.onrender.com`)

5. Click **Create Web Service**

## Post-Deployment Checklist

- [ ] Backend service is "Live" and healthy (`/healthz` endpoint responds)
- [ ] Database migrations completed successfully
- [ ] Frontend can connect to backend (check browser console for errors)
- [ ] CORS is configured correctly (no CORS errors in browser)
- [ ] Authentication works (test login)
- [ ] File uploads work (test PDF upload)
- [ ] Persistent disk is mounted correctly (check PDF storage)

## Troubleshooting

### CORS Errors

If you see CORS errors in the browser:
1. Check that `CORS_ORIGINS` in backend includes your exact frontend URL
2. Ensure `NEXT_PUBLIC_API_BASE_URL` in frontend matches your backend URL
3. URLs must match exactly (including `https://` and no trailing slashes)

### Database Connection Issues

1. Verify `DATABASE_URL` is set correctly
2. Check that the database service is running
3. Ensure the URL format is `postgresql+psycopg://...` (start.sh handles this)

### Migration Errors

1. Check the backend service logs
2. Verify database is accessible
3. Run migrations manually via Shell: `python -m alembic upgrade head`

### Build Failures

**Backend:**
- Check Python version compatibility
- Verify all dependencies in `requirements.txt` are valid

**Frontend:**
- Check Node.js version (should be 20+)
- Verify `package.json` is valid
- Check build logs for specific errors

### PDF Storage Issues

1. Verify persistent disk is attached and mounted at `/data/pdfs`
2. Check disk size and usage
3. Ensure backend has write permissions

## Environment Variable Reference

### Backend (`sara-api`)

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `DATABASE_URL` | Yes | PostgreSQL connection string | Auto-set by Render |
| `JWT_SECRET` | Yes | Secret for JWT token signing | Auto-generated or set manually |
| `PDF_STORAGE_DIR` | Yes | Path for PDF storage | `/data/pdfs` |
| `CORS_ORIGINS` | Yes | Allowed frontend origins | `https://sara-web.onrender.com` |
| `INVITE_EMAILS` | Yes | Allowed user emails | `user@example.com` |
| `INVITE_CODE` | No | Additional invite code gate | `my-secret-code` |
| `CROSSREF_MAILTO` | No | Email for Crossref API | `your@email.com` |
| `CLARIVATE_API_KEY` | No | Clarivate API key | `your-api-key` |

### Frontend (`sara-web`)

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `NODE_ENV` | Yes | Node environment | `production` |
| `NEXT_PUBLIC_API_BASE_URL` | Yes | Backend API URL | `https://sara-api.onrender.com` |

## Scaling and Production Considerations

1. **Database**: Upgrade to Standard or Pro plan for production workloads
2. **Services**: Use Standard or Pro plans for better performance and reliability
3. **Disk**: Increase disk size based on expected PDF storage
4. **Monitoring**: Set up Render's built-in monitoring and alerts
5. **Backups**: Enable automatic database backups in Render dashboard
6. **Custom Domain**: Configure custom domains for both services
7. **SSL**: Render provides SSL certificates automatically

## Cost Estimation

- **Starter Plan** (Development):
  - Database: Free tier available (limited)
  - Web Services: $7/month per service
  - Disk: ~$0.25/GB/month

- **Standard Plan** (Production):
  - Database: $20/month
  - Web Services: $25/month per service
  - Disk: ~$0.25/GB/month

**Note**: Prices may vary. Check [Render Pricing](https://render.com/pricing) for current rates.

## Support

- [Render Documentation](https://render.com/docs)
- [Render Community](https://community.render.com)
- Check service logs in Render Dashboard for debugging
