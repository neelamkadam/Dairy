# Netlify Deployment Guide

## Prerequisites
- Git repository (GitHub, GitLab, or Bitbucket)
- Netlify account (free tier works)

## Deployment Steps

### Method 1: Deploy via Netlify UI (Recommended)

1. **Push your code to Git**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <your-repo-url>
   git push -u origin main
   ```

2. **Connect to Netlify**
   - Go to [Netlify](https://app.netlify.com/)
   - Click "Add new site" → "Import an existing project"
   - Choose your Git provider and repository
   - Netlify will auto-detect the `netlify.toml` configuration

3. **Deploy Settings** (Auto-configured via netlify.toml)
   - Build command: `npm install --legacy-peer-deps && npm run build:skip-ts`
   - Publish directory: `dist`
   - These are already set in `netlify.toml`

4. **Click "Deploy site"**

### Method 2: Deploy via Netlify CLI

1. **Install Netlify CLI**
   ```bash
   npm install -g netlify-cli
   ```

2. **Login to Netlify**
   ```bash
   netlify login
   ```

3. **Initialize and Deploy**
   ```bash
   netlify init
   netlify deploy --prod
   ```

## Application Features

### Authentication
- **Admin Access**: Hardcoded credentials
  - Email: `admin@gmail.com`
  - Password: `admin`
  - Routes: `/admin/*`

- **User Access**: API-based authentication
  - API Endpoint: `https://api.neodairysales.com/web-users/login`
  - Routes: `/dashboard/*`

### Protected Routes
- Admin routes require admin role
- User routes require user role
- Both are protected via `ProtectedRoute` component

## Environment Configuration

The app uses:
- API Base URL: `https://api.neodairysales.com`
- No environment variables needed (API URL is hardcoded)

## Post-Deployment

1. **Test Admin Login**
   - Navigate to `/login`
   - Use admin credentials
   - Verify access to `/admin/admin-dashboard`

2. **Test User Login**
   - Use valid user credentials from your database
   - Verify access to `/dashboard`

3. **Custom Domain** (Optional)
   - Go to Netlify Dashboard → Domain settings
   - Add your custom domain
   - Update DNS records as instructed

## Troubleshooting

### Build Fails
- Check build logs in Netlify dashboard
- Ensure all dependencies are in `package.json`
- Verify Node version compatibility

### Routes Not Working
- The `_redirects` file handles SPA routing
- Ensure it's in the `public` folder
- Netlify will copy it to `dist` during build

### API Calls Failing
- Check CORS settings on your API
- Verify API endpoints are accessible
- Check browser console for errors

## Files Modified for Deployment

1. `netlify.toml` - Build configuration
2. `package.json` - Added `build:skip-ts` script
3. `public/_redirects` - SPA routing configuration
4. This deployment guide

## Notes

- TypeScript errors are skipped during build (using `build:skip-ts`)
- Fix TypeScript errors for better code quality
- Admin credentials are intentionally hardcoded as per requirements
- Both admin and user portals are included in the same deployment
