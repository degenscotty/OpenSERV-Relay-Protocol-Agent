/**
 * Relay Protocol Trading Agent Server (default port 7380)
 *
 * Purpose:
 * - Modular architecture with pluggable capabilities
 * - Auto-registers all capabilities from ./capabilities/
 * - Executes token swaps on Base chain using Relay Protocol
 * - Runs as a standalone Node process
 *
 * Run locally:
 *   npm install
 *   OPENSERV_API_KEY=... npm start
 *
 * Env:
 *   OPENSERV_API_KEY          (required)
 *   PORT                      (optional, defaults to 7380)
 *   BASE_RPC_URL              (optional, custom RPC endpoint for Base)
 *
 * Secrets (configured in OpenServ workspace):
 *   (Any name you choose)     (required) - Wallet private key for Base chain
 *
 * Adding Capabilities:
 *   See ./capabilities/README.md for instructions
 */

/*//////////////////////////////////////////////////////////////
                               IMPORTS
//////////////////////////////////////////////////////////////*/

import "dotenv/config";
import { Agent } from "@openserv-labs/sdk";
import { getAllCapabilities } from "./capabilities/index.js";

/*//////////////////////////////////////////////////////////////
                            AGENT SETUP
//////////////////////////////////////////////////////////////*/

const OPENSERV_API_KEY = process.env.OPENSERV_API_KEY || "";

if (!OPENSERV_API_KEY) {
  console.error("❌ Please set OPENSERV_API_KEY in your environment");
  process.exit(1);
}

/*//////////////////////////////////////////////////////////////
                         AGENT INITIALIZATION
//////////////////////////////////////////////////////////////*/

const agent = new Agent({
  systemPrompt:
    "You are a Relay Protocol trading agent that executes token swaps on Base chain. You can swap ETH or USDC for any token using natural language (e.g., 'Buy $SERV with 0.1 ETH'). You automatically resolve token tickers to contract addresses.",
  apiKey: OPENSERV_API_KEY,
});

// Register all capabilities modularly
/*//////////////////////////////////////////////////////////////
                        CAPABILITY REGISTRATION
//////////////////////////////////////////////////////////////*/

const capabilities = getAllCapabilities({
  env: process.env,
});

/*//////////////////////////////////////////////////////////////
                           REGISTRATION LOOP
//////////////////////////////////////////////////////////////*/

capabilities.forEach((capability) => {
  agent.addCapability(capability);
  console.log(`✅ Registered capability: ${capability.name}`);
});

/*//////////////////////////////////////////////////////////////
                             MAIN FUNCTION
//////////////////////////////////////////////////////////////*/

async function main() {
  /*//////////////////////////////////////////////////////////////
                            STARTUP LOGGING
  //////////////////////////////////////////////////////////////*/

  console.log("\n========================================");
  console.log("⚡ RELAY PROTOCOL TRADING AGENT");
  console.log("========================================");
  console.log("📋 Configuration:");
  console.log(`   PORT: ${process.env.PORT || "7380 (default)"}`);
  console.log(`   OPENSERV_API_KEY: ${OPENSERV_API_KEY.substring(0, 8)}...`);
  console.log(`   CHAIN: Base (Chain ID: 8453)`);
  console.log(`   BASE_RPC_URL: ${process.env.BASE_RPC_URL || "default"}`);
  console.log("========================================\n");

  /*//////////////////////////////////////////////////////////////
                              AGENT START
  //////////////////////////////////////////////////////////////*/

  await agent.start();

  console.log("✅ Agent listening");
  console.log(`🔧 Capabilities:    ${capabilities.length} registered`);
  capabilities.forEach((cap) => {
    console.log(`   - ${cap.name}`);
  });

  /*//////////////////////////////////////////////////////////////
                           SHUTDOWN HANDLER
  //////////////////////////////////////////////////////////////*/

  process.on("SIGINT", async () => {
    console.log("\n🛑 Shutting down...");
    try {
      await agent.stop();
      console.log("✅ Agent stopped");
    } catch (e) {
      console.error("❌ Error while stopping agent:", e);
    } finally {
      process.exit(0);
    }
  });
}

/*//////////////////////////////////////////////////////////////
                            ERROR HANDLING
//////////////////////////////////////////////////////////////*/

main().catch((e) => {
  console.error("❌ Failed to start agent:", e);
  process.exit(1);
});
