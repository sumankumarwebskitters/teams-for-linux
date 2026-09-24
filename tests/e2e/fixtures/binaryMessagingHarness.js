const { app, BrowserWindow } = require("electron");
const path = require("node:path");

app.whenReady().then(async () => {
  const window = new BrowserWindow({
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "binaryMessagingHarnessPreload.js"),
      contextIsolation: false,
      nodeIntegration: false,
      sandbox: false,
    },
  });
  await window.loadFile(path.join(__dirname, "binaryMessagingHarness.html"));
  window.show();
});

app.on("window-all-closed", () => app.quit());
