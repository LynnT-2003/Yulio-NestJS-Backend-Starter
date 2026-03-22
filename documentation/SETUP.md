# Setup Guide

This guide gets you from zero to a fully running app on your Mac. Follow every step in order.

> For environment variable details, Google OAuth, MongoDB Atlas, and Vercel — see **README.md**.

---

## What you are setting up

This is the backend server for your app. It handles user accounts, login, OAuth sign-in (Google, LINE, GitHub, Discord, Microsoft), and all your data. Once running, you test everything through a visual interface in your browser called Swagger.

---

## Step 1 — Install Homebrew

Homebrew installs tools on your Mac. Open **Terminal** (press `Command + Space`, type `Terminal`, press Enter) and paste:

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

Press Enter. Type your Mac password when asked (nothing shows on screen — that is normal). Wait 2–5 minutes.

---

## Step 2 — Install Node.js

```bash
brew install node
```

Verify it worked:

```bash
node --version
```

You should see something like `v20.x.x` or higher. If you do, continue.

---

## Step 3 — Install Git

```bash
brew install git
```

---

## Step 4 — Install Claude Code

```bash
npm install -g @anthropic/claude-code
```

Then log in:

```bash
claude
```

Follow the instructions to connect your Anthropic account.

---

## Step 5 — Download the project

```bash
cd ~/Desktop
git clone YOUR_REPOSITORY_URL
cd YOUR_PROJECT_FOLDER_NAME
```

Replace `YOUR_REPOSITORY_URL` with the GitHub link (e.g. `https://github.com/your-org/your-repo.git`).
Replace `YOUR_PROJECT_FOLDER_NAME` with the folder name that was created.

---

## Step 6 — Install project dependencies

```bash
npm install
```

Wait 1–3 minutes until it finishes.

---

## Step 7 — Set up environment variables

```bash
cp .env.example .env
open .env
```

This opens the `.env` file in TextEdit. Fill in the values — see **README.md** for where to get each one. The critical ones:

| Variable | Where to get it |
| --- | --- |
| `MONGO_USERNAME` | MongoDB Atlas → Database Access (see README.md → MongoDB Atlas Setup) |
| `MONGO_PASSWORD` | Same as above |
| `MONGO_CLUSTER_URI` | MongoDB Atlas → Connect → Drivers (see README.md) |
| `MONGO_DB_NAME` | Pick any name, e.g. `myapp-dev` |
| `JWT_ACCESS_SECRET` | Any random string, at least 32 characters |
| `JWT_REFRESH_SECRET` | Any random string, at least 32 characters (different from above) |

Save (`Command + S`) and close.

---

## Step 8 — Start the server

```bash
npm run start:dev
```

When you see this, it is ready:

```
🚀 Application is running on: http://localhost:8080
📚 Swagger documentation: http://localhost:8080/api/docs
```

Do not close Terminal while the server is running.

---

## Step 9 — Open Swagger

Open your browser and go to:

```
http://localhost:8080/api/docs
```

This is where you test every API endpoint.

---

## How to test the API in Swagger

### Register an account

1. Find **POST /api/auth/register** → click **Try it out**
2. Fill in your details (the example values are pre-filled) → click **Execute**
3. In the response body, copy the `accessToken` value

### Log in to Swagger

1. Click the **Authorize** button at the top right of the page
2. Paste the `accessToken` you copied
3. Click **Authorize** → **Close**
4. All protected routes now work as your logged-in user

### Test your profile

Click **GET /api/users/me** → **Try it out** → **Execute**. You should see your user profile in the response.

---

## Deploy to Vercel

> See **README.md → Vercel Deployment** for the full guide.

Quick deploy:

```bash
npm install -g vercel
vercel login
vercel --prod
```

After deploying, go to your Vercel project → **Settings** → **Environment Variables** and add every variable from `.env.example` with production values. Then redeploy:

```bash
vercel --prod
```

---

## Using Claude Code to build features

Claude Code reads your entire codebase and builds features for you. Start a session:

```bash
cd ~/Desktop/YOUR_PROJECT_FOLDER_NAME
claude
```

Then describe what you want in plain English:

```
"Add a products module where users can create and manage products with a name, price, and description"
"Add a tasks module with title, status, and assignee"
"Add an endpoint to invite a user to a project by email"
"Add a comments feature to tasks"
"Fix the error in the terminal"
"Revert the last changes"
```

Claude Code will read the codebase, follow the existing patterns (defined in CLAUDE.md), and write everything for you. The server restarts automatically when files change. Test in Swagger when done.

### Tips for better results

- Be specific: `"Add a projects module with name, description, and owner"` works better than `"Add projects"`
- One feature at a time — let Claude finish, test it in Swagger, then ask for the next thing
- If something breaks, just say: `"Fix the errors showing in the terminal"`
- To undo: `"Revert the last changes you made"`

---

## Troubleshooting

**"command not found: node"**
Close Terminal, open it again, and try `node --version`. If still failing, repeat Step 2.

**"Cannot connect to database"**
Check your `.env` file has the correct MongoDB values (`MONGO_USERNAME`, `MONGO_PASSWORD`, `MONGO_CLUSTER_URI`, `MONGO_DB_NAME`). See README.md → MongoDB Atlas Setup. Make sure your IP is whitelisted in Atlas → Network Access.

**"Port already in use"**

```bash
lsof -ti:8080 | xargs kill -9
```

Then run `npm run start:dev` again. Replace `8080` with the port number shown in the error if different.

**Server shows errors after Claude Code makes changes**
Open Claude Code and say: `"Fix the errors showing in the terminal"`.

**Something broke and I want to undo**
Open Claude Code and say: `"Revert the last changes you made"`.

**Google login not working**
See README.md → Google OAuth Setup. LINE, GitHub, Discord, Microsoft setup guides: `documentation/{PROVIDER}.md`.
