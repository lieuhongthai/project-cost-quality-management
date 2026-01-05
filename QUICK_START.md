# Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Step 1: Installation (2 minutes)

```bash
# Backend
cd backend
npm install
cp .env.example .env
# Edit .env and add your OpenAI API key (optional)

# Frontend
cd ../frontend
npm install
```

### Step 2: Start the Application (1 minute)

**Terminal 1 - Backend:**
```bash
cd backend
npm run start:dev
```

Wait for: `Application is running on: http://localhost:3000`

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

Wait for: `Local: http://localhost:5173`

### Step 3: Add Sample Data (Optional, 1 minute)

```bash
cd backend
npx ts-node src/seed.ts
```

This creates:
- 1 sample project: "E-Commerce Platform"
- 5 phases with data
- Weekly effort records
- Testing metrics

### Step 4: Open the Application (1 minute)

Open your browser: **http://localhost:5173**

You should see:
- Dashboard with project statistics
- Sample project (if you seeded data)
- Navigation menu

---

## 🎯 Your First Tasks

### Task 1: Create Your First Project (2 minutes)

1. Click **"Projects"** in the navigation menu
2. Click **"Add Project"** button
3. Fill in the form:
   - **Name**: "My First Project"
   - **Description**: "Testing the system"
   - **Start Date**: Today's date
   - **Estimated Effort**: 10 (man-months)
4. Click **"Create Project"**

✅ **Result**: You'll see your project in the list!

### Task 2: Add Development Phases (3 minutes)

1. Click on your project name to open **Project Detail**
2. Go to the **"Phases"** tab
3. Click **"Add Phase"** button
4. Add each phase:

**Phase 1: Functional Design**
- Estimated Effort: 2 MM
- Start Date: Today

**Phase 2: Coding**
- Estimated Effort: 4 MM
- Start Date: 2 weeks from now

**Phase 3: Unit Test**
- Estimated Effort: 1.5 MM
- Start Date: 6 weeks from now

**Phase 4: Integration Test**
- Estimated Effort: 1.5 MM
- Start Date: 8 weeks from now

**Phase 5: System Test**
- Estimated Effort: 1 MM
- Start Date: 10 weeks from now

✅ **Result**: All 5 phases created with progress tracking!

### Task 3: Track Weekly Effort (2 minutes)

1. From **Project Detail**, click on **"Functional Design"** phase
2. You'll be redirected to **Phase Detail** page
3. In the **"Efforts"** tab, click **"Add Effort"**
4. Fill in:
   - **Week Start Date**: This Monday
   - **Planned Effort**: 0.5 MM
   - **Actual Effort**: 0.6 MM (you worked a bit more)
   - **Progress**: 25% (first week done)
5. Click **"Add Effort"**

✅ **Result**: You can see your effort record in the table!

### Task 4: Record Testing Metrics (2 minutes)

1. Go to **"Unit Test"** phase (create it if you haven't)
2. Switch to the **"Testing"** tab
3. Click **"Add Testing Data"**
4. Fill in:
   - **Week Start Date**: Select a Monday
   - **Total Test Cases**: 100
   - **Passed**: 92
   - **Failed**: 8
   - **Testing Time**: 50 hours
   - **Defects Detected**: 12
5. Click **"Add Testing Data"**

✅ **Result**: System auto-calculates pass rate (92%) and defect rate!

### Task 5: View Progress Charts (1 minute)

1. Stay in the **Phase Detail** page
2. Scroll up to see the **"Effort Trend"** chart
3. Switch to **"Testing"** tab
4. See the **"Testing Quality Trend"** chart

✅ **Result**: Visual representation of your progress!

---

## 🎨 Understanding the Interface

### Dashboard
- **Top Cards**: Total projects, active, completed, at risk
- **Project Cards**: Click to view details
- **Status Badges**: Color-coded (Green=Good, Yellow=Warning, Red=At Risk)

### Project Detail Page
- **Overview Tab**: Project info and phase summary
- **Phases Tab**: Detailed phase list with metrics
- **Settings Tab**: Project configuration (coming soon)

### Phase Detail Page
- **Stats Cards**: Key metrics at a glance
- **Efforts Tab**: Weekly effort tracking + chart
- **Testing Tab**: Quality metrics + chart

---

## 💡 Pro Tips

### 1. Weekly Updates
- Update every Monday morning
- Keep actual effort close to planned
- Update progress percentage based on completed work

### 2. Testing Metrics
- Record after each test run
- Track trends to identify quality issues
- Aim for >95% pass rate (status: Good)

### 3. Project Health
- **Good Status**: SPI ≥ 0.95, CPI ≥ 0.95
- **Warning**: SPI ≥ 0.85, CPI ≥ 0.85
- **At Risk**: SPI < 0.85 or CPI < 0.85

### 4. Navigation Tips
- Click project name → Project Detail
- Click phase card → Phase Detail
- Use browser back button to navigate back

---

## 🔧 Keyboard Shortcuts

- `Esc` - Close modal dialogs
- `Tab` - Navigate form fields
- Browser navigation works normally

---

## 📊 Sample Data Explanation

If you ran the seed command, you have:

**E-Commerce Platform Project**
- Estimated: 24 man-months
- Status: Good
- 5 phases with varying progress

**Functional Design Phase**
- 6 weeks of effort data
- Completed phase
- Slightly over budget

**Unit Test Phase**
- 4 weeks of testing data
- Improving pass rate trend
- Defect rate decreasing

---

## 🐛 Troubleshooting

### Backend not starting?
```bash
# Check if port 3000 is in use
lsof -i :3000

# Kill the process if needed
kill -9 <PID>

# Restart backend
npm run start:dev
```

### Frontend not starting?
```bash
# Check if port 5173 is in use
lsof -i :5173

# Kill and restart
kill -9 <PID>
npm run dev
```

### No data showing?
1. Check backend console for errors
2. Check browser console (F12)
3. Verify backend is running on port 3000
4. Try refreshing the page (Ctrl+R)

### Forms not submitting?
1. Check all required fields (marked with *)
2. Verify dates are valid
3. Check browser console for errors
4. Make sure backend is running

---

## 📚 What's Next?

### Learn More
- Read [README.md](README.md) for full documentation
- Check [INSTALLATION.md](INSTALLATION.md) for detailed setup
- See [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md) for architecture details
- Review [CHANGELOG.md](CHANGELOG.md) for latest features

### Explore Features
1. **Reports** (coming soon): Generate project reports with AI commentary
2. **Advanced Charts**: More visualization options
3. **Export**: Download reports as PDF
4. **Team Management**: Multi-user support

### Customize
- Modify colors in `tailwind.config.js`
- Add custom metrics in backend
- Create new chart types
- Extend the forms

---

## 🎉 Congratulations!

You've completed the quick start guide! You now know:
- ✅ How to create projects
- ✅ How to add phases
- ✅ How to track effort
- ✅ How to record testing metrics
- ✅ How to view progress charts

**Ready to manage your real projects?** Start entering your actual project data!

---

## 💬 Need Help?

- Review the documentation files
- Check the troubleshooting section
- Look at the sample data for examples
- Experiment with the UI - it's safe to test!

**Happy Project Management! 🚀**
