/**
 * Trade Capability - Relay Protocol Token Swaps
 * Executes token swaps on Base chain using Relay Protocol
 */

/*//////////////////////////////////////////////////////////////
                            IMPORTS
//////////////////////////////////////////////////////////////*/

import { z } from "zod";
import { createWalletClient, http, type Address } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";
import type {
  CapabilityConfig,
  CapabilityContext,
} from "../types/capability.js";
import { relayClient, BASE_CHAIN_ID, BASE_CURRENCIES } from "./utils/relay-client.js";
import { resolveTickerToAddress } from "./utils/ticker-resolver.js";

/*//////////////////////////////////////////////////////////////
                      FUNCTION DEFINITION
//////////////////////////////////////////////////////////////*/

export function createTradeCapability(
  context: CapabilityContext
): CapabilityConfig {
  const { env } = context;

  /*//////////////////////////////////////////////////////////////
                        CAPABILITY CONFIG
  //////////////////////////////////////////////////////////////*/

  return {
    name: "trade_token",
    description:
      "Swap ETH or USDC for a specific token on Base chain using Relay Protocol",

    /*//////////////////////////////////////////////////////////////
                        SCHEMA DEFINITION
    //////////////////////////////////////////////////////////////*/

    schema: z.object({
      ticker: z
        .string()
        .describe('Token symbol to buy (e.g., "SERV", "DEGEN", "$BRETT")'),
      amount: z
        .string()
        .describe('Amount of ETH or USDC to spend (e.g., "0.1", "10")'),
      inputCurrency: z
        .enum(["ETH", "USDC"])
        .describe("Currency to spend: ETH or USDC"),
      slippage: z
        .string()
        .optional()
        .describe("Slippage tolerance percentage (default: 2)"),
      pk_name: z
        .string()
        .describe(
          'Secret name containing the private key (e.g., "relay_key", "BASE_PRIVATE_KEY")'
        ),
    }),

    /*//////////////////////////////////////////////////////////////
                          RUN FUNCTION
    //////////////////////////////////////////////////////////////*/

    async run({ args, action }) {
      try {
        /*//////////////////////////////////////////////////////////////
                          TRADE INITIALIZATION
        //////////////////////////////////////////////////////////////*/

        console.log("\n========================================");
        console.log("⚡ RELAY PROTOCOL TOKEN SWAP");
        console.log("========================================");
        console.log(`📊 Swap Details:`);
        console.log(`   Token: ${args.ticker}`);
        console.log(`   Amount: ${args.amount} ${args.inputCurrency}`);
        console.log(`   Input Currency: ${args.inputCurrency}`);
        console.log(`   Slippage: ${args.slippage || "2"}%`);
        console.log(`   Private Key Secret: ${args.pk_name}`);
        console.log(`   Chain: Base`);

        /*//////////////////////////////////////////////////////////////
                        CREDENTIAL FETCHING
        //////////////////////////////////////////////////////////////*/

        const workspaceId = action?.workspace?.id;
        if (!workspaceId) {
          console.error("\n❌ Workspace ID not found in action context");
          return JSON.stringify({
            error: "Workspace ID is required to fetch secrets",
            success: false,
          });
        }

        const OPENSERV_API_KEY = env.OPENSERV_API_KEY;
        const OPENSERV_API_URL =
          env.OPENSERV_API_URL || "https://api.openserv.ai";

        if (!OPENSERV_API_KEY) {
          console.error("\n❌ OPENSERV_API_KEY not found in environment");
          return JSON.stringify({
            error: "OPENSERV_API_KEY not configured",
            success: false,
          });
        }

        console.log(`\n🔐 Fetching credentials from OpenServ secrets...`);
        console.log(`   Workspace ID: ${workspaceId}`);

        // List all secrets
        const secretsListResponse = await fetch(
          `${OPENSERV_API_URL}/workspaces/${workspaceId}/agent-secrets`,
          {
            headers: {
              accept: "application/json",
              "x-openserv-key": OPENSERV_API_KEY,
            },
          }
        );

        if (!secretsListResponse.ok) {
          console.error(
            `❌ Failed to list secrets: ${secretsListResponse.status}`
          );
          return JSON.stringify({
            error: `Failed to list secrets: ${secretsListResponse.status}`,
            success: false,
          });
        }

        const secrets = await secretsListResponse.json();
        console.log(`   Found ${secrets.length} secrets in workspace`);

        // Find required private key secret
        const privateKeySecret = secrets.find(
          (s: any) => s.name === args.pk_name
        );

        if (!privateKeySecret) {
          const availableSecrets = secrets.map((s: any) => s.name).join(", ");
          console.error(`❌ Secret "${args.pk_name}" not found`);
          console.log(`   Available secrets: ${availableSecrets}`);
          return JSON.stringify({
            error: `Secret "${args.pk_name}" not found in OpenServ workspace`,
            availableSecrets: secrets.map((s: any) => s.name),
            success: false,
          });
        }

        console.log(
          `   ✅ Found "${args.pk_name}" (ID: ${privateKeySecret.id})`
        );

        // Fetch secret value
        console.log(`\n🔑 Fetching private key...`);

        const privateKeyResponse = await fetch(
          `${OPENSERV_API_URL}/workspaces/${workspaceId}/agent-secrets/${privateKeySecret.id}/value`,
          {
            headers: {
              accept: "application/json",
              "x-openserv-key": OPENSERV_API_KEY,
            },
          }
        );

        if (!privateKeyResponse.ok) {
          console.error(
            `❌ Failed to get "${args.pk_name}" value: ${privateKeyResponse.status}`
          );
          return JSON.stringify({
            error: `Failed to get "${args.pk_name}" value: ${privateKeyResponse.status}`,
            success: false,
          });
        }

        const PRIVATE_KEY = (await privateKeyResponse.text()).replace(
          /^"|"$/g,
          ""
        ) as `0x${string}`;

        console.log(`   ✅ Successfully retrieved private key`);
        console.log(
          `   Key Preview: ${PRIVATE_KEY.substring(0, 10)}...${PRIVATE_KEY.substring(PRIVATE_KEY.length - 4)}`
        );

        /*//////////////////////////////////////////////////////////////
                        WALLET INITIALIZATION
        //////////////////////////////////////////////////////////////*/

        console.log(`\n👛 Initializing wallet...`);

        const account = privateKeyToAccount(PRIVATE_KEY);
        const walletClient = createWalletClient({
          account,
          chain: base,
          transport: http(),
        });

        console.log(`   ✅ Wallet address: ${account.address}`);

        /*//////////////////////////////////////////////////////////////
                        TICKER RESOLUTION
        //////////////////////////////////////////////////////////////*/

        const resolvedToken = await resolveTickerToAddress(args.ticker);

        if (!resolvedToken) {
          console.error(`\n❌ Could not resolve ticker: ${args.ticker}`);
          return JSON.stringify({
            error: `Could not find token address for "${args.ticker}" on Base chain`,
            success: false,
          });
        }

        console.log(`\n✅ Token Resolved:`);
        console.log(`   Symbol: ${resolvedToken.symbol}`);
        console.log(`   Address: ${resolvedToken.address}`);
        console.log(`   Name: ${resolvedToken.name || "Unknown"}`);
        console.log(`   Decimals: ${resolvedToken.decimals}`);
        console.log(`   Source: ${resolvedToken.source}`);

        /*//////////////////////////////////////////////////////////////
                        INPUT CURRENCY MAPPING
        //////////////////////////////////////////////////////////////*/

        const fromCurrency =
          args.inputCurrency === "ETH"
            ? BASE_CURRENCIES.ETH
            : BASE_CURRENCIES.USDC;

        console.log(`\n💱 Setting up swap:`);
        console.log(`   From: ${args.inputCurrency} (${fromCurrency})`);
        console.log(`   To: ${resolvedToken.symbol} (${resolvedToken.address})`);
        console.log(`   Amount: ${args.amount}`);

        /*//////////////////////////////////////////////////////////////
                            GET SWAP QUOTE
        //////////////////////////////////////////////////////////////*/

        console.log(`\n📊 Fetching swap quote from Relay Protocol...`);

        // Convert amount to wei/smallest unit based on input currency
        const amountInWei =
          args.inputCurrency === "ETH"
            ? BigInt(Math.floor(parseFloat(args.amount) * 1e18)).toString()
            : BigInt(Math.floor(parseFloat(args.amount) * 1e6)).toString(); // USDC has 6 decimals

        try {
          const quote = await relayClient.actions.getQuote({
            chainId: BASE_CHAIN_ID,
            toChainId: BASE_CHAIN_ID,
            currency: fromCurrency,
            toCurrency: resolvedToken.address,
            amount: amountInWei,
            user: account.address,
            tradeType: "EXACT_INPUT",
            options: {
              slippage: args.slippage ? parseFloat(args.slippage) : 2,
            },
          });

          console.log(`   ✅ Quote received`);
          console.log(`   Quote Details:`);

          // Log quote details safely
          if (quote && typeof quote === "object") {
            const details = quote.details;
            if (details) {
              console.log(`      Expected Output: ${details.amountOut || "N/A"}`);
              console.log(`      Price Impact: ${details.priceImpact || "N/A"}%`);
            }
          }

          /*//////////////////////////////////////////////////////////////
                            EXECUTE SWAP
          //////////////////////////////////////////////////////////////*/

          console.log(`\n🚀 Executing swap on Base chain...`);

          const result = await relayClient.actions.execute({
            quote,
            wallet: walletClient,
          });

          console.log(`\n✅ SUCCESS! Swap Executed!`);
          console.log(`========================================`);
          console.log(`   Token: ${resolvedToken.symbol}`);
          console.log(`   Amount Spent: ${args.amount} ${args.inputCurrency}`);
          console.log(`   Transaction Hash: ${result}`);
          console.log(`   Explorer: https://basescan.org/tx/${result}`);
          console.log(`========================================\n`);

          return JSON.stringify(
            {
              success: true,
              ticker: args.ticker,
              resolvedToken: {
                symbol: resolvedToken.symbol,
                address: resolvedToken.address,
                name: resolvedToken.name,
              },
              inputAmount: args.amount,
              inputCurrency: args.inputCurrency,
              transactionHash: result,
              explorerUrl: `https://basescan.org/tx/${result}`,
              chain: "Base",
              message: `Successfully swapped ${args.amount} ${args.inputCurrency} for ${resolvedToken.symbol}`,
            },
            null,
            2
          );
        } catch (quoteError: any) {
          console.error(`\n❌ Quote/Execution failed!`);
          console.error(`   Error: ${quoteError.message || quoteError}`);

          return JSON.stringify(
            {
              success: false,
              error: quoteError.message || "Quote or execution failed",
              ticker: args.ticker,
              details: quoteError.toString(),
            },
            null,
            2
          );
        }

        /*//////////////////////////////////////////////////////////////
                          ERROR HANDLING
        //////////////////////////////////////////////////////////////*/
      } catch (err: any) {
        console.error(`\n❌ EXCEPTION CAUGHT!`);
        console.error(`========================================`);
        console.error(`   Error: ${err?.message || err}`);
        if (err?.stack) {
          console.error(
            `   Stack: ${err.stack.split("\n").slice(0, 3).join("\n   ")}`
          );
        }
        console.error(`========================================\n`);

        return JSON.stringify(
          {
            error: err?.message || "Unknown error",
            success: false,
            details: err?.toString(),
          },
          null,
          2
        );
      }
    },
  };
}
