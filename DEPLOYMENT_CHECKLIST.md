# Render Deployment Checklist

Use this checklist to ensure a smooth deployment to Render.

## Pre-Deployment

- [ ] Code is pushed to Git repository (GitHub/GitLab/Bitbucket)
- [ ] All sensitive data removed from code (API keys, secrets, etc.)
- [ ] `.env` files are in `.gitignore` (already done)
- [ ] Tested locally with `docker-compose` to ensure everything works

## Deployment Steps

### Option A: Using render.yaml (Recommended)

- [ ] Connect repository to Render as a Blueprint
- [ ] Render detects `render.yaml` automatically
- [ ] Review and adjust service configurations if needed
- [ ] Set environment variables (see below)
- [ ] Deploy services

### Option B: Manual Setup

- [ ] Create PostgreSQL database service
- [ ] Create backend web service (`apps/api`)
- [ ] Create frontend web service (`apps/web`)
- [ ] Configure all environment variables
- [ ] Attach persistent disk to backend

## Environment Variables Setup

### Backend (`sara-api`)

- [ ] `DATABASE_URL` - Auto-set by Render (verify format is correct)
- [ ] `JWT_SECRET` - Generate strong random string
- [ ] `PDF_STORAGE_DIR` - Set to `/data/pdfs`
- [ ] `CORS_ORIGINS` - Set to frontend URL(s)
- [ ] `INVITE_EMAILS` - Set to allowed email addresses
- [ ] (Optional) `INVITE_CODE` - If using invite code gate
- [ ] (Optional) `CROSSREF_MAILTO` - For Crossref API
- [ ] (Optional) `CLARIVATE_API_KEY` - For Clarivate API

### Frontend (`sara-web`)

- [ ] `NODE_ENV` - Set to `production`
- [ ] `NEXT_PUBLIC_API_BASE_URL` - Set to backend URL

## Post-Deployment Verification

- [ ] Backend service shows "Live" status
- [ ] Frontend service shows "Live" status
- [ ] Database is running
- [ ] Backend health check: `https://your-api-url.onrender.com/healthz` returns `{"ok": true}`
- [ ] API docs accessible: `https://your-api-url.onrender.com/docs`
- [ ] Frontend loads without errors
- [ ] No CORS errors in browser console
- [ ] Can log in with invited email
- [ ] Can upload PDF files
- [ ] Persistent disk is mounted (check PDF storage)

## Common Issues to Check

- [ ] CORS errors → Verify `CORS_ORIGINS` matches frontend URL exactly
- [ ] Database connection errors → Check `DATABASE_URL` format
- [ ] Migration errors → Check backend logs, verify database is accessible
- [ ] Build failures → Check build logs for specific errors
- [ ] PDF storage issues → Verify disk is attached and mounted

## Next Steps After Deployment

- [ ] Set up custom domain (optional)
- [ ] Configure SSL (automatic with Render)
- [ ] Set up monitoring and alerts
- [ ] Enable database backups
- [ ] Test all critical features
- [ ] Share URLs with team

## Quick Reference

- **Backend URL**: `https://sara-api.onrender.com` (your actual URL)
- **Frontend URL**: `https://sara-web.onrender.com` (your actual URL)
- **API Docs**: `https://sara-api.onrender.com/docs`
- **Health Check**: `https://sara-api.onrender.com/healthz`
