const {
  BinaryMessagingController,
} = require("../../../app/browser/tools/binaryMessaging");

globalThis.addEventListener("DOMContentLoaded", () => {
  const controller = new BinaryMessagingController({
    hostname: "teams.microsoft.com",
  });
  controller.init({
    binaryMessaging: {
      enabled: false,
      autoDetectReceivedMessages: true,
      showTranslateButton: true,
    },
  });
  globalThis.__binaryMessagingController = controller;
});
