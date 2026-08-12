# NextDoor Brew App - Firebase Passwordless & Deep Link Setup Guide

This document outlines the final manual steps required to fully activate the passwordless email (Magic Link) authentication and deep linking flow for the NextDoor app.

## 1. Deploy the Fallback Webpage
When users click the Magic Link on a desktop browser instead of a mobile device, Firebase tries to open `hsordersystem.firebaseapp.com`. Currently, this throws a "Site Not Found" error.
We have created a friendly fallback page (`public/index.html`) and configured `firebase.json`.
**Action Required:**
1. Open your terminal at the root of this project.
2. Ensure you are logged into the Firebase CLI (`firebase login`).
3. Run the deployment command:
   ```bash
   firebase deploy --only hosting
   ```

## 2. iOS Universal Links Configuration
The app is configured to intercept links using the Associated Domains entitlement (`applinks:hsordersystem.firebaseapp.com`).
**Action Required:**
1. Log into your **Apple Developer Account**.
2. Go to **Certificates, Identifiers & Profiles** -> **Identifiers**.
3. Select the App ID for the NextDoor app (`org.reactjs.native.example.HSOrderSystem`).
4. Ensure the **Associated Domains** capability is checked and save.
5. In Xcode, ensure your provisioning profile is updated.

## 3. Android App Links Configuration
The app's `AndroidManifest.xml` has been updated with an `intent-filter` to catch links from `hsordersystem.firebaseapp.com`. However, Android will only trust this app if it is cryptographically linked to your Firebase project.
**Action Required:**
1. Locate your Android keystore (the one you use to sign the debug and release versions of your app).
2. Generate the SHA-256 fingerprint:
   ```bash
   keytool -list -v -keystore android/app/debug.keystore -alias androiddebugkey -storepass android -keypass android
   ```
3. Go to the **Firebase Console** -> **Project Settings** -> **General** tab.
4. Scroll down to your Android app and click **Add fingerprint**.
5. Paste your SHA-256 fingerprint and save. Google will automatically generate the `assetlinks.json` file on `hsordersystem.firebaseapp.com` to verify the link.

## 4. Fix Email Spam Issues (Optional but Recommended)
Currently, authentication emails are sent from `noreply@hsordersystem.firebaseapp.com`. These are often flagged as spam by Gmail and others.
**Action Required:**
1. Go to the **Firebase Console** -> **Authentication** -> **Templates**.
2. Edit the "Email address" settings and click **Customize domain**.
3. Follow the instructions to add a custom domain (e.g., `noreply@nextdoorbrew.com`).
4. Add the provided TXT and CNAME records to your domain's DNS settings to authenticate SPF and DKIM.

## 5. Update Public-Facing App Name
Currently, emails say "Sign in to hsordersystem".
**Action Required:**
1. Go to the **Firebase Console** -> **Project Settings** -> **General**.
2. Edit the **Public-facing name** field to `NextDoor Brew App`.
