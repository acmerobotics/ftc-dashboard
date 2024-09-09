---
layout: default
---

# Getting Started

## Installation

### Basic

Open `build.dependencies.gradle`. In the `repositories` section add `maven { url = 'https://maven.brott.dev/' }`, and in the `dependencies` section add `implementation 'com.acmerobotics.dashboard:dashboard:0.4.16'`.

Note: If you're using OpenRC or have non-standard SDK dependencies, add the following exclusion.
```groovy
implementation('com.acmerobotics.dashboard:dashboard:0.4.16') {
    exclude group: 'org.firstinspires.ftc'
}
```

### Advanced

1. Clone this repo locally.

1. Append `-SNAPSHOT` to the end of `ext.dashboard_version` in `FtcDashboard/build.gradle`.

1. After making changes, publish them locally with `./gradlew publishToMavenLocal` (this has to be done on each computer).

1. Complete the basic instructions, adjusting the version and adding `mavenLocal()` to `repositories`.

1. Build and deploy like normal.

## Usage

### Basic

1. Connect to the WiFi network broadcast by the RC (the passphrase is located in the `Program and Manage` menu).

1. Navigate to `192.168.49.1:8080/dash` with a phone RC or `192.168.43.1:8080/dash` with a Control Hub.

### Development

1. Install [node](https://nodejs.org/en/download/) and [yarn](https://yarnpkg.com/en/docs/install) if not installed already.

1. Run `yarn` in `FtcDashboard/dash/` (_this only needs to be done once!_).

1. Optionally specify the server IP address through the environment variable `VITE_REACT_APP_HOST`. I prefer to save `VITE_REACT_APP_HOST=<insert IP>` in `.env.development.local` or prefix the following command with `VITE_REACT_APP_HOST=<insert IP> `.

1. Run `yarn start` to start the development server.

1. Navigate to `localhost:3000` (although the previous command will likely open it for you).
