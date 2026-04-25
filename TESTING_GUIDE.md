## 🚀 COMPLETE FRONTEND TESTING GUIDE

### ✅ Files Updated/Created:
1. **src/services/lidarApi.ts** - NEW COMPLETE API SERVICE
2. **src/pages/Upload.tsx** - UPDATED WITH REAL API INTEGRATION
3. **src/pages/LidarDashboard.tsx** - UPDATED WITH REAL DATA FETCHING

---

## **BEFORE YOU START TESTING**

### Step 1: Verify Backend is Running
```powershell
# In one terminal, navigate to backend
cd c:\biomass-vision-main\backend

# Start Django development server
python manage.py runserver

# You should see:
# Starting development server at http://127.0.0.1:8000/
```

### Step 2: Start Frontend
```powershell
# In another terminal
cd c:\biomass-vision-main

# Start Vue dev server
npm run dev

# You should see:
# Local:   http://127.0.0.1:5173/
```

---

## **TESTING WORKFLOW**

### **Phase 1: Test Upload Page**

1. **Go to Upload Page**
   - Navigate to: http://localhost:5173/upload
   - Should see:
     ✅ Drag & drop zone (blue dashed border)
     ✅ "Dataset Details" form on right
     ✅ "Metrics Calculated" card

2. **Prepare Test File**
   - You need a `.las` or `.laz` file
   - If you don't have one, use the test file generator below:

   **Option A: Create Test LAS File (Python)**
   ```python
   import laspy
   import numpy as np
   
   # Create a simple LAS file
   las = laspy.create(point_format=2)
   
   # Generate 10,000 random points
   las.x = np.random.uniform(0, 100, 10000)
   las.y = np.random.uniform(0, 100, 10000)
   las.z = np.random.uniform(0, 50, 10000)
   las.classification = np.random.randint(1, 5, 10000)
   
   las.write('test_lidar.las')
   print("Test file created: test_lidar.las")
   ```

   **Option B: Download Real Sample**
   - Search for "sample lidar las file" online
   - Or use OpenTopography (https://cloud.sdsc.edu/v1/AUTH_opentopography)

3. **Test Upload**
   - Fill in "Dataset Name": `Test_Forest_01`
   - Optionally add Description
   - Drag & drop `test_lidar.las` into drop zone
   - Click "Upload & Process"
   
   **Expected Results:**
   ✅ File name shows in drop zone
   ✅ Progress bar appears (0% → 100%)
   ✅ Status changes: uploading → processing → completed
   ✅ Dataset metrics displayed in history:
      - Points: 10,000
      - Density: ~1.0 pts/m²
      - Height Range: 0.0m - 50.0m
   ✅ Success toast: "Dataset processed: 10,000 points found"

4. **Test Multiple Uploads**
   - Upload 2-3 more files with different names
   - Should show in "Processing History" list
   - Each shows individual metrics

5. **Test Error Cases**
   - Try uploading with no dataset name → Error toast
   - Try uploading .txt file → File validation error
   - Try uploading file >500MB → Size error
   - No file selected → Upload button disabled

---

### **Phase 2: Test LiDAR Dashboard**

1. **Navigate to Dashboard**
   - Click: http://localhost:5173/lidar
   - Or navigate from menu
   
   **Expected Results:**
   ✅ Shows loading spinner initially
   ✅ Once loaded, shows:
      - Dataset name in header
      - 5 metric cards:
        • Total Points: X.XXM
        • Point Density: X.X pts/m²
        • Min Height: X.Xm
        • Max Height: X.Xm
        • Compartments: 100

2. **View 3D Point Cloud**
   - Should see 3D viewer on left (canvas)
   - Blue/cyan/green colored points
   - Can rotate with mouse

3. **View Compartment Table**
   - Click "Compartments" tab
   - Shows table with columns:
     • Compartment name
     • Area (hectares)
     • Avg Height
     • Max Height
     • Canopy Cover (%)
     • P95 percentile
     • Height Diversity
   
   **Expected:** 100 rows (10x10 grid)

4. **View Statistics**
   - Click "Statistics" tab
   - Shows 6 aggregate cards:
     • Avg Canopy Height
     • Avg Canopy Cover
     • Total Area
     • Max Crown Volume
     • Avg Diversity
     • P95 Average
   
   **Expected:** Real numbers, not zeros

5. **Test Refresh**
   - Click "Refresh" button
   - Should reload data
   - Spinner appears briefly

6. **Test Error Handling**
   - Stop backend, reload page
   - Should show red error banner:
     "Error: Failed to connect to API"

---

## **API ENDPOINTS BEING CALLED**

From the frontend, you should see these requests in browser DevTools (F12 → Network tab):

```
GET  http://localhost:8000/api/lidar/datasets/
     → Response: List of all datasets with metrics

GET  http://localhost:8000/api/lidar/compartments/?dataset=1
     → Response: GeoJSON with 100 compartments
     
POST http://localhost:8000/api/lidar/datasets/upload/
     → Request: FormData with file, name, description
     → Response: Dataset object with metrics
```

---

## **EXPECTED METRICS IN RESPONSES**

### Upload API Response:
```json
{
  "id": 1,
  "name": "Test_Forest_01",
  "description": "Test",
  "file_size": 120000,
  "upload_date": "2026-03-30T10:30:00Z",
  "processed": true,
  "processing_status": "completed",
  "point_count": 10000,
  "min_height": 0.0,
  "max_height": 50.0,
  "avg_point_density": 1.0,
  "extent": {...}
}
```

### Compartments API Response:
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "id": 1,
        "name": "Test_Forest_01_Comp_0_0",
        "area_hectares": 0.25,
        "canopy_height_mean": 24.8,
        "canopy_height_max": 42.3,
        "canopy_cover_percent": 87.5,
        "height_percentile_95": 38.2,
        "height_percentile_75": 28.5,
        "height_percentile_50": 15.3,
        "crown_volume": 245.8,
        "foliage_height_diversity": 12.4
      },
      "geometry": {...}
    }
  ]
}
```

---

## **DEBUGGING CHECKLIST**

If something doesn't work:

### ❌ Upload fails with "Upload failed"
- [ ] Check backend is running: http://localhost:8000
- [ ] Check backend has no errors in console
- [ ] Check file size < 500MB
- [ ] Check file is .las or .laz

### ❌ Dashboard shows "No datasets found"
- [ ] Have you uploaded at least one file?
- [ ] Check if upload actually completed
- [ ] Refresh page and try again

### ❌ Compartments tab is empty
- [ ] Backend must process file first
- [ ] Check dataset.processed = true
- [ ] Run: `python manage.py test lidar_app -v 2`

### ❌ Metrics show as 0
- [ ] Check the point cloud has variety in heights
- [ ] Test file must have points at different elevations
- [ ] Try with more than 1000 points

### ❌ Cannot connect to backend
- [ ] Backend running? `http://localhost:8000/api/lidar/datasets/`
- [ ] Check CORS settings in settings.py
- [ ] Check firewall isn't blocking port 8000

