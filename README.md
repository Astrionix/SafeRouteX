# 🛡️ SafeRouteX - Navigate Safely

**SafeRouteX** is a full-stack web platform that provides **fastest** and **safest** navigation routes using real-time crime data, CCTV locations, and streetlight density. Built with Next.js, Node.js, PostgreSQL/PostGIS, and integrating real-time SOS capabilities.

![SafeRouteX Banner](https://via.placeholder.com/1200x400/1e293b/33a7ff?text=SafeRouteX+-+Navigate+Safely)

## ✨ Features

### 🗺️ User Platform (Port 3000)
- **Dual Routing**: Get both fastest and safest routes
- **Safety Score**: Routes scored based on CCTV coverage, streetlight density, and crime history
- **Crime Heatmap**: Visualize crime-prone areas
- **Infrastructure Layers**: Toggle CCTV and streetlight visibility
- **SOS Button**: One-tap emergency with real-time location sharing
- **Incident Reporting**: Report unsafe areas and infrastructure issues
- **Time-based Safety**: Safer routes suggested at night

### 👮 Admin Dashboard (Port 3001)
- **Live SOS Feed**: Real-time emergency alerts with tracking
- **Report Moderation**: Verify/reject community reports
- **Analytics**: Crime statistics and infrastructure health
- **Infrastructure Management**: Update CCTV and streetlight status

## 🗂️ Project Structure

```
SafeRouteX/
├── frontend/                 # User-facing Next.js app
│   ├── app/                  # App router pages
│   ├── components/           # React components
│   ├── lib/                  # Firebase, API, State, Socket
│   └── .env.local            # Environment variables
│
├── admin-dashboard/          # Police/Admin Next.js app
│   ├── app/                  # Dashboard pages
│   ├── components/           # Admin components
│   └── .env.local            # Environment variables
│
├── backend/                  # Express.js API server
│   ├── src/
│   │   ├── config/           # Database & Firebase config
│   │   ├── middleware/       # Auth & error handling
│   │   ├── routes/           # API routes
│   │   ├── services/         # Routing engine
│   │   └── sockets/          # WebSocket handlers
│   ├── scripts/              # Data import scripts
│   └── .env.example          # Environment template
│
├── database/
│   └── schema.sql            # PostGIS database schema
│
├── data/                     # GeoJSON data files
│   ├── cctv_india.geojson    # CCTV camera locations
│   └── streetlights_india.geojson  # Streetlight locations
│
└── README.md
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 15+ with PostGIS extension
- Firebase project (for authentication)
- Mapbox account (for maps)

### 1. Database Setup

```bash
# Create database and enable PostGIS
psql -U postgres
CREATE DATABASE saferoutex;
\c saferoutex
CREATE EXTENSION postgis;

# Run schema
psql -U postgres -d saferoutex -f database/schema.sql
```

### 2. Backend Setup

```bash
cd backend
cp .env.example .env
# Edit .env with your credentials

npm install
npm run dev
```

### 3. Import GeoJSON Data

```bash
cd backend
node scripts/importData.js
```

### 4. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

### 5. Admin Dashboard Setup

```bash
cd admin-dashboard
npm install
npm run dev
```

## 🔐 Environment Variables

### Frontend (.env.local)
```env
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_API_URL=http://localhost:4000/api
NEXT_PUBLIC_WS_URL=http://localhost:4000
NEXT_PUBLIC_DEFAULT_LAT=12.9716
NEXT_PUBLIC_DEFAULT_LON=77.5946
```

### Backend (.env)
```env
PORT=4000
DATABASE_URL=postgresql://postgres:password@localhost:5432/saferoutex
FIREBASE_PROJECT_ID=your_project_id
FRONTEND_URL=http://localhost:3000
ADMIN_URL=http://localhost:3001
```

## 📊 Safety Score Algorithm

Routes are scored based on:

```
safety_score = (cctv_density * 0.3) + (light_density * 0.3) + ((1 - crime_density) * 0.4)
```

| Factor | Weight | Description |
|--------|--------|-------------|
| CCTV Density | 30% | Number of cameras within 50m of road |
| Light Density | 30% | Number of streetlights within 30m |
| Crime Inverse | 40% | Fewer crimes = higher score |

### Time Modifier

Night routes (10 PM - 6 AM) prioritize well-lit areas:
- Light density weight increases by 20%
- Crime weight increases by 15%

## 📡 API Endpoints

### Routes
- `POST /api/route/get` - Get fastest & safest routes

### SOS
- `POST /api/sos/start` - Activate SOS
- `POST /api/sos/location` - Update location
- `POST /api/sos/stop` - Deactivate SOS

### Reports
- `POST /api/report/create` - Submit incident report
- `GET /api/report/list` - Get reports in area

### Layers
- `GET /api/layers/cctv` - Get CCTV GeoJSON
- `GET /api/layers/streetlights` - Get streetlights GeoJSON
- `GET /api/layers/crime` - Get crime heatmap data

## 🗃️ Included GeoJSON Data

The project includes real OpenStreetMap data for India:

| File | Records | Description |
|------|---------|-------------|
| `cctv_india.geojson` | ~2,500+ | Surveillance camera locations |
| `streetlights_india.geojson` | ~26,000+ | Street lamp locations |

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14, React 18, TypeScript |
| Styling | Tailwind CSS, Framer Motion |
| Maps | Mapbox GL JS |
| Backend | Node.js, Express.js |
| Database | PostgreSQL, PostGIS |
| Real-time | Socket.IO |
| Auth | Firebase Authentication |
| State | Zustand |

## 📱 Screenshots

### User Interface
- Route comparison (fastest vs safest)
- Crime heatmap overlay
- CCTV and streetlight layers
- SOS emergency button

### Admin Dashboard
- Live SOS tracking
- Report moderation
- Infrastructure analytics

## 🚀 Deployment

### Frontend/Admin - Vercel
```bash
vercel --prod
```

### Backend - Railway/Render
- Set environment variables
- Deploy from GitHub

### Database - Railway Postgres
- Enable PostGIS extension
- Run schema.sql

## 📄 License

MIT License - feel free to use this project for learning and building!

---

Built with ❤️ for safer communities
