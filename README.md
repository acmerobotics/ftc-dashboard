# Dashboard

Websocket-based React dashboard made for FTC. Supports basic telemetry display, telemetry graphing, live configuration variables, and a dynamic field overlay. Partially inspired by [FRC Dashboard](https://github.com/FRCDashboard/FRCDashboard).

![Dashboard Screenshot](images/dashboard.png)

## Installation
1. Install [node](https://nodejs.org/en/download/) and [yarn](https://yarnpkg.com/en/docs/install) if not installed already.
2. Run `yarn` in `dash/`.

## Usage
1. If necessary, change the host in `dash/src/components/Dashboard.jsx` in the `connect()` method to match that of the RC device. The default is `192.168.49.1`, the address of the RC device in the WiFi direct network.
2. Run `yarn start` to start the development server.
3. Navigate to `localhost:3000` (although the previous command will likely open it for you).

## Customizing
The dashboard is designed to be flexible and customizable. First off, the size of all the widgets/tiles are easily modifieid. The layout is based on CSS grids; to change the grid size, adjust the value of `grid-template` under `.tile-grid` in `src/index.css` and the corresponding `row`/`col` properties in `src/containers/Dashboard.jsx` (read more about CSS grids [here](https://css-tricks.com/snippets/css/complete-guide-grid/)). You can also add your own widgets (React components) to `render()` in `Dashboard.jsx`. If you need additional data passed from the server, the recommended method is modifying the telemetry structure. To do this, add the necessary keys to `dash/src/reducers/telemetry.js` and they'll be available through Redux under `telemetry`. Of course, you may also extend the Redux store with additional actions (just make sure you correspondingly modify the backend; backend websocket message types correspond to Redux actions). For a good example of how this all comes together into a component, see `dash/src/containers/TelemetryView.jsx`.