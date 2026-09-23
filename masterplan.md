# 1. What Is It?

## Purpose

An opinionated solution for managing a large number of small trading tools and apps, including tools that are unnecessarily paid when they can be run for free on your own hardware.

---

## Core Idea

Organize trading tools and calculators in one place so they can be accessed quickly and easily while you worry about not losing money.

Split everything into a few main categories (tabs), with clean, densely packed subtabs so there is generally no need to scroll in any viewport.

Each part of the app should have accessible, in-app documentation explaining how to use it and documenting the reasoning behind opinionated design decisions.

---

## What Makes It Different?

It is highly opinionated and focuses on speed, so you do not lose precious opportunities while still being precise and systematic enough to actually use statistics in your trading journey.

---

# 2. V1

## V1 Goal

A working journal, portfolio, calculations, and settings system.

---

## V1 Features

### 2.1 Journal

- **Subtabs:** Overview (show, add, remove, and modify trades), Stats (show journal statistics and charts for specific time frames)
- **What it does:** Accept as many relevant input data points as needed, calculate as many useful data points as possible, save them, and provide useful insights through data visualization and organization.

### 2.2 Portfolio

- **Subtabs:** Overview (show, add, remove, and modify assets), Stats (show portfolio statistics and charts for specific time frames)
- **What it does:** Accept as many relevant input data points as needed, calculate as many useful data points as possible, save them, and provide useful insights through data visualization and organization.

### 2.3 Calculations

- **Subtabs:** One for each calculator
- **What it does:** Accept the required input data as quickly as possible and provide useful output instantly, without requiring a Calculate button.

### 2.4 Settings

- **Subtabs:**
  - **Preferences:** Customize default inputs
  - **Themes:** Select from a growing list of themes
  - **Data Controls:** Export and import all data
  - **Documentation:** Provide information about how different features work

---

# 3. User Experience

## Main Navigation

There will be four tabs in V1:

1. Journal
2. Portfolio
3. Calculations
4. Settings

They will be accessed through a collapsible hamburger menu.

Each tab will have subtabs that should be accessible as quickly as possible while inside that tab. Subtabs will therefore be displayed in a horizontally scrollable menu at the top of the screen.

---

## Home / Dashboard

There is no dedicated home or dashboard.

The first tab shown when opening the app should be the **Calculations** tab, allowing the user to calculate things such as margin and leverage immediately when needed.

---

## Typical Session

Find a trading opportunity (not in the app)  
→ Calculate anything needed before entering the trade as quickly as possible (in the app)  
→ Enter the trade (not in the app)  
→ Add it to the Journal or Portfolio, depending on whether it is a spot asset or a futures contract (in the app)

---

## Design Philosophy

**Fast and sleek. Opinionated but customizable.**

V1 should include three themes:

- Material Design 3 Light
- Material Design 3 Dark
- Black Night

---

# 4. Core Data

Of the four tabs, three require persistent data:

- Journal
- Portfolio
- Settings

---

# 5. Calculations & Logic

All calculations should be separated into dedicated files.

These files must not be modified by any AI agent without explicit permission.

---

# 6. Technical Direction

## Platform

A local-first Progressive Web App (PWA).

The application should provide a proper app-like experience on:

- Android
- iOS
- Windows
- macOS
- Linux

Users should be able to install the application directly from their browser on both mobile and desktop.

The installed application should feel like a standalone app rather than a website opened in a browser tab.

The core application should work without requiring a remote server.

---

## Architecture

Use a frontend-focused architecture designed around a client-side application.

Separate the application into:

- UI
- Application logic
- Calculations
- Data layer
- External integrations

Core calculations and business logic should not depend directly on the UI.

Avoid a backend unless a feature genuinely requires server-side functionality.

---

## Local-First

The application should be fully usable locally after installation.

Core features should continue working without an internet connection.

Internet access should only be required for features that inherently need it, such as:

- Live market data
- External integrations
- Optional synchronization

---

## Data Storage

User data should be stored locally on the user's device.

Use a proper browser database, such as IndexedDB, through a suitable abstraction layer.

The data system should support:

- Persistent local storage
- Import
- Export
- Backup
- Restore
- Data migration

The core application should not require:

- An account
- A cloud database
- A remote server

---

## PWA

The application must be a proper installable PWA.

It should provide:

- Web App Manifest
- Service Worker
- Offline caching
- App installation
- Standalone display mode
- Application icons
- Splash/loading experience where supported
- Responsive layouts
- Mobile-friendly interactions
- Desktop-friendly layouts

The application should behave consistently whether accessed through:

1. A browser tab
2. An installed mobile PWA
3. An installed desktop PWA

---

## Responsive Design

Mobile and desktop are both first-class platforms.

Do not design primarily for one platform and adapt it to the other. The interface should be intentionally designed to work well across both mobile and desktop form factors.
