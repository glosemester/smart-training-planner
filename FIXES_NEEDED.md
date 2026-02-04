# Smart Training Planner - Data Integration Fixes

## 🚨 Critical Issues Found (Feb 4, 2026)

### Issue 1: Whoop Recovery Data Mismatch
**Status**: ❌ CRITICAL
**Impact**: Recovery scores not displaying correctly

**Root Cause**:
- Frontend expects: `whoopData.recovery.records[0].score.recovery_score`
- Whoop API v2 returns: `cycles.records[0].recovery.score.recovery_score`
- `MetricsContext.jsx:65-66` uses wrong data path

**Fix Required**:
```javascript
// BEFORE (MetricsContext.jsx:65-66)
if (whoopData?.recovery?.records?.[0]) {
  return whoopData.recovery.records[0].score?.recovery_score
}

// AFTER - Should use cycles with embedded recovery
if (whoopData?.cycles?.records?.[0]?.recovery?.score) {
  return whoopData.cycles.records[0].recovery.score.recovery_score
}
```

**Alternative**: Use `syncWhoopMetrics` instead of raw API call, which returns proper structure

---

### Issue 2: Strava Data Not Syncing
**Status**: ❌ HIGH PRIORITY
**Impact**: Strava workouts not appearing in Data Hub

**Root Cause**:
- `stravaService.getRecentActivities()` called but data not properly formatted
- No automatic sync of Strava activities to workout log
- DataHub shows connection status but no actual data

**Fix Required**:
1. Create `stravaService.syncActivities()` to import workouts
2. Update `MetricsContext` to properly display Strava metrics
3. Add auto-sync on dashboard load

---

### Issue 3: Metrics Not Persisted
**Status**: ⚠️ MEDIUM PRIORITY
**Impact**: No historical data tracking

**Root Cause**:
- `WhoopService.getWeeklySummary()` fetches raw API data
- Data NOT saved to Firestore
- `syncWhoopMetrics` exists but is NEVER called from frontend

**Fix Required**:
```javascript
// Add to Dashboard useEffect or MetricsContext
useEffect(() => {
  if (userProfile?.integrations?.whoop?.isConnected) {
    // Sync Whoop data to Firestore
    const syncWhoopMetrics = httpsCallable(functions, 'syncWhoopMetrics')
    syncWhoopMetrics().catch(console.error)
  }
}, [userProfile])
```

---

## 💎 "Pro" Upgrades Needed

### 1. Automatic Background Sync ⏰
**What**: Scheduled Cloud Function to sync Whoop/Strava every hour
**Why**: Keep data fresh without user intervention
**Implementation**:
```javascript
// functions/index.js
exports.scheduledWhoopSync = onSchedule({
  schedule: 'every 1 hours',
  timeZone: 'Europe/Oslo'
}, async (event) => {
  // Get all connected users
  const users = await getConnectedWhoopUsers()

  // Sync each user in parallel
  await Promise.all(users.map(user =>
    syncWhoopMetricsForUser(user.uid)
  ))
})
```

**Cost**: ~$0.10/day for 100 active users
**ROI**: Massive UX improvement - always fresh data

---

### 2. Historical Data Analytics 📊
**What**: Store 90 days of metrics for trend analysis
**Why**: Enable:
- HRV trend charts
- Recovery pattern learning (Fase 1 already built!)
- Performance correlation analysis
**Status**: Backend EXISTS (syncWhoopMetrics saves to Firestore), frontend MISSING

**Implementation**:
- Create `<HistoricalChart>` component
- Query Firestore `metrics` collection
- Visualize trends with Recharts

**Cost**: Minimal (~0.1 MB/user/month)

---

### 3. Workout Auto-Import from Strava 🏃
**What**: Automatically create workout entries from Strava activities
**Why**: Eliminate manual logging for outdoor runs

