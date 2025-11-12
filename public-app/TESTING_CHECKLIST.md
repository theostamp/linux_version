# ✅ Testing Checklist

## Pre-Deployment Testing

### 1. Local Development Testing

#### Environment Setup
- [ ] `.env.local` file exists with `API_BASE_URL`
- [ ] Run `npm install` successfully
- [ ] Run `npm run build` successfully (no errors)
- [ ] Run `npm run dev` starts without errors

#### Basic Functionality
- [ ] App loads at `http://localhost:3000`
- [ ] No console errors on initial load
- [ ] No TypeScript errors
- [ ] No linter errors

---

### 2. Authentication Flow Testing

#### Login Page (`/login`)
- [ ] Page loads correctly
- [ ] Email input works
- [ ] Password input works (show/hide password)
- [ ] Login button works
- [ ] Login with valid credentials → redirects to dashboard
- [ ] Login with invalid credentials → shows error message
- [ ] Empty fields → shows validation error
- [ ] OAuth buttons visible (if implemented)

#### Logout
- [ ] Logout button works
- [ ] After logout → redirects to login
- [ ] Tokens cleared from localStorage
- [ ] User data cleared

#### Token Refresh
- [ ] Token refresh works automatically
- [ ] User stays logged in after token refresh
- [ ] Expired token → redirects to login

---

### 3. Dashboard Testing (`/dashboard`)

#### Page Load
- [ ] Dashboard loads after login
- [ ] Welcome message shows user name
- [ ] No console errors
- [ ] Loading states display correctly

#### Components
- [ ] SelectedBuildingInfo displays correctly
- [ ] BuildingStats displays (if no building selected)
- [ ] DashboardCards display with correct counts
- [ ] AnnouncementsCarousel displays (if announcements exist)
- [ ] Stats cards show correct numbers

#### Data Loading
- [ ] Buildings list loads
- [ ] Announcements load
- [ ] Votes load
- [ ] Requests load
- [ ] Obligations summary loads (or shows error gracefully)

#### Navigation
- [ ] Click on announcement card → navigates correctly
- [ ] Click on vote card → navigates correctly
- [ ] Click on request card → navigates correctly
- [ ] Click on building → navigates correctly

---

### 4. Buildings Page Testing (`/buildings`)

#### Page Load
- [ ] Page loads correctly
- [ ] Buildings list displays
- [ ] No console errors

#### Features
- [ ] Search functionality works
- [ ] Filter by city works
- [ ] Sort functionality works (name, city, apartments)
- [ ] Pagination works
- [ ] View mode toggle works (cards/table)
- [ ] Page size selector works

#### Actions
- [ ] Click building card → navigates to building dashboard
- [ ] Click "Διαχείριση" → navigates correctly
- [ ] Edit button works (if admin)
- [ ] Delete button works (if admin) → shows confirmation
- [ ] "Νέο Κτίριο" button navigates (if admin)

#### Building Filter Indicator
- [ ] Shows current building correctly
- [ ] Shows filter status correctly

---

### 5. Announcements Page Testing (`/announcements`)

#### Page Load
- [ ] Page loads correctly
- [ ] Announcements list displays
- [ ] No console errors

#### Features
- [ ] Filters by building correctly
- [ ] Announcement cards display correctly
- [ ] Assembly announcements display with special formatting
- [ ] Date formatting correct
- [ ] Status badges display correctly

#### Actions
- [ ] Click announcement → navigates to detail page
- [ ] "Νέα Ανακοίνωση" button works (if admin)
- [ ] "Νέα Συνέλευση" button works (if admin)
- [ ] Delete button works (if admin) → shows confirmation

#### Detail Page (`/announcements/[id]`)
- [ ] Page loads correctly
- [ ] Announcement content displays
- [ ] Assembly announcements show formatted content
- [ ] File attachment link works (if exists)
- [ ] Back button works

---

### 6. Votes Page Testing (`/votes`)

#### Page Load
- [ ] Page loads correctly
- [ ] Votes list displays
- [ ] No console errors

#### Features
- [ ] Filters by building correctly
- [ ] Vote cards display correctly
- [ ] Status displays correctly (active/ended)
- [ ] Date formatting correct

