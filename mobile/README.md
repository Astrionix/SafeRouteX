# SafeRouteX Mobile App

This is the mobile application for SafeRouteX, built with React Native and Expo.

## Prerequisites

- Node.js (v18+)
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (for Mac) or Android Emulator
- Or Expo Go app on your physical device

## Setup

1. Install dependencies:
   ```bash
   cd mobile
   npm install
   ```

2. Configure environment:
   - Duplicate `app.json` if you need custom config
   - Setup your Google Maps API keys in `app.json`

## Running

Start the development server:

```bash
npm start
```

Then:
- Press `a` for Android emulator
- Press `i` for iOS simulator
- Scan QR code with Expo Go app

## Features

- 🗺️ **Safe Route Navigation**: Integration with Google Maps
- 📹 **Overlay Layers**: CCTV, heatmap, streetlights
- 🆘 **SOS Mode**: One-tap emergency alert with countdown
- 🛡️ **Profile**: Manage safety settings

## Project Structure

```
src/
  screens/       # App screens
    HomeScreen   # Dashboard
    MapScreen    # Main map interface
    SOSScreen    # Emergency mode
    ProfileScreen # Settings
    LoginScreen  # Auth
  components/    # Reusable components
  utils/         # Helpers
```
