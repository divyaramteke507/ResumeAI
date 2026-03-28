# Deployment Guide

## ⚠️ Important: Full-Stack Application

This application has **both frontend and backend** components:
- **Frontend**: Vite (React-like SPA)
- **Backend**: Express.js server with file uploads and SQLite database

**Vercel Limitation**: Vercel is primarily designed for frontend apps and serverless functions. This app requires:
- Persistent file storage (uploads)
- SQLite database
- Long-running server process

## ✅ Recommended Deployment Options

### 1. Railway (Recommended - Easiest)

Railway is perfect for full-stack Node.js apps with databases and file storage.

**Steps:**

1. **Install Railway CLI**
   ```bash
   npm i -g @railway/cli
   ```

2. **Login to Railway**
   ```bash
   railway login
   ```

3. **Initialize Project**
   ```bash
   railway init
   ```

4. **Deploy**
   ```bash
   railway up
   ```

5. **Set Environment Variables** (in Railway dashboard)
   ```
   NODE_ENV=production
   PORT=3000
   ```

6. **Add Domain** (in Railway dashboard)
   - Railway provides a free domain
   - Or connect your custom domain

**Pros:**
- ✅ Free tier available
- ✅ Supports file uploads
- ✅ SQLite works out of the box
- ✅ Automatic HTTPS
- ✅ Easy deployment

**Cost**: Free tier includes 500 hours/month

---

### 2. Render

Render is another great option for full-stack apps.

**Steps:**

