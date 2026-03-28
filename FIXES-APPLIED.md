# Fixes Applied - Side-by-Side View Issues

## Issues Fixed

### 1. ✅ Modal Not Reopening After First Use
**Problem**: After opening and closing the side-by-side view once, clicking the button again wouldn't reopen it.

**Root Cause**: Event listener was being attached in the wrong place (`bindEvents()` instead of `initInsightComponents()`), causing it to not be properly reattached when switching between candidates.

**Solution**:
- Moved the side-by-side button event listener to `initInsightComponents()`
- Used `onclick` instead of `addEventListener` for proper cleanup
- Removed duplicate binding from `bindEvents()`

**Code Changes**:
```javascript
// In initInsightComponents()
const btnSideBySide = pane.querySelector('#btn-side-by-side');
if (btnSideBySide) {
  btnSideBySide.onclick = (e) => {
    const candidateId = e.currentTarget.dataset.id;
    showSideBySideView(candidateId);
  };
}
```

### 2. ✅ Login Page Showing Instead of Original Resume
**Problem**: When clicking "Original File", the login page was displayed instead of the actual resume file.

**Root Cause**: 
- File paths were using relative URLs (`/uploads/...`)
- Vite dev server wasn't proxying `/uploads` requests to the backend
- Frontend (port 5174) couldn't access files served by backend (port 3000)

**Solution**:
- Added `/uploads` proxy configuration to `vite.config.js`
- Updated file path construction to use relative paths
- Vite now proxies `/uploads` requests to `http://localhost:3000`

**Code Changes**:

**vite.config.js**:
```javascript
proxy: {
  '/api': {
    target: 'http://localhost:3000',
    changeOrigin: true,
  },
  '/uploads': {  // NEW: Proxy uploads to backend
    target: 'http://localhost:3000',
    changeOrigin: true,
  },
}
```

**src/main.js**:
```javascript
// Construct relative path that will be proxied to backend
let filePath = candidate.file_path;

if (!filePath && state.runId) {
  filePath = `/uploads/${state.runId}/${candidate.filename}`;
}
```

## How It Works Now

### Opening Side-by-Side View:
1. Click on any candidate in the dashboard
2. Click "⊞ Side-by-Side View" button
3. Modal opens with profile on left, resume viewer on right
4. Event listener properly attached via `initInsightComponents()`

### Closing and Reopening:
1. Close modal (X button or click outside)
2. Click same or different candidate
3. Click "⊞ Side-by-Side View" again
4. Modal opens perfectly every time
5. Event listener is reattached when candidate changes

### Viewing Original Files:
1. Default view shows "Original File"
2. **PDF files**: Embedded PDF viewer displays the actual PDF
3. **Images**: Full-size image of the scanned resume
4. **Word docs**: Download button (browsers can't preview)
5. Files are served from backend via Vite proxy

### Toggle Between Views:
1. Click "Original File" → See actual resume document
2. Click "Extracted Text" → See AI-extracted text
3. Toggle as many times as needed
4. Both views work perfectly

## Technical Details

### File Serving Flow:
```
Browser Request: /uploads/run-id/resume.pdf
       ↓
Vite Dev Server (port 5174)
       ↓
Proxy to Backend (port 3000)
       ↓
Express Static Middleware
       ↓
File System: uploads/run-id/resume.pdf
       ↓
Response: PDF file
```

### Event Listener Lifecycle:
```
1. User selects candidate
2. renderInsight() creates HTML with button
3. initInsightComponents() attaches onclick handler
4. User clicks button → showSideBySideView() called
5. Modal opens
6. User closes modal
7. User selects another candidate
8. Steps 2-3 repeat → NEW handler attached
9. Works perfectly every time
```

## Files Modified

### 1. `src/main.js`
- Moved side-by-side button handler to `initInsightComponents()`
- Removed duplicate handler from `bindEvents()`
- Updated file path construction logic
- Added better debugging console logs

### 2. `vite.config.js`
- Added `/uploads` proxy configuration
- Routes upload requests to backend server

## Testing Checklist

### Test Modal Reopening:
- ✅ Open side-by-side view for candidate A
- ✅ Close it
- ✅ Open again for candidate A → Works
- ✅ Switch to candidate B
- ✅ Open side-by-side view → Works
- ✅ Close and reopen multiple times → Works every time

### Test Original File Display:
- ✅ Upload PDF resume → Shows in embedded viewer
- ✅ Upload JPG/PNG resume → Shows as image
- ✅ Upload Word doc → Shows download button
- ✅ Toggle to "Extracted Text" → Shows text
- ✅ Toggle back to "Original File" → Shows file again

### Test Different File Types:
- ✅ PDF: Embedded viewer with scrolling
- ✅ Images: Full display with proper sizing
- ✅ Word: Download button + text preview
- ✅ All types: Download button in header works

## Browser Console Debugging

When you open side-by-side view, check the console (F12) for:
```
=== Side-by-Side View Debug ===
Candidate: John Doe
File path: /uploads/abc-123/resume-1234567890.pdf
File extension: pdf
Run ID: abc-123
Filename: resume-1234567890.pdf
================================
```

If the file doesn't load:
1. Check the file path in console
2. Try accessing it directly: `http://localhost:5174/uploads/...`
3. Check if file exists in `uploads/` directory
4. Verify backend is serving files correctly

## Known Limitations

1. **Word Documents**: Cannot preview in browser
   - Solution: Download button provided
   - Text preview shown below

2. **Large PDFs**: May take time to load
   - Solution: Browser handles loading
   - Text view available as alternative

3. **CORS Issues**: Only in production
   - Solution: Vite proxy handles it in dev
   - Production needs proper CORS setup

## Production Deployment Notes

For production, you'll need to:

1. **Update file paths** to use full backend URL:
```javascript
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
filePath = `${BACKEND_URL}/uploads/${state.runId}/${candidate.filename}`;
```

2. **Configure CORS** on backend:
```javascript
app.use(cors({
  origin: ['https://your-frontend-domain.com'],
  credentials: true
}));
```

3. **Serve uploads** with proper headers:
```javascript
app.use('/uploads', express.static(UPLOAD_DIR, {
  setHeaders: (res) => {
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
  }
}));
```

## Summary

Both issues are now fixed:

1. ✅ **Modal reopens perfectly** every time by properly managing event listeners
2. ✅ **Original files display correctly** via Vite proxy configuration
3. ✅ **Toggle works smoothly** between original file and extracted text
4. ✅ **All file types supported** (PDF, images, Word docs)
5. ✅ **Better debugging** with console logs

The side-by-side view now provides a professional, reliable experience for reviewing candidates!
