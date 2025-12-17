/**
 * Standalone Capability Tester
 * Test capabilities directly without starting the full agent server
 */

import "dotenv/config";
import { createTestCapability } from "./capabilities/test.js";
import { resolveTickerToAddress } from "./capabilities/utils/ticker-resolver.js";

/*//////////////////////////////////////////////////////////////
                            CONFIGURATION
//////////////////////////////////////////////////////////////*/

const context = {
  env: process.env,
};

/*//////////////////////////////////////////////////////////////
                         TEST CONFIGURATION
//////////////////////////////////////////////////////////////*/

// Define test cases in one place
const TEST_CASES = [
  { ticker: "$BRETT", description: "Meme token (BRETT)" },
  { ticker: "KUDAI", description: "AI Agent token (KUDAI)" },
  { ticker: "SERV", description: "Agent no-code platform token (SERV)" },
];

/*//////////////////////////////////////////////////////////////
                         TEST FUNCTIONS
//////////////////////////////////////////////////////////////*/

async function testTickerResolver() {
  console.log("\n========================================");
  console.log("🔍 TEST: Ticker Resolver");
  console.log("========================================\n");

  for (const { ticker } of TEST_CASES) {
    console.log(`Testing: ${ticker}`);
    try {
      const result = await resolveTickerToAddress(ticker);
      if (result) {
        console.log(`  ✅ Found: ${result.symbol} (${result.address})`);
        console.log(`     Source: ${result.source}`);
      } else {
        console.log(`  ❌ Not found`);
      }
    } catch (error: any) {
      console.log(`  ❌ Error: ${error.message}`);
    }
    console.log();
  }
}

async function testQuoteCapability() {
  console.log("\n========================================");
  console.log("💱 TEST: Quote Capability");
  console.log("========================================\n");

  const testCap = createTestCapability(context);

  for (const testCase of TEST_CASES) {
    console.log(`\n📝 Test: ${testCase.description}`);
    console.log(`   Ticker: ${testCase.ticker}`);

    try {
      const result = await testCap.run({
        args: { ticker: testCase.ticker },
        action: null as any, // No action needed for test capability
      });

      const parsed = JSON.parse(result);

      if (parsed.success) {
        console.log(`   ✅ SUCCESS`);
        console.log(
          `   Token: ${parsed.resolvedToken.symbol} (${parsed.resolvedToken.address})`
        );
        console.log(`   Source: ${parsed.resolvedToken.source}`);
        if (parsed.quote?.details) {
          const d = parsed.quote.details;
          console.log(
            `   Expected Output: ${d.currencyOut?.amountFormatted || "N/A"} ${
              parsed.resolvedToken.symbol
            }`
          );
          console.log(`   Rate: ${d.rate || "N/A"} per ETH`);
          console.log(`   Price Impact: ${d.totalImpact?.percent || "N/A"}%`);
        }
      } else {
        console.log(`   ❌ FAILED: ${parsed.error}`);
      }
    } catch (error: any) {
      console.log(`   ❌ ERROR: ${error.message}`);
    }
  }
}

/*//////////////////////////////////////////////////////////////
                            MAIN RUNNER
//////////////////////////////////////////////////////////////*/

async function main() {
  console.log("\n🧪 CAPABILITY TESTING SUITE");
  console.log("Testing capabilities without the server\n");

  try {
    // Test 1: Ticker Resolver
    await testTickerResolver();

    // Test 2: Quote Capability
    await testQuoteCapability();

    console.log("\n========================================");
    console.log("✅ All tests complete!");
    console.log("========================================\n");
  } catch (error: any) {
    console.error("\n❌ Test suite failed:");
    console.error(error);
    process.exit(1);
  }
}

/*//////////////////////////////////////////////////////////////
                         ERROR HANDLING
//////////////////////////////////////////////////////////////*/

main().catch((error) => {
  console.error("❌ Unhandled error:", error);
  process.exit(1);
});
