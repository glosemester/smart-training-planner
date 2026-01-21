# Firestore Security Rules Deployment

## Issue Fixed
The app was showing "Missing or insufficient permissions" when adding meals because Firestore security rules were not configured.

## Solution
Created `firestore.rules` with proper security rules that allow authenticated users to read and write their own data.

## How to Deploy

### Option 1: Using Firebase Console (Recommended)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to **Firestore Database** → **Rules**
4. Copy the contents of `firestore.rules` and paste into the console
5. Click **Publish**

### Option 2: Using Firebase CLI

```bash
# Login to Firebase (if not already logged in)
firebase login

# Initialize Firebase project (if not already done)
firebase init

# Select your project
firebase use --add

# Deploy Firestore rules only
firebase deploy --only firestore:rules
```

## What the Rules Do

The security rules ensure that:
- Only authenticated users can access data
- Users can only read/write their own data (under `/users/{userId}`)
- All subcollections (workouts, meals, trainingPlans) inherit the same permissions
- Unauthorized access is denied

## Verify Deployment

After deploying, test by:
1. Opening the app
2. Navigating to the Nutrition section
3. Try adding a meal
4. The error should be gone!
