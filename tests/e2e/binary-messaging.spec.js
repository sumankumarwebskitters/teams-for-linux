import { test, expect, _electron as electron } from "@playwright/test";
import { join } from "node:path";

const fixture = join(
  process.cwd(),
  "tests",
  "e2e",
  "fixtures",
  "binaryMessagingHarness.js"
);

test("Binary Messaging Mode controls outgoing and received messages", async () => {
  const electronApp = await electron.launch({ args: [fixture] });
  const page = await electronApp.firstWindow();

  try {
    const composer = page.locator("#new-message-test");
    const send = page.locator("#send-message");
    const toggle = page.locator("[data-tfl-binary-ui].tfl-binary-mode-toggle");

    await expect(toggle).toHaveText("Binary Mode OFF");
    await expect(toggle).toHaveAttribute("aria-pressed", "false");

    await composer.fill("Hello");
    await send.click();
    expect(await page.evaluate(() => globalThis.sentMessages.at(-1))).toBe(
      "Hello"
    );

    await toggle.press("Enter");
    await expect(toggle).toHaveText("Binary Mode ON");
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    await composer.fill("Hello");
    await send.click();
    await expect
      .poll(() => page.evaluate(() => globalThis.sentMessages.at(-1)))
      .toBe(
        "01001000 01100101 01101100 01101100 01101111"
      );
    expect(await page.evaluate(() => globalThis.editorModelWrites)).toBe(1);
    expect(await page.evaluate(() => globalThis.sentMessages)).toHaveLength(2);

    await composer.fill("😀");
    await send.click();
    await expect
      .poll(() => page.evaluate(() => globalThis.sentMessages.at(-1)))
      .toBe("11110000 10011111 10011000 10000000");
    expect(await page.evaluate(() => globalThis.sentMessages)).toHaveLength(3);

    await composer.fill("plain Enter stays a newline");
    await composer.press("Enter");
    expect(await page.evaluate(() => globalThis.sentMessages)).toHaveLength(3);

    await composer.fill("é");
    await composer.press("Control+Enter");
    await expect
      .poll(() => page.evaluate(() => globalThis.sentMessages.at(-1)))
      .toBe("11000011 10101001");
    expect(await page.evaluate(() => globalThis.sentMessages)).toHaveLength(4);
    await send.click();
    await expect
      .poll(() => page.evaluate(() => globalThis.sentMessages.length))
      .toBe(5);
    expect(await page.evaluate(() => globalThis.sentMessages.at(-1))).toBe(
      "11000011 10101001"
    );

    await toggle.click();
    await expect(toggle).toHaveText("Binary Mode OFF");
    await composer.fill("Hello again");
    await send.click();
    expect(await page.evaluate(() => globalThis.sentMessages.at(-1))).toBe(
      "Hello again"
    );
    expect(await page.evaluate(() => globalThis.sentMessages)).toHaveLength(6);

    const binaryMessage = page.locator("#binary-message");
    const translate = binaryMessage.locator(".tfl-binary-translate-button");
    await expect(translate).toHaveCount(1);
    await expect(
      page.locator("#normal-message .tfl-binary-translate-button")
    ).toHaveCount(0);

    await translate.click();
    await expect(binaryMessage.locator(".tfl-binary-decoded")).toContainText(
      "Decoded: Hello"
    );
    await expect(translate).toHaveText("Hide Translation");

    await page.evaluate(() => {
      document
        .querySelector('#binary-message > div[dir="auto"]')
        .append(document.createTextNode(""));
    });
    await expect(binaryMessage.locator(".tfl-binary-translate-button")).toHaveCount(
      1
    );

    await page.evaluate(() => {
      document.querySelector(
        '#binary-message > div[dir="auto"]'
      ).textContent = "01001000 01101001";
    });
    await expect(binaryMessage.locator(".tfl-binary-decoded")).toContainText(
      "Decoded: Hi"
    );
    await expect(binaryMessage.locator(".tfl-binary-translate-button")).toHaveCount(
      1
    );

    await page.evaluate(() => {
      const quotedOnly = document.createElement("article");
      quotedOnly.id = "quoted-only-message";
      quotedOnly.dataset.tid = "chat-pane-message";
      quotedOnly.innerHTML = `
        <div dir="auto">
          <div data-tid="quoted-reply-card">01001000 01101001</div>
          Thanks
        </div>`;
      document.getElementById("messages").append(quotedOnly);

      const binaryReply = document.createElement("article");
      binaryReply.id = "binary-reply-message";
      binaryReply.dataset.tid = "chat-pane-message";
      binaryReply.innerHTML = `
        <div dir="auto">
          <div data-tid="quoted-reply-card">Original plain-text message</div>
          01001000 01101001
        </div>`;
      document.getElementById("messages").append(binaryReply);
    });
    await expect(
      page.locator("#quoted-only-message .tfl-binary-translate-button")
    ).toHaveCount(0);
    await expect(
      page.locator("#binary-reply-message .tfl-binary-translate-button")
    ).toHaveCount(1);

    await page.evaluate(() => {
      const shell = document.createElement("section");
      shell.id = "late-composer-shell";
      shell.innerHTML = `
        <div id="new-message-late" contenteditable="true" role="textbox" aria-label="Type a message"></div>
        <div role="toolbar" aria-label="Message actions">
          <button type="button" data-tid="sendMessageCommands-send" aria-label="Send (Ctrl+Enter)">Send</button>
        </div>`;
      document.body.append(shell);
    });
    await expect(
      page.locator("#late-composer-shell .tfl-binary-mode-toggle")
    ).toHaveCount(1);
  } finally {
    await electronApp.close();
  }
});
