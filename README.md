# Ping Pong Paint

## The Ping-Pong Paint Project (PPPP)
The **PPPP** is an interactive game focused around this year's HackTheMountain topic: Arts. Instead of just admiring art, we wanted people to be a part of it, either by ping-pong painting on a blank canvas or by recreating classic works of art in this unconventional style.

## Technical Stack
- **TypeScript**: Programmed with strong type-safety and modern ES module features.
- **TypeDI**: Dependency injection container for decoupling client and server services.
- **Node.js & Express**: Backend server hosting compiled APIs and routing traffic.
- **Socket.io**: Handles real-time, bidirectional communication between the server, PC client, and mobile clients (e.g., swing detection and pixel coordinates updates).
- **Three.js**: Renders the 3D game scene on the PC browser.
- **esbuild**: Rapid client-side asset bundler.

---

## Directory Structure

```
src/
  shared/        # Shared constants and models (e.g. Socket events, Materials)
  server/        # Backend server code (Express, Socket.io)
    services/    # Session and registration TypeDI services
  client/        # Frontend applications
    pc/          # PC canvas game interface
      services/  # Pixel convolution and canvas drawing TypeDI services
    mobile/      # Mobile paddle controller interface
      services/  # Device motion swing-detection TypeDI services
server/public/   # Static asset folders (HTML pages, styles, images, sounds)
dist/            # Compiled backend output (gitignored)
```

---

## Quick Setup

Follow these steps to get the project running locally:

### 1. Install Dependencies
Ensure you have [Node.js](https://nodejs.org/) installed. Open your terminal in the project root and run:
```bash
npm install
```

### 2. Build the Project
Compile the TypeScript server files and bundle the client assets:
```bash
npm run build
```
This outputs compiled server code to `dist/` and bundled PC/mobile files to `server/public/pc/index.js` and `server/public/mobile/index.js` respectively.

### 3. Start the Server
To run the production-built application:
```bash
npm start
```

### 4. Development Mode (Watch Mode)
To run a hot-reloading development server that automatically rebuilds client bundles on edits and restarts the Express server:
```bash
npm run dev
```

---

### Important Note on HTTPS
Because this project relies on device motion controls (accelerometer/gyroscope APIs), **it requires an HTTPS connection** to function properly. Mobile browsers block access to these sensors over standard HTTP. If you are developing locally, you will need to set up local SSL certificates or use a secure tunnel (e.g., ngrok).

## Live Version
You can access and play the live version of this project at: [https://pingpongpaint.ca/](https://pingpongpaint.ca/)
