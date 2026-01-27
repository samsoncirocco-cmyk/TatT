# TatTester App Store Launch Guide

**Current Status:** React web app (Phase 0)
**Goal:** Native iOS/Android apps on App Store & Google Play
**Timeline Estimate:** 8-12 weeks for MVP launch

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Phase 1: React Native Migration](#phase-1-react-native-migration)
3. [Phase 2: iOS App Store Submission](#phase-2-ios-app-store-submission)
4. [Phase 3: Google Play Store Submission](#phase-3-google-play-store-submission)
5. [Timeline & Budget](#timeline--budget)
6. [Next Steps](#next-steps)

---

## Prerequisites

### Apple Requirements

#### 1. Apple Developer Account
- **Cost:** $99/year (USD)
- **Sign up:** https://developer.apple.com/programs/
- **What you get:**
  - Access to App Store Connect
  - Code signing certificates
  - TestFlight for beta testing
  - App analytics and insights

#### 2. Hardware Requirements
- **Mac computer** (required for iOS builds)
  - MacBook Pro/Air or Mac Mini
  - macOS Ventura (13.0) or later
  - Xcode 15+ installed (free from Mac App Store)

#### 3. Legal Requirements
- **Business entity** (LLC, Corporation, or Sole Proprietorship)
- **Tax ID / EIN** (for revenue reporting)
- **Privacy Policy** (publicly accessible URL)
- **Terms of Service** (publicly accessible URL)
- **COPPA compliance** (if app targets children under 13)

### Google Requirements

#### 1. Google Play Developer Account
- **Cost:** $25 one-time fee
- **Sign up:** https://play.google.com/console/signup
- **What you get:**
  - Access to Play Console
  - App distribution
  - Beta testing tracks
  - User reviews and analytics

#### 2. Hardware Requirements
- **Any computer** (Mac, Windows, or Linux)
- Android Studio installed (free)
- Android SDK and emulator

#### 3. Legal Requirements
- Same as Apple (Privacy Policy, Terms of Service, Tax ID)

---

## Phase 1: React Native Migration

**Duration:** 4-6 weeks
**Current Status:** Web app needs conversion to native

### 1.1 Choose Your Approach

You have **3 options** for going native:

#### Option A: React Native CLI (Recommended for TatTester)
**Pros:**
- Full native control (camera, AR, push notifications)
- Best performance for AI/camera features
- Direct access to native APIs
- No third-party platform dependencies

**Cons:**
- Requires Mac for iOS builds
- More setup complexity
- Need to manage native code

**Best for:** Apps with complex native features (like TatTester's AR + camera)

#### Option B: Expo (Managed Workflow)
**Pros:**
- Faster initial setup
- Handles most native code for you
- Built-in OTA updates
- Easier for beginners

**Cons:**
- Limited native module support
- May not support all AR features
- App size larger
- Less control over native code

**Best for:** Simpler apps without heavy native requirements

#### Option C: PWA (Progressive Web App)
**Pros:**
- No app store submission needed
- Works on all platforms
- Instant updates

**Cons:**
- Limited native features (camera access restricted)
- No App Store visibility
- Can't access iOS AR frameworks
- Not a "real" app experience

**Verdict:** ❌ Not recommended for TatTester (needs camera + AR)

### 1.2 Recommended: React Native CLI Setup

Since TatTester requires **camera access** and **AR visualization**, we should use **React Native CLI**.

#### Step 1: Install React Native CLI

```bash
# Install Node.js dependencies
npm install -g react-native-cli

# Install iOS dependencies (Mac only)
brew install cocoapods
brew install watchman

# Install Android dependencies
# Download Android Studio from https://developer.android.com/studio
```

#### Step 2: Initialize React Native Project

```bash
# Create new React Native app (or migrate existing)
cd /Users/ciroccofam/my-project/
npx react-native init TatTesterMobile --template react-native-template-typescript

# Or use existing mobile/ folder if already created
cd mobile/
```

#### Step 3: Migrate Core Features

**Priority Migration Order:**

1. **Navigation** (React Router → React Navigation)
   ```bash
   npm install @react-navigation/native @react-navigation/stack
   npm install react-native-screens react-native-safe-area-context
   ```

2. **Camera & Image Handling**
   ```bash
   npm install react-native-vision-camera
   npm install react-native-image-picker
   npm install react-native-image-resizer
   ```

3. **AI Generation** (Replicate API - keep existing service)
   ```bash
   # No changes needed - replicateService.js works in React Native
   npm install axios
   ```

4. **AR Visualization** (NEW - native only)
   ```bash
   # iOS: Use ARKit via react-native-arkit
   npm install react-native-arkit

   # Android: Use ARCore via @react-native-community/geolocation
   npm install @react-native-community/arcore
   ```

5. **Local Storage** (localStorage → AsyncStorage)
   ```bash
   npm install @react-native-async-storage/async-storage
   ```

6. **Design System** (Tailwind → NativeWind or StyleSheet)
   ```bash
   # Option A: NativeWind (Tailwind for React Native)
   npm install nativewind
   npm install --save-dev tailwindcss

   # Option B: Styled Components (more native approach)
   npm install styled-components
   ```

#### Step 4: Update API Services

The following files can be reused **as-is** in React Native:
- ✅ `src/services/replicateService.js` (API calls work the same)
- ✅ `src/services/inpaintingService.js`
- ✅ `src/utils/matching.js` (matching algorithm)
- ✅ `src/data/artists.json`
- ✅ `src/config/promptTemplates.js`

The following need **minor updates**:
- ⚠️ `src/services/designLibraryService.js` (localStorage → AsyncStorage)
- ⚠️ `src/services/imageProcessingService.js` (Canvas API → react-native-image-manipulator)
- ⚠️ `src/services/stencilService.js` (Canvas API → native image processing)

The following need **complete rewrites**:
- ❌ All `.jsx` components (React DOM → React Native components)
- ❌ Camera implementation (browser API → react-native-vision-camera)
- ❌ AR overlay (CSS → ARKit/ARCore)

### 1.3 Code Migration Strategy

#### Convert React Components to React Native

**Before (Web - `src/pages/Home.jsx`):**
```jsx
<div className="min-h-screen bg-white">
  <h1 className="text-5xl font-bold">TatTester</h1>
  <button onClick={handleClick}>Get Started</button>
</div>
```

**After (React Native - `mobile/src/screens/HomeScreen.tsx`):**
```tsx
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

<View style={styles.container}>
  <Text style={styles.heading}>TatTester</Text>
  <TouchableOpacity onPress={handleClick}>
    <Text>Get Started</Text>
  </TouchableOpacity>
</View>

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  heading: { fontSize: 48, fontWeight: 'bold' }
});
```

#### Convert localStorage to AsyncStorage

**Before (Web):**
```javascript
localStorage.setItem('designs', JSON.stringify(designs));
const saved = JSON.parse(localStorage.getItem('designs'));
```

**After (React Native):**
```javascript
import AsyncStorage from '@react-native-async-storage/async-storage';

await AsyncStorage.setItem('designs', JSON.stringify(designs));
const saved = JSON.parse(await AsyncStorage.getItem('designs'));
```

### 1.4 Testing Your React Native App

```bash
# iOS (requires Mac)
cd mobile/
npx react-native run-ios

# Android
npx react-native run-android

# Or use Expo if you chose that route
npx expo start
```

---

## Phase 2: iOS App Store Submission

**Duration:** 2-3 weeks (after React Native migration)

### 2.1 Prepare App Assets

#### App Icon (Required Sizes)
- **1024x1024px** (App Store)
- **180x180px** (iPhone)
- **120x120px** (iPhone smaller)
- **167x167px** (iPad Pro)
- **152x152px** (iPad)
- **76x76px** (iPad smaller)

**Tool:** Use https://appicon.co/ to generate all sizes

#### Screenshots (Required)
- **6.7" iPhone 15 Pro Max:** 1290 x 2796px (at least 3 screenshots)
- **6.5" iPhone 14 Plus:** 1284 x 2778px
- **5.5" iPhone 8 Plus:** 1242 x 2208px
- **12.9" iPad Pro:** 2048 x 2732px (if supporting iPad)

**Tip:** Use screenshots from actual devices or simulator

#### App Preview Videos (Optional but Recommended)
- **6.7" iPhone:** 1920 x 886px, 30 seconds max
- Shows key features (AI generation, AR visualization, artist matching)

### 2.2 App Store Connect Setup

#### Step 1: Create App Record

1. Go to https://appstoreconnect.apple.com/
2. Click **"My Apps"** → **"+"** → **"New App"**
3. Fill out:
   - **Platform:** iOS
   - **Name:** TatTester (must be unique in App Store)
   - **Primary Language:** English
   - **Bundle ID:** `com.tattester.app` (must match Xcode)
   - **SKU:** `TATTESTER001` (internal ID, your choice)
   - **User Access:** Full Access

#### Step 2: App Information

- **Category:**
  - Primary: **Lifestyle** or **Graphics & Design**
  - Secondary: **Productivity**
- **Content Rights:** You own the rights
- **Age Rating:** Complete questionnaire (likely 12+ due to tattoo content)

#### Step 3: Pricing and Availability

- **Price:** Free (with in-app purchases later for premium features)
- **Availability:** All countries (or select specific regions)

### 2.3 Build and Upload Your App

#### Step 1: Configure Xcode Project

```bash
cd mobile/ios/
open TatTesterMobile.xcworkspace
```

In Xcode:
1. Select your project → **Signing & Capabilities**
2. **Team:** Select your Apple Developer account
3. **Bundle Identifier:** `com.tattester.app`
4. Enable **Automatically manage signing**

#### Step 2: Set App Version

In `ios/TatTesterMobile/Info.plist`:
```xml
<key>CFBundleShortVersionString</key>
<string>1.0.0</string>
<key>CFBundleVersion</key>
<string>1</string>
```

#### Step 3: Archive and Upload

In Xcode:
1. Select **Generic iOS Device** (not simulator)
2. **Product** → **Archive**
3. Wait for build to complete (~5-10 minutes)
4. **Window** → **Organizer**
5. Select your archive → **Distribute App**
6. Choose **App Store Connect**
7. Click **Upload**

**Alternative:** Use Fastlane (automated)
```bash
brew install fastlane
cd mobile/
fastlane init
fastlane release
```

### 2.4 Submit for Review

#### Step 1: Complete App Store Listing

In App Store Connect:

**App Information:**
- **Name:** TatTester - AI Tattoo Design
- **Subtitle:** Design, Visualize, Match Artists
- **Description:**
  ```
  TatTester helps first-time tattoo seekers overcome commitment anxiety through:

  🎨 AI Design Generation
  Generate custom tattoo designs with 4 professional AI models (SDXL, Anime XL, DreamShaper, Tattoo Flash Art)

  📸 AR Visualization
  See your design on your body with advanced camera overlay technology

  💡 Smart Artist Matching
  Match with local artists based on style, location, and budget

  ✨ Professional Stencils
  Export 300 DPI tattoo-ready stencils for artists

  Perfect for first-timers nervous about commitment. Try designs risk-free before booking!
  ```

- **Keywords:** `tattoo, design, ai, generator, artist, ink, custom, stencil, preview, ar`
- **Support URL:** `https://tattester.com/support`
- **Marketing URL:** `https://tattester.com` (optional)
- **Privacy Policy URL:** `https://tattester.com/privacy` (REQUIRED)

**App Preview & Screenshots:**
- Upload your 3-5 screenshots per device size
- Upload app preview videos (if created)

**App Review Information:**
- **First Name / Last Name:** Your name
- **Phone / Email:** Contact for App Review team
- **Demo Account:** Provide test credentials if app requires login
- **Notes:**
  ```
  TatTester requires camera permissions for AR tattoo visualization.
  Replicate AI API key is required for design generation (already configured).
  ```

**Version Information:**
- **Copyright:** 2025 TatTester LLC
- **Age Rating:** 12+ (Infrequent/Mild Realistic Violence - tattoo imagery)

#### Step 2: Submit for Review

1. Click **"Add for Review"**
2. Select your uploaded build
3. **Export Compliance:**
   - Does your app use encryption? **No** (unless you add payment processing)
4. **Advertising Identifier (IDFA):**
   - Does your app use IDFA? **No** (unless you add ad tracking)
5. Click **"Submit for Review"**

### 2.5 App Review Process

**Timeline:**
- **Average:** 24-48 hours
- **Complex apps:** Up to 7 days
- **Rejections:** Common on first try (don't panic!)

**Common Rejection Reasons:**

1. **Crash on Launch**
   - Solution: Test thoroughly on real device before submission

2. **Incomplete Information**
   - Solution: Ensure Privacy Policy is accessible and complete

3. **Requires Hardware Not Available**
   - Solution: Provide demo video if app requires specific features

4. **Design Spam (looks too simple)**
   - Solution: Ensure app has substantial functionality

5. **Metadata Rejected (misleading screenshots)**
   - Solution: Screenshots must show actual app functionality

**If Rejected:**
1. Read rejection reason carefully
2. Fix the issue
3. Reply in Resolution Center
4. Re-submit (no additional fee)

### 2.6 After Approval

Once approved:
- **Status:** Ready for Sale
- **Live on App Store:** Within 24 hours
- **Distribution:** Available in selected countries

**Post-Launch:**
- Monitor crash reports in App Store Connect
- Respond to user reviews
- Track downloads and engagement metrics

---

## Phase 3: Google Play Store Submission

**Duration:** 1-2 weeks (easier than iOS)

### 3.1 Prepare Android Build

#### Step 1: Generate Signed APK/AAB

```bash
cd mobile/android/

# Generate signing key (one-time)
keytool -genkeypair -v -storetype PKCS12 \
  -keystore tattester-release-key.keystore \
  -alias tattester-key-alias \
  -keyalg RSA -keysize 2048 -validity 10000

# Store this key securely - you can NEVER recover it if lost!
```

Add to `android/gradle.properties`:
```properties
TATTESTER_UPLOAD_STORE_FILE=tattester-release-key.keystore
TATTESTER_UPLOAD_KEY_ALIAS=tattester-key-alias
TATTESTER_UPLOAD_STORE_PASSWORD=your_password
TATTESTER_UPLOAD_KEY_PASSWORD=your_password
```

#### Step 2: Build Release AAB

```bash
cd mobile/
npx react-native build-android --mode=release

# Output: android/app/build/outputs/bundle/release/app-release.aab
```

### 3.2 Play Console Setup

1. Go to https://play.google.com/console/
2. **Create app**
3. Fill out:
   - **App name:** TatTester
   - **Default language:** English (US)
   - **App or game:** App
   - **Free or paid:** Free

### 3.3 Store Listing

**App Details:**
- **App name:** TatTester - AI Tattoo Design
- **Short description:** (80 chars max)
  ```
  Design custom tattoos with AI. Visualize with AR. Match with local artists.
  ```
- **Full description:** (4000 chars max - use same as iOS)

**Graphics:**
- **Icon:** 512x512px (PNG)
- **Feature graphic:** 1024x500px (required for featured placement)
- **Phone screenshots:** At least 2 (1080x1920px or similar)
- **7" tablet screenshots:** At least 2 (optional)
- **10" tablet screenshots:** At least 2 (optional)

**Categorization:**
- **Category:** Lifestyle or Art & Design
- **Tags:** tattoo, design, ai, art, custom

**Contact Details:**
- **Email:** support@tattester.com
- **Phone:** (optional)
- **Website:** https://tattester.com
- **Privacy Policy:** https://tattester.com/privacy (REQUIRED)

### 3.4 Content Rating

Complete questionnaire:
- **Violence:** Mild (tattoo imagery)
- **Sexual content:** None
- **Drugs:** None
- **Gambling:** None
- **User-generated content:** No

**Result:** Likely rated **T for Teen** or **E10+**

### 3.5 App Content

**Privacy Policy:**
- Upload URL (must be publicly accessible)

**Ads:**
- Does your app contain ads? **No** (for now)

**Target Audience:**
- **Age groups:** 16+ (tattoo content)

**Data Safety:**
- **Does your app collect user data?** Yes
  - Camera access (for AR visualization)
  - Location (for artist matching)
  - Design preferences (stored locally)
- **Is data encrypted in transit?** Yes (HTTPS)
- **Can users request data deletion?** Yes

### 3.6 Release

1. **Production** → **Countries/regions:** Select all or specific
2. Upload your **app-release.aab** file
3. **Release name:** `1.0.0 - Initial Release`
4. **Release notes:**
   ```
   Welcome to TatTester!

   🎨 Generate custom tattoo designs with AI
   📸 Visualize designs on your body with AR
   💡 Match with local artists
   ✨ Export professional stencils

   Perfect for first-time tattoo seekers!
   ```

5. Click **"Review release"**
6. Click **"Start rollout to Production"**

### 3.7 Review Process

**Timeline:**
- **Average:** Few hours to 2 days
- **Much faster than Apple**

**Common Rejection Reasons:**
1. **Metadata policy violation** (misleading screenshots)
2. **Permissions not declared** (camera, location must be explained)
3. **Broken functionality**

**After Approval:**
- **Live on Play Store:** Within 2-4 hours
- **Rollout:** Can do staged rollout (5% → 10% → 50% → 100%)

---

## Timeline & Budget

### Complete Timeline (From Zero to App Store)

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| **Setup Apple/Google Accounts** | 1 day | Credit card, business info |
| **React Native Migration** | 4-6 weeks | Mac (for iOS), developer time |
| **iOS App Assets** | 3-5 days | Designer/screenshots |
| **iOS Submission** | 1 day | Completed app |
| **iOS Review** | 2-7 days | Apple's queue |
| **Android Build** | 1-2 days | Signing keys |
| **Android Submission** | 1 day | Completed app |
| **Android Review** | 1-2 days | Google's queue |
| **TOTAL** | **8-12 weeks** | |

### Budget Breakdown

| Item | Cost | Frequency |
|------|------|-----------|
| **Apple Developer Account** | $99 | Annual |
| **Google Play Developer Account** | $25 | One-time |
| **Mac Computer (if needed)** | $599-$2,499 | One-time |
| **App Store Screenshots/Assets** | $0-$500 | One-time (can DIY) |
| **Privacy Policy Generator** | $0-$200 | One-time |
| **Developer Time (if outsourced)** | $5,000-$25,000 | One-time |
| **Backend Infrastructure (Railway/Vercel)** | $20-$100/mo | Monthly |
| **Replicate API (AI generation)** | Usage-based | Monthly |
| **TOTAL (DIY)** | **$744-$1,424** | First year |
| **TOTAL (Outsourced)** | **$5,744-$26,424** | First year |

---

## Next Steps

### Immediate Actions (This Week)

1. ✅ **Decision:** Confirm you want to pursue native app (vs PWA)
2. ✅ **Hardware:** Ensure you have Mac access (required for iOS)
3. ⬜ **Accounts:**
   - Sign up for Apple Developer Program ($99)
   - Sign up for Google Play Console ($25)
4. ⬜ **Legal:**
   - Create Privacy Policy (use https://www.termsfeed.com/privacy-policy-generator/)
   - Create Terms of Service
   - Host both on tattester.com

### Short-Term (Next 2 Weeks)

1. ⬜ **Initialize React Native project**
   ```bash
   cd /Users/ciroccofam/my-project/tatt-tester/
   mkdir mobile
   cd mobile
   npx react-native init TatTesterMobile --template react-native-template-typescript
   ```

2. ⬜ **Set up development environment:**
   - Install Xcode (Mac App Store)
   - Install Android Studio
   - Install CocoaPods
   - Configure iOS simulator and Android emulator

3. ⬜ **Migrate core screens:**
   - Home screen
   - Design generator
   - Camera/visualization
   - Artist matching

### Medium-Term (Weeks 3-6)

1. ⬜ **Implement native features:**
   - Camera integration (react-native-vision-camera)
   - AR overlay (ARKit for iOS, ARCore for Android)
   - Image processing (native modules)
   - AsyncStorage (replace localStorage)

2. ⬜ **Design app assets:**
   - App icon (1024x1024px)
   - Screenshots (all required sizes)
   - App preview videos (optional)

3. ⬜ **Testing:**
   - Test on physical iOS device
   - Test on physical Android device
   - Fix bugs and crashes

### Long-Term (Weeks 7-12)

1. ⬜ **Submission preparation:**
   - Complete App Store Connect listing
   - Complete Play Console listing
   - Upload builds

2. ⬜ **Submit for review:**
   - iOS submission
   - Android submission
   - Address any rejections

3. ⬜ **Launch:**
   - Publish apps
   - Monitor crash reports
   - Gather user feedback
   - Plan v1.1 updates

---

## Alternative: Faster Launch Options

If 8-12 weeks feels too long, consider these alternatives:

### Option 1: Expo Managed Workflow (4-6 weeks)
**Pros:**
- Faster development (2-3 weeks)
- Built-in OTA updates
- Easier submission process (EAS Build)

**Cons:**
- May limit AR capabilities
- Less control over native code

**How to start:**
```bash
npx create-expo-app TatTesterMobile
cd TatTesterMobile
npx expo start
```

### Option 2: React Native Web + PWA (2-3 weeks)
**Pros:**
- Reuse 90% of existing code
- Works on all platforms instantly
- No app store submission

**Cons:**
- Not a "real" app
- Limited camera/AR features
- No App Store visibility

**How to start:**
```bash
npm install react-native-web
# Configure webpack to support RN Web
```

### Option 3: Capacitor (Hybrid - 3-5 weeks)
**Pros:**
- Wrap existing React web app
- Native-like features
- Faster than full RN migration

**Cons:**
- Performance not as good as native
- Still need separate iOS/Android builds

**How to start:**
```bash
npm install @capacitor/core @capacitor/cli
npx cap init
npx cap add ios
npx cap add android
```

---

## Recommended Path for TatTester

Given your app's requirements (camera + AR + AI), I recommend:

### **Recommended: React Native CLI**

**Why:**
1. TatTester needs **full camera access** for AR visualization
2. **Performance critical** for AI image processing
3. **Future-proof** for advanced features (push notifications, background processing)
4. **Best user experience** for native feel

**Trade-off:**
- Longer development time (4-6 weeks for migration)
- Requires Mac for iOS builds
- More complex setup

**Alternative if time-constrained:**
- Start with **Expo** (faster), then eject to bare workflow later if needed

---

## Questions to Answer Before Starting

1. **Do you have a Mac?** (Required for iOS development)
   - If no: Buy/rent Mac, or hire iOS developer

2. **Timeline preference?**
   - Fast (4-6 weeks): Choose Expo
   - Quality (8-12 weeks): Choose React Native CLI
   - Instant (2 weeks): PWA (but limited features)

3. **Budget for outsourcing?**
   - DIY: $744 (accounts + assets)
   - Hire developer: $5,000-$25,000

4. **Business structure?**
   - Need LLC/corporation for app store accounts
   - Need EIN for tax reporting

5. **Target platform priority?**
   - iOS first (iPhone users spend 2x more)
   - Android first (larger global market share)
   - Both simultaneously (recommended)

---

## Resources

### Official Documentation
- **React Native:** https://reactnative.dev/docs/getting-started
- **Expo:** https://docs.expo.dev/
- **App Store Connect:** https://developer.apple.com/app-store-connect/
- **Google Play Console:** https://play.google.com/console/about/

### Helpful Tools
- **App Icon Generator:** https://appicon.co/
- **Screenshot Generator:** https://www.screely.com/
- **Privacy Policy:** https://www.termsfeed.com/privacy-policy-generator/
- **App Store Optimization:** https://www.apptamin.com/

### Communities
- **React Native Discord:** https://discord.gg/react-native
- **r/reactnative:** https://reddit.com/r/reactnative
- **Stack Overflow:** Tag [react-native]

---

**Last Updated:** January 5, 2026
**Next Review:** After React Native migration decision
