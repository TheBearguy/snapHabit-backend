# SnapHabit

![SnapHabit Screenshot](./extension/snapHabit-logo.png "SnapHabit Interface")

**SnapHabit** is a digital lifestyle tool designed to empower individuals to track, analyze, and improve their environmental impact in real-time. By monitoring daily habits, SnapHabit encourages sustainable choices and enables eco-conscious living through actionable insights, personalized goals, and greener alternatives.

In addition to the core app, we have developed a **browser extension** that suggests eco-friendly alternatives for items searched online, integrating seamlessly into users' daily browsing habits.

---

## Features

### Core Functionality
- **Personalized Eco-Score**: SnapHabit calculates a sustainability score for users based on tracked daily activities. This score reflects eco-impact and encourages improvement over time.
- **Sustainable Habit Tracking**: SnapHabit connects with Google Fit and Google Cloud Vision to gather lifestyle data, allowing users to monitor eco-impact in areas like energy consumption, travel, and waste.
- **Goal Setting & Progress Tracking**: Users can set personal sustainability goals, monitor progress, and celebrate eco-milestones.
- **Eco-Challenges ("Bounties")**: Interactive eco-challenges encourage sustainable behavior and reward users with points and badges for completed goals.
- **WhatsApp Integration**: Users can interact with SnapHabit via a WhatsApp-based Recommendation and Advice Generation (RAG) engine, making sustainable choices accessible anytime.

### Browser Extension
- **Green Alternatives in Search**: The SnapHabit extension recommends sustainable alternatives for products and services directly in search results, supporting eco-conscious choices during online shopping.

---

## Tech Stack

- **Frontend**: Next js
- **Backend**: Node.js, Express.js, MongoDB, Google Cloud
- **Integrations**: Google Fit API, Google Cloud Vision API
- **Messaging**: WhatsApp API for RAG (Recommendation and Advice Generation) Engine

---
## Installation

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/yourusername/snapHabit.git
   cd snapHabit
2. Install Dependencies:

```npm install
  Configure Environment Variables: Set up your .env file with the following keys:
  
      CORS_ORIGIN
      DATABASE_URL
      GOOGLE_FIT_API_KEY
      WHATSAPP_API_KEY
      Other API keys as required
