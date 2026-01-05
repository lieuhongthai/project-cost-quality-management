# Installation Guide

## System Requirements

- Node.js 18 or higher
- npm 9 or higher
- 2GB RAM minimum
- 500MB disk space

## Step-by-Step Installation

### 1. Extract the Project

Extract the downloaded `project-cost-quality-management` folder to your desired location.

### 2. Backend Installation

```bash
# Navigate to backend directory
cd project-cost-quality-management/backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Edit .env file and add your OpenAI API key (optional)
# If you don't have an OpenAI key, the system will use fallback template-based commentary
nano .env  # or use any text editor
```

**Important Environment Variables:**
```
PORT=3000
OPENAI_API_KEY=your_openai_api_key_here  # Optional
DATABASE_PATH=./database.sqlite
```

### 3. Frontend Installation

```bash
# Navigate to frontend directory (from project root)
cd ../frontend

# Install dependencies
npm install
```

### 4. Running the Application

#### Option A: Development Mode (Recommended for first time)

**Terminal 1 - Start Backend:**
```bash
cd backend
npm run start:dev
```

Wait for the message: "Application is running on: http://localhost:3000"

**Terminal 2 - Start Frontend:**
```bash
cd frontend
npm run dev
```

Wait for the message showing the frontend URL (usually http://localhost:5173)

#### Option B: Production Mode

**Build Backend:**
```bash
cd backend
npm run build
npm run start:prod
```

**Build Frontend:**
```bash
cd frontend
npm run build
npm run preview
```

### 5. Seed Sample Data (Optional)

To populate the database with sample data:

```bash
cd backend
npx ts-node src/seed.ts
```

This will create:
- A sample project "E-Commerce Platform"
- All 5 development phases
- Sample effort data
- Sample testing metrics

### 6. Access the Application

Open your browser and navigate to:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000/api

## Verification

### Backend Verification

Test the backend by accessing:
```bash
curl http://localhost:3000/api/projects
```

You should see a JSON response with an array of projects.

### Frontend Verification

Open http://localhost:5173 in your browser. You should see:
- Navigation menu (Dashboard, Projects, Reports)
- Dashboard with statistics cards
- If you seeded data, you'll see the sample project

## Troubleshooting

### Port Already in Use

If port 3000 or 5173 is already in use:

**Backend (port 3000):**
Edit `backend/.env`:
```
PORT=3001  # or any available port
```

Then update `frontend/vite.config.ts`:
```typescript
proxy: {
  '/api': {
    target: 'http://localhost:3001',  // Change to new port
    changeOrigin: true,
  },
}
```

**Frontend (port 5173):**
Edit `frontend/vite.config.ts`:
```typescript
server: {
  port: 5174,  // or any available port
}
```

### Database Issues

If you encounter database errors:

```bash
# Delete existing database
rm backend/database.sqlite

# Restart backend (database will be recreated automatically)
cd backend
npm run start:dev
```

### OpenAI API Issues

If AI commentary generation fails:
- The system will automatically fall back to template-based commentary
- Check your API key in `.env`
- Ensure you have credits in your OpenAI account
- Check internet connectivity

### npm Install Fails

If `npm install` fails:

```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Try again
npm install
```

### CORS Issues

If you see CORS errors in browser console:
- Ensure backend is running on port 3000
- Check that frontend proxy is correctly configured
- Restart both backend and frontend

## Next Steps

After successful installation:

1. **Create Your First Project**
   - Navigate to Projects page
   - Click "Add Project"
   - Fill in project details

2. **Add Phases**
   - Open a project
   - Add the 5 development phases
   - Set estimated efforts for each phase

3. **Record Effort**
   - Navigate to a phase
   - Add weekly effort data
   - Use bulk input for multiple weeks

4. **Track Testing**
   - Add testing metrics for test phases
   - System auto-calculates pass rates and defect rates

5. **Generate Reports**
   - Create reports at weekly, phase, or project level
   - Generate AI commentary
   - View metrics and insights

## Default Credentials

This system does not have user authentication in the current version. All data is accessible to anyone with access to the application.

## Support

For issues or questions:
1. Check the README.md for general information
2. Review this installation guide
3. Check the troubleshooting section above

## Updating the Application

To update to a newer version:

```bash
# Pull latest changes (if using git)
git pull

# Update backend dependencies
cd backend
npm install
npm run build

# Update frontend dependencies
cd ../frontend
npm install
npm run build
```

## Uninstallation

To remove the application:

```bash
# Stop all running processes (Ctrl+C in terminals)

# Delete the project folder
rm -rf project-cost-quality-management

# (Optional) Remove global npm cache
npm cache clean --force
```

## Performance Tips

1. **Database Performance**
   - SQLite is suitable for small to medium projects
   - For large datasets, consider migrating to PostgreSQL
   - Regular backup of database.sqlite file

2. **Frontend Performance**
   - Use production build for better performance
   - Clear browser cache if experiencing slow loads
   - Use modern browsers (Chrome, Firefox, Edge)

3. **API Performance**
   - OpenAI API calls may take 5-10 seconds
   - Template-based commentary is instant
   - Consider caching reports for frequently accessed data

## Security Notes

1. **API Keys**
   - Never commit `.env` file to version control
   - Keep OpenAI API key confidential
   - Rotate API keys periodically

2. **Data Security**
   - Database file is stored locally
   - Regular backups recommended
   - No encryption by default in SQLite

3. **Network Security**
   - Application runs on localhost by default
   - Do not expose without proper security measures
   - Use reverse proxy with SSL for production deployment
