# FTC Dashboard

Websocket-based React dashboard made for FTC. Supports basic telemetry display, telemetry graphing, live configuration variables, and a dynamic field overlay. Partly inspired by [FRC Dashboard](https://github.com/FRCDashboard/FRCDashboard).

![Dashboard Screenshot](images/dashboard.png)

## Basic Installation
1. Clone this repo or download the `.zip` and extract it.
2. Open your FTC app project in Android Studio.
3. Navigate to `File > New > Import Module...` in the menu bar.
4. Select the directory containing the module source downloaded in step 1. Then change the module name to `FtcDashboard` and click `Finish`.
5. Add the following lines to the end of the top-level `build.gradle`:
```groovy
allprojects {
    repositories {
        jcenter()
    }
}
```
6. Right-click `FtcRobotController` in the project pane and select `Open Module Settings`. Now select the `Dependencies` tab in the dialog that pops up. Finally, click the plus icon, select `FtcDashboard`, and click OK twice.
7. Repeat step 6 with `TeamCode` instead of `FtcRobotController`.
8. Navigate to the main activity (`org.firstinspires.ftc.robotcontroller.internal.FtcRobotControllerActivity`) inside of the `FtcRobotController` module.
9. Insert the line `RobotDashboard.start()` at the end of `onCreate()` (located on line 308 in an unmodified 3.7 activity).
10. Insert the line `RobotDashboard.stop()` at the end of `onDestroy()` (located on line 386 in an unmodified 3.7 activity).

## Usage
1. Install [node](https://nodejs.org/en/download/) and [yarn](https://yarnpkg.com/en/docs/install) if not installed already.
2. Run `yarn` in `<FTC project>/FtcDashboard/dash/` (_this only needs to be done once!_).
3. If necessary, change the host in `dash/src/components/Dashboard.jsx` in the `connect()` method to match that of the RC device. The default is `192.168.49.1`, the address of the RC device in the WiFi direct network.
2. Run `yarn start` to start the development server.
3. Navigate to `localhost:3000` (although the previous command will likely open it for you).

## Example Snippets

### Telemetry
There are two main ways to send telemetry to the dashboard. Firstly, the dashboard can emulate the behavior of normal telemetry:
```java
RobotDashboard dashboard = RobotDashboard.getInstance();
Telemetry dashboardTelemetry = dashboard.getTelemetry();

dashboardTelemetry.addData("x", 3.7);
dashboardTelemetry.update();
```
This interface should feel familiar for FTC programmers (note that this doesn't implement some of the less commonly-used methods of `Telemetry`). Additionally, this method is also used in a common idiom for forwarding all normal telemetry messages to the dashboard:
```java
telemetry = new MultipleTelemetry(telemetry, RobotDashboard.getInstance().getTelemetry());
```
The second method uses `TelemetryPacket` and is completely independent from normal SDK telemetry. This way is slightly preferrable to the first one and allows for field overlay drawing (and other custom extensions -- more below).
```java
RobotDashboard dashboard = RobotDashboard.getInstance();

TelemetryPacket packet = new TelemetryPacket();
packet.put("x", 3.7);
packet.fieldOverlay()
    .setFill("blue")
    .fillRect(-20, -20, 40, 40);
dashboard.sendTelemetryPacket(packet);
```

### Configuration Variables
To declare configuration variables, add them as `static`, non-`final` fields of a class annotated with `@Config`:
```java
@Config
public class RobotConstants {
    public static int MAGIC_NUMBER = 32;
    public static PIDCoefficients TURNING_PID = new PIDCoefficients();
}
```
When new values are saved in the dashboard, the values of the fields are automatically updated. This reflection-based approach allows changes to occur while the OpMode is running with minimal boilerplate.

## Customizing
The dashboard is designed to be flexible and customizable. First off, the size of all the widgets/tiles are easily modifieid. The layout is based on CSS grids; to change the grid size, adjust the value of `grid-template` under `.tile-grid` in `src/index.css` and the corresponding `row`/`col` properties in `dash/src/containers/Dashboard.jsx` (read more about CSS grids [here](https://css-tricks.com/snippets/css/complete-guide-grid/)). You can also add your own widgets (React components) to `render()` in `Dashboard.jsx`. If you need additional data passed from the server, the recommended method is modifying the telemetry structure. To do this, add the necessary keys to `dash/src/reducers/telemetry.js` and they'll be available through Redux under `telemetry`. Of course, you may also extend the Redux store with additional actions (just make sure you correspondingly modify the backend; backend websocket message types correspond to Redux actions). For a good example of how this all comes together into a component, see `dash/src/containers/TelemetryView.jsx`.