**Implementation**:
```javascript
// functions/strava/autoImport.js
exports.importStravaActivity = onCall(async (request) => {
  const { activityId } = request.data
  const userId = request.auth.uid

  // Fetch activity from Strava
  const activity = await stravaService.getActivity(activityId)

  // Convert to workout format
  const workout = {
    type: 'easy_run',
    date: activity.start_date,
    duration: activity.moving_time / 60,
    running: {
      distance: activity.distance / 1000,
      avgPace: calculatePace(activity),
      elevation: activity.total_elevation_gain
    },
    importedFrom: 'strava',
    stravaId: activityId
  }

  // Save to workouts collection
  await saveWorkout(userId, workout)

  return { success: true, workout }
})
```

**Cost**: Negligible (same as manual entry)
**ROI**: Huge time saver for users

---

### 4. Real-Time Dashboard Updates 🔴
**What**: Live data updates without refresh
**Why**: Modern app experience

**Implementation Options**:
- **Option A**: Firestore real-time listeners (RECOMMENDED)
  - Cost: Free (within quotas)
  - Latency: <100ms
  - Implementation: Replace `useQuery` with `onSnapshot`

- **Option B**: Polling every 5 minutes
  - Cost: Higher function invocations
  - Latency: Up to 5 min
  - Implementation: `setInterval` in MetricsContext

**Recommended**: Option A (Firestore listeners)

---

### 5. Advanced Adaptive Recommendations 🤖
**What**: Use historical metrics in Fase 4 Enhanced Adaptive Engine
**Why**: Currently, engine CAN'T learn patterns because no historical data!

**Status**:
- ✅ Backend analytics built (Fase 1-3)
- ❌ No data to analyze yet
- ❌ Frontend not calling enhanced engine

**Missing Integration**:
```javascript
// Use in TodaysWorkout component
const { getDailyRecommendation } = useTraining()

const recommendation = await getDailyRecommendation()
// Returns: { recovery, injuryRisk, adjustment, mlRecommendation }

// Display recommendation in UI
if (recommendation.adjustment.action === 'ADJUST') {
  showToast(`Reduser dagens økt til ${recommendation.adjustment.workout.duration_minutes} min`)
}
```

---

### 6. Injury Risk Alerts 🚨
**What**: Proactive notifications when risk is HIGH
**Why**: Prevent injuries before they happen

**Implementation**:
- Daily check of injury risk score
- Push notification if risk > 70
- Email summary if risk MODERATE for 3+ days

**Cost**: ~$0.05/user/month (FCM + SendGrid)

---

## 🎯 Recommended Implementation Priority

### Phase 1: Critical Fixes (2-3 hours)
1. ✅ Fix Whoop recovery data path (MetricsContext)
2. ✅ Call syncWhoopMetrics on dashboard load
3. ✅ Fix Strava data display

**Impact**: Makes Data Hub actually work
**Effort**: LOW
**ROI**: CRITICAL

---

### Phase 2: Auto-Sync (1 day)
1. Implement background Whoop/Strava sync
2. Add Firestore real-time listeners
3. Create HistoricalChart component

**Impact**: App feels "pro" and always fresh
**Effort**: MEDIUM
**ROI**: HIGH

---

### Phase 3: Smart Features (2-3 days)
1. Workout auto-import from Strava
2. Integrate Enhanced Adaptive Engine in TodaysWorkout
3. Injury risk alerts

**Impact**: App becomes intelligent and proactive
**Effort**: HIGH
**ROI**: VERY HIGH (differentiator)

---

## 💰 Cost Estimate (Monthly, 100 Active Users)

| Feature | Cost |
|---------|------|
| Background sync (hourly) | $0.10 |
| Firestore reads (real-time) | $0.05 |
| Cloud Functions invocations | $0.15 |
| Firestore storage (90 days metrics) | $0.01 |
| Push notifications | $0.05 |
| **TOTAL** | **$0.36/month** |

**Per User**: $0.0036/month (~3 øre per bruker!)

---

## 🚀 Next Steps

### Immediate Action Required:
1. Fix MetricsContext recovery data path
2. Add syncWhoopMetrics call on dashboard load
3. Test Whoop recovery display
4. Deploy fixes

### Then:
1. Implement Phase 2 (auto-sync)
2. Add historical charts
3. Integrate Fase 4 engine

---

**Created**: February 4, 2026
**Status**: Awaiting implementation
**Priority**: CRITICAL
