/**
 * Test Capability
 * Test capability that gets a quote for swapping 1 ETH for a token
 */

/*//////////////////////////////////////////////////////////////
                               IMPORTS
//////////////////////////////////////////////////////////////*/

import { z } from "zod";
import type {
  CapabilityConfig,
  CapabilityContext,
} from "../types/capability.js";
import {
  relayClient,
  BASE_CHAIN_ID,
  BASE_CURRENCIES,
} from "./utils/relay-client.js";
import { resolveTickerToAddress } from "./utils/ticker-resolver.js";

/*//////////////////////////////////////////////////////////////
                         FUNCTION DEFINITION
//////////////////////////////////////////////////////////////*/

export function createTestCapability(
  context: CapabilityContext
): CapabilityConfig {
  return {
    /*//////////////////////////////////////////////////////////////
                           CAPABILITY CONFIG
    //////////////////////////////////////////////////////////////*/

    name: "test",
    description:
      "Test capability that gets a quote for swapping 1 ETH for a specified token",

    /*//////////////////////////////////////////////////////////////
                            SCHEMA DEFINITION
    //////////////////////////////////////////////////////////////*/

    schema: z.object({
      ticker: z
        .string()
        .optional()
        .describe(
          'Token symbol to get quote for (e.g., "DEGEN", "USDC"). If not provided, uses USDC.'
        ),
    }),

    /*//////////////////////////////////////////////////////////////
                              RUN FUNCTION
    //////////////////////////////////////////////////////////////*/

    async run({ args, action }) {
      try {
        /*//////////////////////////////////////////////////////////////
                             TEST EXECUTION
        //////////////////////////////////////////////////////////////*/

        console.log("\n========================================");
        console.log("🎉 RELAY PROTOCOL QUOTE TEST");
        console.log("========================================");

        const ticker = args.ticker || "USDC";
        const ethAmount = "1"; // 1 ETH

        console.log(`\n📊 Getting quote for:`);
        console.log(`   Swap: 1 ETH → ${ticker}`);
        console.log(`   Chain: Base`);

        /*//////////////////////////////////////////////////////////////
                           TICKER RESOLUTION
        //////////////////////////////////////////////////////////////*/

        console.log(`\n🔍 Resolving ticker: ${ticker}...`);

        const resolvedToken = await resolveTickerToAddress(ticker);

        if (!resolvedToken) {
          console.error(`\n❌ Could not resolve ticker: ${ticker}`);
          return JSON.stringify(
            {
              success: false,
              error: `Could not find token address for "${ticker}" on Base chain`,
            },
            null,
            2
          );
        }

        console.log(`   ✅ Token resolved:`);
        console.log(`      Symbol: ${resolvedToken.symbol}`);
        console.log(`      Address: ${resolvedToken.address}`);
        console.log(`      Name: ${resolvedToken.name || "Unknown"}`);
        console.log(`      Source: ${resolvedToken.source}`);

        /*//////////////////////////////////////////////////////////////
                              GET QUOTE
        //////////////////////////////////////////////////////////////*/

        console.log(`\n💱 Fetching quote from Relay Protocol...`);

        // Convert 1 ETH to wei
        const amountInWei = BigInt(1e18).toString(); // 1 ETH = 1e18 wei

        const quote = await relayClient.actions.getQuote({
          chainId: BASE_CHAIN_ID,
          toChainId: BASE_CHAIN_ID,
          currency: BASE_CURRENCIES.ETH,
          toCurrency: resolvedToken.address,
          amount: amountInWei,
          user: "0x0000000000000000000000000000000000000000", // Dummy address for quote
          tradeType: "EXACT_INPUT",
        });

        console.log(`\n✅ Quote received!`);
        console.log(`========================================`);

        // Extract quote details (quote structure may vary)
        const quoteData = quote as any;
        const steps = quoteData?.steps || [];

        console.log(`📋 Quote Details:`);
        console.log(`   From: 1 ETH`);
        console.log(`   To: ${ticker}`);
        console.log(`   Route Steps: ${steps.length}`);

        if (steps.length > 0) {
          console.log(`\n🔀 Route:`);
          steps.forEach((step: any, index: number) => {
            console.log(
              `   ${index + 1}. ${step.id || step.action || "Swap step"}`
            );
          });
        }

        console.log(`\n📦 Full Quote:`);
        console.log(JSON.stringify(quoteData, null, 2));
        console.log(`========================================\n`);

        /*//////////////////////////////////////////////////////////////
                            RETURN RESULT
        //////////////////////////////////////////////////////////////*/

        return JSON.stringify(
          {
            success: true,
            message: "Quote test executed successfully",
            ticker,
            resolvedToken: {
              symbol: resolvedToken.symbol,
              address: resolvedToken.address,
              name: resolvedToken.name,
              source: resolvedToken.source,
            },
            quote: quoteData,
            timestamp: new Date().toISOString(),
          },
          null,
          2
        );
      } catch (error: any) {
        console.error(`\n❌ Test failed!`);
        console.error(`   Error: ${error.message || error}`);

        return JSON.stringify(
          {
            success: false,
            error: error.message || "Unknown error",
            timestamp: new Date().toISOString(),
          },
          null,
          2
        );
      }
    },
  };
}