#### Actions
- [ ] Click vote → navigates to detail page
- [ ] "Νέα Ψηφοφορία" button works (if admin)
- [ ] Delete button works (if admin) → shows confirmation

#### Detail Page (`/votes/[id]`)
- [ ] Page loads correctly
- [ ] Vote details display
- [ ] Choices display correctly
- [ ] Submit vote works (if not voted)
- [ ] View results works
- [ ] Results display correctly

---

### 7. Requests Page Testing (`/requests`)

#### Page Load
- [ ] Page loads correctly
- [ ] Requests list displays
- [ ] No console errors

#### Features
- [ ] Filters work (status, priority, category)
- [ ] Search functionality works
- [ ] Request cards display correctly
- [ ] Status badges display correctly
- [ ] Priority badges display correctly

#### Actions
- [ ] Click request → navigates to detail page
- [ ] "Νέο Αίτημα" button works
- [ ] Delete button works (if admin) → shows confirmation
- [ ] Support/unsupport button works

#### Create Request (`/requests/new`)
- [ ] Form loads correctly
- [ ] All fields work
- [ ] Category selector works
- [ ] Priority selector works
- [ ] Submit creates request successfully
- [ ] Validation works

---

### 8. Error Handling Testing

#### Network Errors
- [ ] Disconnect internet → shows appropriate error
- [ ] Slow connection → loading states display
- [ ] API timeout → shows error message

#### Authentication Errors
- [ ] 401 error → redirects to login
- [ ] Expired token → redirects to login
- [ ] Invalid token → redirects to login

#### Not Found Errors
- [ ] 404 page → shows error message
- [ ] Invalid building ID → shows error
- [ ] Invalid announcement ID → shows error

#### Server Errors
- [ ] 500 error → shows user-friendly message
- [ ] 502 error → shows appropriate message
- [ ] 503 error → shows appropriate message

---

### 9. Responsive Design Testing

#### Desktop (1920x1080)
- [ ] All pages display correctly
- [ ] Sidebar visible
- [ ] Header visible
- [ ] Content properly laid out

#### Laptop (1366x768)
- [ ] All pages display correctly
- [ ] Sidebar visible
- [ ] Content readable

#### Tablet (768x1024)
- [ ] Sidebar collapses to hamburger menu
- [ ] Content adjusts correctly
- [ ] Touch interactions work

#### Mobile (375x667)
- [ ] Sidebar collapses
- [ ] Content stacks vertically
- [ ] Buttons are touch-friendly
- [ ] Forms are usable

---

### 10. Browser Compatibility Testing

#### Chrome (Latest)
- [ ] All features work
- [ ] No console errors
- [ ] Styling correct

#### Firefox (Latest)
- [ ] All features work
- [ ] No console errors
- [ ] Styling correct

#### Safari (Latest)
- [ ] All features work
- [ ] No console errors
- [ ] Styling correct

#### Edge (Latest)
- [ ] All features work
- [ ] No console errors
- [ ] Styling correct

---

## Post-Deployment Testing

### Production URL Testing

After deployment to Vercel:

- [ ] Production URL loads
- [ ] HTTPS works correctly
- [ ] No mixed content warnings
- [ ] All assets load correctly

### API Connectivity

- [ ] API calls go through `/api/*` proxy
- [ ] Backend-proxy routes correctly
- [ ] Railway backend responds
- [ ] CORS works correctly

### Performance

- [ ] Page loads quickly (< 3 seconds)
- [ ] Images load correctly
- [ ] No layout shift
- [ ] Smooth scrolling

---

## Quick Test Script

Run this to test basic connectivity:

```bash
# Test backend connectivity
curl https://linuxversion-production.up.railway.app/api/health

# Test local dev server (if running)
curl http://localhost:3000/api/health
```

---

## Reporting Issues

If you find issues:

1. **Note the page/feature**
2. **Note the browser/device**
3. **Check browser console for errors**
4. **Check Network tab for failed requests**
5. **Take screenshots if possible**
6. **Report with steps to reproduce**

---

## Success Criteria

✅ **Ready for Production if:**
- All authentication tests pass
- All main pages load correctly
- No console errors
- Error handling works gracefully
- Responsive design works
- API connectivity verified

