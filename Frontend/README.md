# 🧞 TravelGenie Frontend

The frontend application for TravelGenie - a comprehensive travel planning and management platform built with React and Vite.

---

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
- [Project Structure](#-project-structure)
- [Available Scripts](#-available-scripts)
- [Environment Variables](#-environment-variables)
- [Development](#-development)
- [Building for Production](#-building-for-production)
- [Contributing](#-contributing)

---

## ✨ Features

### User Features
- 🔐 User authentication and registration
- 👤 User profile management with preferences
- 🗺️ Browse and search destinations
- 🏨 Hotel discovery and filtering
- 📅 Create and manage trip itineraries
- 💰 Track trip expenses
- ⭐ Write reviews and rate places
- 🔔 Real-time notifications
- 📍 Interactive maps (Leaflet & Google Maps)
- 📱 Responsive design for mobile and desktop

### Admin Features
- 📊 Dashboard with analytics
- 🏛️ Manage destinations and hotels
- 👥 User management
- ✅ Review moderation
- 🏷️ Tag and category management

---

## 🛠️ Tech Stack

- **React 18** - UI library
- **Vite** - Fast build tool and dev server
- **React Router v6** - Client-side routing
- **React Leaflet** - Interactive maps
- **Google Maps API** - Map integration
- **CSS3** - Styling with modern features
- **ESLint** - Code quality and linting
- **Fetch API** - HTTP client for API calls

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** v18 or higher
- **npm** or **yarn**
- Backend API running on `http://localhost:5000`

### Installation

1. **Navigate to Frontend directory:**
   ```bash
   cd Frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create environment file:**
   ```bash
   cp .env.example .env
   ```

4. **Configure environment variables:**

   Edit `.env` file:
   ```env
   VITE_API_BASE_URL=http://localhost:5000
   ```

5. **Start development server:**
   ```bash
   npm run dev
   ```

6. **Open your browser:**
   ```
   http://localhost:5173
   ```

---

## 📁 Project Structure

```
Frontend/
├── public/                 # Static assets
│   ├── *.svg              # Icons and logos
│   └── *.png              # Images
├── src/
│   ├── components/        # Reusable UI components
│   │   ├── Navbar.jsx
│   │   ├── Footer.jsx
│   │   ├── SearchBar.jsx
│   │   └── ...
│   ├── pages/            # Page components
│   │   ├── Home.jsx
│   │   ├── Destinations.jsx
│   │   ├── Hotels.jsx
│   │   ├── TripPlanner.jsx
│   │   ├── Profile.jsx
│   │   └── ...
│   ├── services/         # API service functions
│   │   ├── api.js        # API base configuration
│   │   ├── authService.js
│   │   ├── destinationService.js
│   │   └── ...
│   ├── utils/            # Utility functions
│   │   ├── helpers.js
│   │   └── validators.js
│   ├── styles/           # CSS files
│   │   ├── App.css
│   │   └── ...
│   ├── App.jsx           # Main App component
│   ├── main.jsx          # React entry point
│   └── index.css         # Global styles
├── dist/                 # Production build (generated)
├── .env.example          # Environment variables template
├── .gitignore           # Git ignore rules
├── eslint.config.js     # ESLint configuration
├── index.html           # HTML template
├── package.json         # Dependencies and scripts
├── vite.config.js       # Vite configuration
└── README.md            # This file
```

---

## 📜 Available Scripts

### Development

```bash
# Start development server with hot reload
npm run dev
```

Runs the app in development mode at `http://localhost:5173`

### Production Build

```bash
# Build for production
npm run build
```

Creates optimized production build in the `dist/` directory.

### Preview Production Build

```bash
# Preview production build locally
npm run preview
```

Preview the production build at `http://localhost:4173`

### Linting

```bash
# Run ESLint
npm run lint
```

Check code quality and formatting issues.

---

## 🔧 Environment Variables

Create a `.env` file in the Frontend directory:

```env
# Backend API URL
VITE_API_BASE_URL=http://localhost:5000

# Optional: Add Google Maps API key if using Google Maps
# VITE_GOOGLE_MAPS_API_KEY=your_api_key_here
```

**Note:** All Vite environment variables must start with `VITE_` prefix to be exposed to the client.

---

## 💻 Development

### Code Style

- Use functional components with React Hooks
- Follow React best practices
- Use meaningful component and variable names
- Keep components small and focused
- Extract reusable logic into custom hooks

### Component Guidelines

```jsx
// Example component structure
import React, { useState, useEffect } from 'react';
import './ComponentName.css';

const ComponentName = ({ prop1, prop2 }) => {
  const [state, setState] = useState(null);

  useEffect(() => {
    // Side effects
  }, []);

  return (
    <div className="component-name">
      {/* Component JSX */}
    </div>
  );
};

export default ComponentName;
```

### API Integration

API services are located in `src/services/`. Example:

```javascript
// src/services/destinationService.js
import api from './api';

export const getDestinations = async () => {
  const response = await fetch(`${api.baseURL}/destinations`);
  return response.json();
};
```

---

## 🏗️ Building for Production

### 1. Build the application:

```bash
npm run build
```

### 2. Deploy the `dist/` folder to your hosting service:

**Popular hosting options:**
- **Vercel** - `vercel --prod`
- **Netlify** - Drag and drop `dist/` folder
- **GitHub Pages** - Push `dist/` to `gh-pages` branch
- **AWS S3** - Upload to S3 bucket
- **Firebase Hosting** - `firebase deploy`

### 3. Configure environment variables on your hosting platform

Make sure to set `VITE_API_BASE_URL` to your production backend URL.

---

## 🎨 Styling

The project uses vanilla CSS with modern features:

- CSS Variables for theming
- Flexbox and Grid for layouts
- Media queries for responsiveness
- CSS animations and transitions

**Global styles:** `src/index.css`
**Component styles:** Co-located with components (e.g., `Component.css`)

---

## 🗺️ Maps Integration

The app supports both **React Leaflet** and **Google Maps**:

### React Leaflet
```jsx
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
```

### Google Maps
```jsx
import { GoogleMap, Marker } from '@react-google-maps/api';
```

---

## 🔐 Authentication Flow

1. User registers/logs in via `/login` or `/register`
2. Backend returns JWT token
3. Token stored in `localStorage`
4. Token sent with API requests in `Authorization` header
5. Protected routes check for valid token

---

## 📱 Responsive Design

The app is fully responsive with breakpoints:

- **Mobile**: < 768px
- **Tablet**: 768px - 1024px
- **Desktop**: > 1024px

---

## 🐛 Troubleshooting

### Common Issues

**Issue:** "Cannot connect to backend API"
**Solution:** Ensure Backend is running on `http://localhost:5000` and `VITE_API_BASE_URL` is set correctly.

**Issue:** "Module not found" errors
**Solution:** Run `npm install` to ensure all dependencies are installed.

**Issue:** Maps not loading
**Solution:** Check if you have internet connection and API keys are configured (if using Google Maps).

**Issue:** Hot reload not working
**Solution:** Restart the dev server with `npm run dev`.

---

## 🤝 Contributing

We welcome contributions! To contribute:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/NewFeature`
3. Make your changes
4. Test thoroughly
5. Commit: `git commit -m 'Add NewFeature'`
6. Push: `git push origin feature/NewFeature`
7. Open a Pull Request

### Contribution Guidelines

- Follow existing code style
- Write clear commit messages
- Update documentation for new features
- Test on multiple browsers
- Ensure responsive design works

---

## 📚 Additional Resources

- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/)
- [React Router Documentation](https://reactrouter.com/)
- [React Leaflet Documentation](https://react-leaflet.js.org/)
- [Google Maps React Documentation](https://visgl.github.io/react-google-maps/)

---

## 📧 Support

For issues or questions, please:
- Open an issue on GitHub
- Contact the development team
- Check the main project README

---

**Happy Coding! 🚀**