### ❌ Console shows TypeScript errors
- [ ] Run: `npm run build` to check for compilation errors
- [ ] Check all imports are correct
- [ ] Restart dev server: `npm run dev`

---

## **QUICK TEST COMMANDS**

```powershell
# Test backend API directly
curl http://localhost:8000/api/lidar/datasets/

# Check backend is running
curl http://localhost:8000/

# Kill and restart servers
# Backend
python manage.py runserver

# Frontend  
npm run dev
```

---

## **SUCCESS CRITERIA**

✅ Upload page loads
✅ Can drag & drop .las file
✅ Upload completes with real metrics shown
✅ History shows dataset with point count
✅ Dashboard loads with data
✅ Dashboard shows 5 metric cards with real numbers
✅ Compartments table shows 100 rows
✅ Statistics tab shows real aggregate values
✅ Can refresh dashboard
✅ Error handling works

---

## **WHAT'S DIFFERENT FROM BEFORE**

| Feature | Before | After |
|---------|--------|-------|
| Upload | Simulated (fake progress) | Real API call |
| Metrics | Static values | Real values from backend |
| Dashboard | Mock data | Real datasets from DB |
| Compartments | Empty | 100 real compartments with metrics |
| Error Handling | None | Proper error messages & toasts |
| Data Flow | Frontend only | Full Frontend ↔ Backend integration |

---

Need help? Check the backend logs or browser DevTools (F12 → Console)!
