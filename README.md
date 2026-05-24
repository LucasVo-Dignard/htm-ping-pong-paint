# Ping Pong Paint

## The Ping-Pong Paint Project (PPPP)
The **PPPP**is an interactive game focused around this year's HackTheMountain topic: Arts. Instead of just admiring art, we 
wanted people to a part of it, either by ping-pong painting on a blank canvas or recreate in this style reknown art works of all eras. 

## Technical Stack
- **Node.js**: The underlying JavaScript runtime environment.
- **Express**: Used to serve the static client files (PC and mobile web apps).
- **Socket.io**: Handles real-time, bidirectional communication between the server, PC client, and mobile clients (e.g., for accelerometer/gyroscope swing detection and pixel drawing).

## Quick Setup

Follow these steps to get the project running locally:

1. **Install Dependencies**
   Ensure you have [Node.js](https://nodejs.org/) installed. Open your terminal in the project root and run:
   ```bash
   npm install
   ```

2. **Start the Server**
   To start the application, simply run:
   ```bash
   npm start
   ```
   *(Alternatively, you can run the server directly using Node: `node server/index.js`)*

3. **Open the App**
   Once the server is running, check your terminal for the localhost port (usually `http://localhost:3000` or similar) and open it in your web browser.

### Important Note on HTTPS
Because this project relies on device motion controls (accelerometer/gyroscope APIs), **it requires an HTTPS connection** to function properly. Mobile browsers block access to these sensors over standard HTTP. If you are developing locally, you will need to set up local SSL certificates or use a secure tunnel.

## Live Version
You can access and play the live version of this project at: [https://pingpongpaint.ca/](https://pingpongpaint.ca/)