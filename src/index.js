/**
 * Ultra Bot V2 – Main Entry
 * Developer: RANA (MASTER 🪓)
 * Node.js >= 18
 */

require("dotenv").config();

const fs = require("fs-extra");
const path = require("path");
const chalk = require("chalk");

// Optional security (if exists)
let guard;
try {
  guard = require("./secure/guard");
} catch (e) {
  console.log(chalk.yellow("⚠️ Guard system not found, skipping security check"));
}

// Facebook Chat API
const login = require("facebook-chat-api");

// Paths
const APPSTATE_PATH = path.join(__dirname, "secure", "appstate.json");

// Banner
console.log(chalk.cyan(`
====================================
🤖 ULTRA BOT V2
👑 Developer : RANA (MASTER 🪓)
⚙️ Node      : ${process.version}
📅 Start     : ${new Date().toLocaleString()}
====================================
`));

// Check appstate
if (!fs.existsSync(APPSTATE_PATH)) {
  console.log(chalk.red("❌ appstate.json not found!"));
  console.log(chalk.yellow("➡️ Put appstate.json inside: src/secure/appstate.json"));
  process.exit(1);
}

// Load appstate
let appState;
try {
  appState = JSON.parse(fs.readFileSync(APPSTATE_PATH, "utf8"));
} catch (err) {
  console.log(chalk.red("❌ Invalid appstate.json"));
  process.exit(1);
}

// Login
login(
  { appState },
  {
    listenEvents: true,
    selfListen: false,
    logLevel: "silent"
  },
  (err, api) => {
    if (err) {
      console.error(chalk.red("❌ Login failed:"), err);
      process.exit(1);
    }

    console.log(chalk.green("✅ Logged in successfully!"));

    // Auto mark as read
    api.setOptions({
      markRead: true,
      forceLogin: true
    });

    // Listen messages
    api.listenMqtt((err, event) => {
      if (err) {
        console.error("Listen error:", err);
        return;
      }

      if (event.type === "message" || event.type === "message_reply") {
        const body = event.body || "";

        console.log(
          chalk.blue(`[MSG] ${event.senderID}:`),
          body
        );

        // Basic reply
        if (body.toLowerCase() === "hi") {
          api.sendMessage("Hello 👋 আমি Ultra Bot!", event.threadID);
        }

        if (body.toLowerCase() === "ping") {
          api.sendMessage("pong 🏓", event.threadID);
        }
      }
    });
  }
);
