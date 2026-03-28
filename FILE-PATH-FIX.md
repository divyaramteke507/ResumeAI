# File Path Fix - Original Resume Display

## Problem

The original resume files weren't displaying because:
1. Database stored original filename: `resume1.pdf`
2. Actual file on disk: `resume1-1774714333015-2679.pdf` (with unique suffix)
3. Browser tried to load `/uploads/run-id/resume1.pdf` → 404 Not Found

## Root Cause

Multer (file upload middleware) adds a unique suffix to prevent filename collisions:
- Original: `resume1.pdf`
- Stored as: `resume1-{timestamp}-{random}.pdf`

The database was storing the original filename, not the actual filename with the suffix.

## Solution

### 1. Backend - Store Correct File Path
**File**: `server/index.js`

Updated the pipeline to store the actual file path:
```javascript
const fullCandidate = {
  ...candidateProfile,
  ...scored,
  filename: file.originalname,  // For display
  filePath: `/uploads/${runId}/${file.filename}`,  // Actual path with suffix
  rawText: resumeDoc.rawText,
  // ...
};
```

### 2. Backend - API to Find Files
**File**: `server/index.js`

Added new endpoint to find actual files for old data:
```javascript
app.get('/api/candidate/:id/file', (req, res) => {
  // Searches uploads directory for matching file
  // Returns actual filename with suffix
});
```

### 3. Frontend - Async File Path Resolution
**File**: `src/main.js`

Made `showSideBySideView` async to call the API:
```javascript
async function showSideBySideView(candidateId) {
  let filePath = candidate.file_path;
  
  if (!filePath) {
    // Call API to find actual file
    const response = await fetch(`/api/candidate/${candidateId}/file`);
    const data = await response.json();
    filePath = data.filePath;
  }
  // ...
}
```

## How It Works Now

### For New Uploads:
1. User uploads `resume.pdf`
2. Multer saves as `resume-1234567890-5678.pdf`
3. Backend stores: `filePath = "/uploads/run-id/resume-1234567890-5678.pdf"`
4. Frontend uses stored path → File loads correctly

### For Existing Data:
1. Frontend checks if `file_path` exists
2. If not, calls `/api/candidate/:id/file`
3. API searches uploads directory for matching file
4. Returns actual filename with suffix
5. Frontend uses returned path → File loads correctly

## File Matching Logic

The API finds files by:
1. Looking in `/uploads/{run_id}/` directory
2. Finding files that start with the original filename
3. Example: `resume1.pdf` matches `resume1-1234567890-5678.pdf`

```javascript
const matchingFile = files.find(f => {
  const fBaseName = path.basename(f, path.extname(f));
  return fBaseName.startsWith(baseName) || f.includes(baseName);
});
```

## Testing

### Test with Existing Data:
1. Open side-by-side view for any candidate
2. Check browser console for debug logs
3. Should see: "Found file via API: /uploads/..."
4. Original file should display correctly

### Test with New Uploads:
1. Upload new resumes
2. Run screening
3. Open side-by-side view
4. Should see: "Stored file_path: /uploads/..."
5. Original file should display immediately

## Console Debug Output

When you open side-by-side view, you'll see:
```
=== Side-by-Side View Debug ===
Candidate: John Doe
File path: /uploads/abc-123/resume1-1234567890-5678.pdf
File extension: pdf
Run ID: abc-123
Original filename: resume1.pdf
Stored file_path: /uploads/abc-123/resume1-1234567890-5678.pdf
================================
```

## Files Modified

1. **server/index.js**
   - Updated `fullCandidate` to include `filePath`
   - Added `/api/candidate/:id/file` endpoint

2. **src/main.js**
   - Made `showSideBySideView` async
   - Added API call to get correct file path
   - Better error handling and logging

## Benefits

1. ✅ Works with existing data (no need to re-upload)
2. ✅ Works with new uploads automatically
3. ✅ Handles all file types (PDF, images, Word docs)
4. ✅ Proper error handling and fallbacks
5. ✅ Detailed console logging for debugging

## Troubleshooting

### If file still doesn't load:

1. **Check console logs** (F12):
   - Look for "Found file via API" or "Using fallback path"
   - Check the file path being used

2. **Verify file exists**:
   ```cmd
   dir uploads\{run-id}
   ```

3. **Test API directly**:
   ```
   http://localhost:5174/api/candidate/{candidate-id}/file
   ```

4. **Check Vite proxy**:
   - Ensure `/uploads` is proxied in `vite.config.js`
   - Restart dev server if you changed config

### Common Issues:

**Issue**: "Cannot GET /uploads/..."
**Solution**: Vite proxy not configured. Check `vite.config.js` has `/uploads` proxy.

**Issue**: "Image failed to load"
**Solution**: File doesn't exist. Check uploads directory or re-upload resumes.

**Issue**: "File not found" from API
**Solution**: Run directory doesn't exist or is empty. Upload resumes for that job.

## Next Steps

For production deployment:
1. Ensure all new uploads store `filePath` correctly
2. Run a migration script to populate `file_path` for old data
3. Consider storing both original and actual filenames in separate columns
4. Add file existence validation before displaying

## Summary

The fix ensures that:
- New uploads work automatically with correct file paths
- Existing data works via API file lookup
- All file types display correctly
- Proper error handling and debugging
- No need to re-upload existing resumes

The original resume files will now display correctly in the side-by-side view! 🎉
