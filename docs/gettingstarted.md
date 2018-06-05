---
layout: default
---

# Getting Started

## Installation

1. Download the `.zip` archive using the button above or clone the repo with the following command in your project directory:

    ```git clone https://github.com/acmerobotics/ftc-dashboard FtcDashboard```

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

6. Add `include ':FtcDashboard'` to the end of the top-level `settings.gradle` if it isn't there already.

7. Right-click `FtcRobotController` in the project pane and select `Open Module Settings`. Now select the `Dependencies` tab in the dialog that pops up. Finally, click the plus icon, choose `Module dependency`, select `FtcDashboard`, and click OK twice.

8. Repeat step 7 with `TeamCode` instead of `FtcRobotController`.

9. Navigate to the main activity (`org.firstinspires.ftc.robotcontroller.internal.FtcRobotControllerActivity`) inside of the `FtcRobotController` module.

10. Insert the line `RobotDashboard.start();` at the end of `onCreate()`.

11. Insert the line `RobotDashboard.stop();` at the end of `onDestroy()`.

12. To enable op mode management, insert `RobotDashboard.attachEventLoop(eventLoop);` at the end of `requestRobotSetup()` (this is optional).

13. Build and deploy!

## Usage

1. Install [node](https://nodejs.org/en/download/) and [yarn](https://yarnpkg.com/en/docs/install) if not installed already.

2. Run `yarn` in `<FTC project>/FtcDashboard/dash/` (_this only needs to be done once!_).

3. If necessary, change the host in `dash/src/containers/Dashboard.jsx` in the `connect()` method to match that of the RC device. The default is `192.168.49.1`, the address of the RC device in the WiFi direct network.

4. Run `yarn start` to start the development server.

5. Navigate to `localhost:3000` (although the previous command will likely open it for you).