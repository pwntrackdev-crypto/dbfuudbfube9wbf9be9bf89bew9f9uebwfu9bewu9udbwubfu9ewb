# AI Chat - Netlify Setup Instructions

## 📁 What You Got

Your project now has:
- `index.html` - The chat interface (updated to call Netlify Function)
- `netlify/functions/chat.js` - Backend function (replaces chat.php)
- `netlify.toml` - Netlify configuration

## 🚀 How to Deploy

### Method 1: GitHub + Netlify (Recommended)

1. **Create a GitHub repo** (if you don't have one)
   - Go to https://github.com/new
   - Create a new repository
   - Don't add README or .gitignore

2. **Upload your files to GitHub**
   - Upload ALL files: `index.html`, `netlify.toml`, and the entire `netlify` folder
   - Make sure the folder structure looks like:
     ```
     your-repo/
     ├── index.html
     ├── netlify.toml
     └── netlify/
         └── functions/
             └── chat.js
     ```

3. **Connect to Netlify**
   - Go to https://app.netlify.com
   - Sign up/login (free)
   - Click "Add new site" → "Import an existing project"
   - Choose "GitHub"
   - Select your repo
   - Click "Deploy site" (leave all settings default)

4. **Add Environment Variables** (IMPORTANT!)
   - After deployment, go to "Site settings" → "Environment variables"
   - Click "Add a variable"
   - Add these:
     - Variable 1:
       - Key: `OPENROUTER_API_KEY`
       - Value: `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`
     - Variable 2:
       - Key: `SYSTEM_PROMPT`
       - Value: (paste your AllahGPT prompt, or leave it as the default)
   
5. **Redeploy** (to pick up environment variables)
   - Go to "Deploys" tab
   - Click "Trigger deploy" → "Deploy site"

6. **Done!** Visit your site URL (e.g., `your-site-name.netlify.app`)

### Method 2: Drag & Drop (Quick Test)

1. **Zip your files**
   - Make sure you have: `index.html`, `netlify.toml`, and `netlify/` folder
   - Zip them all together

2. **Deploy to Netlify**
   - Go to https://app.netlify.com/drop
   - Drag your zip file
   - Wait for deployment

3. **Add Environment Variables** (same as Method 1, step 4)

4. **Redeploy** (same as Method 1, step 5)

## 🔑 About Environment Variables

Your API key is stored in **Netlify Environment Variables**, NOT in the code. This is:
- ✅ More secure (key isn't visible in code)
- ✅ Works properly with Netlify Functions
- ✅ Can be changed without redeploying

## 🔧 To Change System Prompt

1. Go to Netlify dashboard → Your site → Site settings
2. Click "Environment variables"
3. Find `SYSTEM_PROMPT`
4. Edit the value
5. Trigger a redeploy

## ❓ Troubleshooting

**"API key not configured" error:**
- Make sure you added `OPENROUTER_API_KEY` in environment variables
- Redeploy after adding variables

**404 on chat function:**
- Check that `netlify/functions/chat.js` exists in your repo
- Make sure `netlify.toml` is in the root of your repo
- Redeploy

**CORS errors:**
- Netlify Functions handle CORS automatically, this shouldn't happen
- If it does, try redeploying

**"Function not found":**
- Check folder structure: `netlify/functions/chat.js`
- Make sure you redeployed after adding the function

## 📝 Notes

- Free tier gives you 125k function invocations/month (plenty for personal use)
- Functions have a 10-second timeout on free tier
- Your API key is safe in environment variables (not exposed in browser)

## 🎉 That's It!

Your chat should now work on Netlify with serverless functions instead of PHP!
