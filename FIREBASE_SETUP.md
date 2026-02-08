# Firebase Setup Instructions

## Backend Setup

1. Go to Firebase Console: https://console.firebase.google.com/
2. Select your project: `advance-firebase-36074`
3. Go to **Project Settings** → **Service Accounts**
4. Click **Generate New Private Key**
5. Download the JSON file
6. Rename it to `firebase-service-account.json`
7. Place it in: `server/config/firebase-service-account.json`

**IMPORTANT**: Never commit this file to Git. It's already in `.gitignore`

## Flutter Setup

1. Go to Firebase Console
2. Add Android app with package name: `digi.coders.aution_here`
3. Download `google-services.json`
4. Place it in: `android/app/google-services.json`
5. Run: `flutterfire configure --project=advance-firebase-36074`

## Notification Types

- 🔴 **Auction Live** - When auction starts
- 💰 **New Bid** - When seller receives a bid
- ⚠️ **Outbid** - When someone places higher bid
- 🎉 **Bid Won** - When user wins auction
- ✅ **Auction Ended** - When seller's auction completes