1. **Go to [Render](https://render.com)**

2. **Create New Web Service**
   - Connect your GitHub repository
   - Select: `ai-resume-screening-agent`

3. **Configure Build Settings**
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Environment**: Node

4. **Add Environment Variables**
   ```
   NODE_ENV=production
   ```

5. **Add Persistent Disk** (for uploads and database)
   - Mount path: `/opt/render/project/src/uploads`
   - Mount path: `/opt/render/project/src/db`

6. **Deploy**

**Pros:**
- ✅ Free tier available
- ✅ Persistent disk storage
- ✅ Automatic HTTPS
- ✅ Easy GitHub integration

**Cost**: Free tier available (with limitations)

---

### 3. Heroku

Classic platform for full-stack apps.

**Steps:**

1. **Install Heroku CLI**
   ```bash
   npm install -g heroku
   ```

2. **Login**
   ```bash
   heroku login
   ```

3. **Create App**
   ```bash
   heroku create your-app-name
   ```

4. **Add Buildpack**
   ```bash
   heroku buildpacks:set heroku/nodejs
   ```

5. **Deploy**
   ```bash
   git push heroku main
   ```

6. **Set Environment Variables**
   ```bash
   heroku config:set NODE_ENV=production
   ```

**Note**: Heroku's free tier was discontinued. Paid plans start at $5/month.

**Pros:**
- ✅ Reliable and mature
- ✅ Good documentation
- ✅ Add-ons ecosystem

**Cons:**
- ❌ No free tier
- ❌ Ephemeral filesystem (need S3 for uploads)

---

### 4. DigitalOcean App Platform

**Steps:**

1. **Go to [DigitalOcean](https://www.digitalocean.com)**

2. **Create New App**
   - Connect GitHub repository
   - Select your repo

3. **Configure**
   - **Build Command**: `npm install && npm run build`
   - **Run Command**: `npm start`
   - **HTTP Port**: 3000

4. **Add Environment Variables**
   ```
   NODE_ENV=production
   ```

5. **Deploy**

**Pros:**
- ✅ $5/month starter tier
- ✅ Persistent storage
- ✅ Good performance

**Cost**: Starts at $5/month

---

### 5. VPS (DigitalOcean Droplet, AWS EC2, etc.)

For full control, deploy on a VPS.

**Steps:**

1. **Create a VPS** (Ubuntu 22.04 recommended)

2. **SSH into server**
   ```bash
   ssh root@your-server-ip
   ```

3. **Install Node.js**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

4. **Install PM2** (process manager)
   ```bash
   npm install -g pm2
   ```

5. **Clone your repository**
   ```bash
   git clone https://github.com/divyaramteke507/ai-resume-screening-agent.git
   cd ai-resume-screening-agent
   ```

6. **Install dependencies**
   ```bash
   npm install
   ```

7. **Build frontend**
   ```bash
   npm run build
   ```

8. **Start with PM2**
   ```bash
   pm2 start server/index.js --name resume-ai
   pm2 save
   pm2 startup
   ```

9. **Set up Nginx** (reverse proxy)
   ```bash
   sudo apt install nginx
   ```

   Create `/etc/nginx/sites-available/resume-ai`:
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

   Enable site:
   ```bash
   sudo ln -s /etc/nginx/sites-available/resume-ai /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

10. **Set up SSL** (Let's Encrypt)
    ```bash
    sudo apt install certbot python3-certbot-nginx
    sudo certbot --nginx -d your-domain.com
    ```

**Pros:**
- ✅ Full control
- ✅ Best performance
- ✅ No platform limitations

**Cons:**
- ❌ Requires server management
- ❌ More setup required

**Cost**: $5-10/month for basic VPS

---

## 🔧 Configuration for Production

### Environment Variables

Set these in your deployment platform:

```env
NODE_ENV=production
PORT=3000
```

### Firebase Configuration

Update `src/firebase-config.js` with production settings:
- Add your production domain to Firebase authorized domains
- Update CORS settings if needed

### Database

For production, consider:
- Using PostgreSQL instead of SQLite (more scalable)
- Setting up automated backups
- Using a managed database service

### File Storage

For production file uploads:
- Use AWS S3, Google Cloud Storage, or similar
- Update multer configuration to use cloud storage
- Prevents loss of uploads on server restart

---

## 🚫 Why Not Vercel?

Vercel is optimized for:
- ✅ Static sites
- ✅ Serverless functions
- ✅ Frontend frameworks (Next.js, React, Vue)

This app requires:
- ❌ Persistent file storage (uploads)
- ❌ SQLite database (not supported)
- ❌ Long-running server process
- ❌ WebSocket connections (for real-time features)

**Vercel Limitations:**
1. **Serverless functions** have 10-second timeout
2. **No persistent filesystem** - uploads would be lost
3. **SQLite not supported** in serverless environment
4. **Cold starts** would affect performance

---

## 📊 Platform Comparison

| Platform | Free Tier | File Storage | Database | Difficulty | Best For |
|----------|-----------|--------------|----------|------------|----------|
| **Railway** | ✅ 500hrs | ✅ Persistent | ✅ SQLite | ⭐ Easy | Full-stack apps |
| **Render** | ✅ Limited | ✅ Disk | ✅ SQLite | ⭐⭐ Easy | Full-stack apps |
| **Heroku** | ❌ Paid | ⚠️ Ephemeral | ✅ Add-ons | ⭐⭐ Easy | Enterprise apps |
| **DigitalOcean** | ❌ $5/mo | ✅ Persistent | ✅ Any | ⭐⭐ Medium | Scalable apps |
| **VPS** | ❌ $5-10/mo | ✅ Full control | ✅ Any | ⭐⭐⭐ Hard | Custom needs |
| **Vercel** | ✅ Generous | ❌ Serverless | ❌ No SQLite | ⭐ Easy | Frontend only |

---

## 🎯 Recommended: Railway

For this project, **Railway** is the best choice because:

1. ✅ **Free tier** - 500 hours/month
2. ✅ **Persistent storage** - uploads and database work
3. ✅ **One-command deploy** - `railway up`
4. ✅ **Automatic HTTPS** - free SSL certificate
5. ✅ **GitHub integration** - auto-deploy on push
6. ✅ **Environment variables** - easy configuration
7. ✅ **Logs and monitoring** - built-in dashboard

### Quick Railway Deploy

```bash
# Install CLI
npm i -g @railway/cli

# Login
railway login

# Initialize and deploy
railway init
railway up

# Your app is live! 🚀
```

---

## 📝 Post-Deployment Checklist

After deploying:

- [ ] Test file upload functionality
- [ ] Verify database is working
- [ ] Check all API endpoints
- [ ] Test Google authentication
- [ ] Verify chat features work
- [ ] Test comparison features
- [ ] Check side-by-side view
- [ ] Monitor logs for errors
- [ ] Set up automated backups
- [ ] Configure custom domain (optional)

---

## 🆘 Troubleshooting

### Issue: 404 Errors
**Solution**: Check that routes are configured correctly in your deployment platform

### Issue: File uploads not working
**Solution**: Ensure persistent storage is configured

### Issue: Database errors
**Solution**: Check that SQLite is supported or migrate to PostgreSQL

### Issue: Google Auth not working
**Solution**: Add production domain to Firebase authorized domains

### Issue: API calls failing
**Solution**: Check CORS configuration and API base URL

---

## 📞 Need Help?

If you encounter issues:
1. Check platform-specific documentation
2. Review deployment logs
3. Test locally first (`npm run dev`)
4. Check environment variables
5. Verify all dependencies are installed

---

**Recommendation**: Start with Railway for the easiest deployment experience! 🚀
