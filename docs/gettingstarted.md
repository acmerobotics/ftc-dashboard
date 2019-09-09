---
layout: default
---

# Getting Started

## Installation

### Basic

1. Open `build.gradle` in the root of your project. Add the following lines to the end:

    ```groovy
    allprojects {
        repositories {
            jcenter()
        }
    }
    ```

1. Open `build.release.gradle` in `FtcRobotController`. In the `dependencies` section add `implementation 'com.acmerobotics.dashboard:dashboard:0.3.4'`.

1. Repeat the previous step for `TeamCode` (and other modules you'd like to use the dashboard in).

1. Navigate to the main activity (`org.firstinspires.ftc.robotcontroller.internal.FtcRobotControllerActivity`) inside of the `FtcRobotController` module.

1. Insert `FtcDashboard.start();` at the end of `onCreate()`.

1. Insert `FtcDashboard.stop();` at the end of `onDestroy()`.

1. Insert `FtcDashboard.attachWebServer(service.getWebServer());` at the end of `onServiceBind()`.

1. Insert `FtcDashboard.populateMenu(popupMenu.getMenu());` [here](https://github.com/acmerobotics/ftc-dashboard/blob/e6c8f5799f167023cce47fdf6b0003355ad721c8/FtcRobotController/src/main/java/org/firstinspires/ftc/robotcontroller/internal/FtcRobotControllerActivity.java#L285) and `FtcDashboard.populateMenu(menu);` [here](https://github.com/acmerobotics/ftc-dashboard/blob/e6c8f5799f167023cce47fdf6b0003355ad721c8/FtcRobotController/src/main/java/org/firstinspires/ftc/robotcontroller/internal/FtcRobotControllerActivity.java#L496) (this is recommended for disabling the dashboard during competition).

1. To enable op mode management, insert `FtcDashboard.attachEventLoop(eventLoop);` at the end of `requestRobotSetup()` (this is optional).

1. Build and deploy!

### Advanced

1. Clone this repo locally.

1. Append `-SNAPSHOT` to the end of `ext.dashboard_version` in `FtcDashboard/build.gradle` (this differentiates your local build from the releases on Bintray).

1. After making changes, publish them locally with `./gradlew publishToMavenLocal` (this has to be done on each computer).

1. Complete the basic instructions, adjusting the version and adding `mavenLocal()` to `repositories` in addition to `jcenter()`.

1. Build and deploy like normal.

## Usage

### Basic

1. Connect to the WiFi network broadcast by the RC (the passphrase is located in the `Program and Manage` menu).

1. Navigate to `192.168.49.1:8080/dash` with a phone RC or `192.168.43.1:8080/dash` with a Control Hub.

### Development

1. Install [node](https://nodejs.org/en/download/) and [yarn](https://yarnpkg.com/en/docs/install) if not installed already.

1. Run `yarn` in `FtcDashboard/dash/` (_this only needs to be done once!_).

1. Run `yarn start` to start the development server.

1. Navigate to `localhost:3000` (although the previous command will likely open it for you).