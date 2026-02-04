# Task Plan: Smart Training Planner - 30 Features Implementation

**Goal**: Implement the 30 Essential Features for Smart Training Planner, starting with the AI Coach and Data Hub.

## Phase 1: AI Coach Foundation (Mental State Model)
- [ ] Implement `bdi-mental-states` Skill structure
    - [x] Create `src/services/ai/MentalStateModel.js` <!-- id: 1 -->
    - [x] Define Beliefs (Fatigue, Motivation, Weather) <!-- id: 2 -->
    - [x] Define Desires (Prevent Injury, Improve VO2max) <!-- id: 3 -->
    - [x] Define Intentions (Suggest Rest, Push Hard) <!-- id: 4 -->
- [x] Integrate Mental State with `chatService.js` <!-- id: 5 -->
- [x] Create UI for "Brain State" visualization (as per Mockup) <!-- id: 6 -->

## Phase 2: Data Hub Integration (MCP Setup)
- [x] Create `DataHubService.js` (Weather & Aggregation) <!-- id: 8 -->
- [x] Implement Strava Integration hook hooks (Enhanced) <!-- id: 9 -->
- [x] Integrate into `DataHubDashboard` UI <!-- id: 10 -->

## Phase 3: Algorithmic Art Generation
- [x] Implement `algorithmic-art` generation logic <!-- id: 11 -->
- [x] Create "End of Week" visual summary generator <!-- id: 12 -->

## Current Status
- Status: `complete`
- Phase: Phase 4: Whoop Integration (Planning)

## Phase 4: Whoop Integration (Primary Data Source)
- [ ] **Backend: Authentication & Proxy**
    - [x] Create `functions/whoop` for OAuth handlers (`login`, `callback`) <!-- id: 13 -->
    - [x] Implement `fetchWhoopData` Cloud Function (Proxy for Recovery/Sleep/Cycles) <!-- id: 14 -->
    - [x] Implement Token Refresh Logic <!-- id: 15 -->
- [ ] **Frontend: Services & Connections**
    - [x] Create `WhoopService.js` (Frontend API) <!-- id: 16 -->
    - [x] Add "Connect Whoop" Button & Auth Flow in UI <!-- id: 17 -->
- [ ] **Frontend: Dashboard UI**
    - [x] Create `WhoopSummaryCard.jsx` (Recovery, Sleep, Strain visuals) <!-- id: 18 -->
    - [x] Replace `DataHubDashboard` metrics with Whoop data <!-- id: 19 -->
    - [x] Downgrade Strava integration to "Activity Import Only" <!-- id: 20 -->
- [ ] **AI Integration**
    - [x] Feed Whoop Recovery/Sleep data into `MentalStateService` <!-- id: 21 -->
