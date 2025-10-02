# Real-Time Collaborative Canvas Drawing Application

A collaborative canvas application that allows multiple users to join rooms and draw together on a shared digital canvas in real-time using WebSockets.

## Project Overview

This application enables users to:
- Create accounts and log in securely
- Create or join drawing rooms
- Draw in real-time with other connected users
- See other users' cursors and activities
- Use various drawing tools (brush, shapes, colors)
- Save and restore canvas sessions

## Technology Stack

### Frontend
- React 18+ with Hooks
- TypeScript
- Fabric.js (Canvas library)
- Redux Toolkit (State management)
- Socket.io-client (WebSocket client)
- Tailwind CSS for modern UI styling
- Headless UI for accessible components

### Backend
- Node.js 16+
- Express.js (REST API)
- Socket.io (WebSocket server)
- TypeScript
- MySQL database
- Prisma ORM
- JWT Authentication

## Project Structure

```
Canvas_app/
├── frontend/            # React frontend application
│   ├── public/          # Static files
│   └── src/
│       ├── assets/      # Images, icons, etc.
│       ├── components/  # Reusable React components
│       │   ├── Canvas.tsx          # Main canvas component using Fabric.js
│       │   ├── ChatPanel.tsx       # Real-time chat functionality
│       │   ├── UserList.tsx        # Active users in a room
│       │   ├── RoomSettings.tsx    # Room configuration panel
│       │   └── common/             # Common UI components
│       ├── features/    # Feature-based modules
│       ├── hooks/       # Custom React hooks
│       ├── interfaces/  # TypeScript interfaces and types
│       ├── pages/       # Page components
│       ├── services/    # API and socket service clients
│       ├── store/       # Redux store configuration
│       │   ├── api/     # API slice configuration
│       │   └── slices/  # Redux slices (auth, canvas, room, ui)
│       └── utils/       # Utility functions
├── backend/             # Node.js backend application
│   ├── src/
│   │   ├── config/      # Configuration files
│   │   ├── controllers/ # Route controllers
│   │   ├── interfaces/  # TypeScript interfaces
│   │   ├── middleware/  # Express middleware
│   │   ├── models/      # Data models
│   │   ├── routes/      # API routes
│   │   ├── services/    # Business logic services
│   │   ├── socket/      # WebSocket handling
│   │   └── utils/       # Utility functions
│   └── prisma/          # Prisma schema and migrations
└── docs/                # Documentation
```

## Setup and Installation

### Prerequisites
- Node.js 16+
- MySQL server
- Git

### Backend Setup
1. Navigate to the backend directory: `cd backend`
2. Install dependencies: `npm install`
3. Set up environment variables: Copy `.env.example` to `.env` and fill in your MySQL credentials
4. Run Prisma migrations: `npx prisma migrate dev`
5. Start the development server: `npm run dev`

### Frontend Setup
1. Navigate to the frontend directory: `cd frontend`
2. Install dependencies: `npm install`
3. Start the development server: `npm start`

## Features

### User Interface
- Modern, clean UI design with indigo/purple color scheme
- Responsive layout for all screen sizes
- Intuitive navigation with user dropdown menu
- Card-based layout for room organization
- Attractive gradients and visual elements

### User Authentication
- Registration and login using JWT
- Support for social login options
- Two-step login flow with email-first approach

### Canvas Operations
- Free-hand drawing with adjustable brush size
- Shape tools (rectangles, circles, lines)
- Text tool for adding text elements
- Color picker for customizing elements
- Selection tool for modifying existing elements
- Sticky notes with customizable colors
- Arrow connectors for diagrams
- Modern sidebar toolbox with intuitive icons

### Collaboration
- Real-time drawing synchronization using Socket.io
- User presence indicators with colored cursors
- Dedicated cursor visualization mode for showing all users without switching
- User attribution for all drawings and objects
- Room-based collaboration with user lists
- Real-time chat functionality within rooms
- Private and public room options

### Persistence
- Save and load canvas sessions
- Auto-save functionality at regular intervals
- Canvas history tracking
- User-specific settings storage