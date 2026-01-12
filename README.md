# Immich ES5 Slideshow

This is a lightweight, ES5-compatible slideshow application designed for older devices (e.g., iPad Air 1st Gen) to display photos from an Immich server.

## Project Structure

- `index.html`: The main entry point containing the HTML structure for the configuration form and the slideshow viewer.
- `style.css`: Basic styling for the application, ensuring a dark mode aesthetic and responsive layout.
- `app.js`: The core logic written in pure ES5 JavaScript. It handles:
    - Saving and loading configuration (Server URL, API Key) from `localStorage`.
    - Fetching assets from the Immich API using `XMLHttpRequest`.
    - Managing the slideshow playback (play/pause, next/previous).

## Features

1.  **Configuration**: On first load, you are prompted to enter your Immich Server URL and an API Key. These credentials are saved in the browser's local storage.
2.  **Asset Fetching**: The app fetches the latest 100 assets from the `/api/asset` endpoint.
3.  **Slideshow**: Automatically cycles through the fetched images every 5 seconds.
4.  **Controls**:
    - **Previous/Next**: Manually navigate images (pauses the slideshow).
    - **Play/Pause**: Toggle automatic playback.
    - **Settings**: Return to the configuration screen.
5.  **Compatibility**:
    - Uses `var` instead of `let`/`const`.
    - Uses `XMLHttpRequest` instead of `fetch`.
    - Includes a polyfill for `Array.prototype.map`.
    - Configured for legacy viewports (`user-scalable=no`).

## How to Use

1.  **Host**: Serve the `es5-app` directory using any static web server (e.g., Nginx, Apache, Python `SimpleHTTPServer`, or `npm install -g http-server`).
2.  **Access**: Open `index.html` in the browser on your old device.
3.  **Configure**:
    - **Server URL**: Enter the full URL to your Immich instance (e.g., `http://192.168.1.50:2283`).
    - **API Key**: Generate an API Key in Immich (User Settings -> API Keys) and paste it here.
4.  **Enjoy**: Click "Start Slideshow".

## Notes for Development

- The current implementation fetches the `thumbnail` (JPEG) format for compatibility and performance.
- Error handling is basic (alerts on network errors).
- To clear credentials, click the "Settings" button.
