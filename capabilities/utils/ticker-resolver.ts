/**
 * Ticker Resolution Utility
 * Resolves token tickers (e.g., "SERV", "DEGEN") to contract addresses
 * Uses hybrid approach: Relay token list first, then DexScreener fallback
 */

/*//////////////////////////////////////////////////////////////
                            IMPORTS
//////////////////////////////////////////////////////////////*/

import { BASE_CHAIN_ID } from "./relay-client.js";

/*//////////////////////////////////////////////////////////////
                            INTERFACES
//////////////////////////////////////////////////////////////*/

export interface ResolvedToken {
  address: string;
  chainId: number;
  symbol: string;
  decimals: number;
  name?: string;
  source: "relay" | "dexscreener";
}

/*//////////////////////////////////////////////////////////////
                        RESOLVER FUNCTIONS
//////////////////////////////////////////////////////////////*/

/**
 * Resolve a ticker symbol to a token address on Base chain
 * @param ticker - Token symbol (e.g., "SERV", "DEGEN")
 * @returns Resolved token information or null if not found
 */
export async function resolveTickerToAddress(
  ticker: string
): Promise<ResolvedToken | null> {
  console.log(`\n🔍 Resolving ticker: ${ticker}`);

  // Normalize ticker
  const normalizedTicker = ticker.toUpperCase().replace(/^\$/, "");

  /*//////////////////////////////////////////////////////////////
                        TRY RELAY TOKEN LIST
  //////////////////////////////////////////////////////////////*/

  try {
    console.log(`   📋 Checking Relay Protocol token list...`);

    // Call Relay API directly to get currencies
    const response = await fetch(
      `https://api.relay.link/currencies/v1?chainId=${BASE_CHAIN_ID}`
    );

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const data = await response.json();
    const currencies = Array.isArray(data) ? data : data.currencies || [];

    // Find matching token on Base chain
    const relayToken = currencies.find(
      (currency: any) =>
        currency.symbol?.toUpperCase() === normalizedTicker &&
        currency.chainId === BASE_CHAIN_ID
    );

    if (relayToken && relayToken.address) {
      console.log(`   ✅ Found in Relay list: ${relayToken.address}`);
      return {
        address: relayToken.address.toLowerCase(),
        chainId: BASE_CHAIN_ID,
        symbol: relayToken.symbol || normalizedTicker,
        decimals: relayToken.decimals || 18,
        name: relayToken.name,
        source: "relay",
      };
    }

    console.log(`   ⚠️  Not found in Relay list, trying DexScreener...`);
  } catch (error: any) {
    console.log(
      `   ⚠️  Relay lookup failed: ${error.message}, trying DexScreener...`
    );
  }

  /*//////////////////////////////////////////////////////////////
                      FALLBACK TO DEXSCREENER
  //////////////////////////////////////////////////////////////*/

  try {
    console.log(`   🔎 Checking DexScreener...`);

    const response = await fetch(
      `https://api.dexscreener.com/latest/dex/search?q=${normalizedTicker}`
    );

    if (!response.ok) {
      console.log(`   ❌ DexScreener request failed: ${response.status}`);
      return null;
    }

    const data = await response.json();

    if (!data.pairs || data.pairs.length === 0) {
      console.log(`   ❌ No results found on DexScreener`);
      return null;
    }

    // Filter for Base chain (chainId: "base")
    // Sort by liquidity (FDV) and 24h volume
    const basePairs = data.pairs
      .filter(
        (pair: any) =>
          pair.chainId === "base" &&
          pair.baseToken?.symbol?.toUpperCase() === normalizedTicker
      )
      .sort((a: any, b: any) => {
        // Sort by liquidity first, then volume
        const aLiq = parseFloat(a.liquidity?.usd || "0");
        const bLiq = parseFloat(b.liquidity?.usd || "0");
        if (aLiq !== bLiq) return bLiq - aLiq;

        const aVol = parseFloat(a.volume?.h24 || "0");
        const bVol = parseFloat(b.volume?.h24 || "0");
        return bVol - aVol;
      });

    if (basePairs.length === 0) {
      console.log(`   ❌ No Base chain pairs found on DexScreener`);
      return null;
    }

    const topPair = basePairs[0];
    const token = topPair.baseToken;

    console.log(`   ✅ Found on DexScreener: ${token.address}`);
    console.log(
      `      Liquidity: $${parseFloat(
        topPair.liquidity?.usd || "0"
      ).toLocaleString()}`
    );
    console.log(
      `      24h Volume: $${parseFloat(
        topPair.volume?.h24 || "0"
      ).toLocaleString()}`
    );

    return {
      address: token.address.toLowerCase(),
      chainId: BASE_CHAIN_ID,
      symbol: token.symbol || normalizedTicker,
      decimals: 18, // DexScreener doesn't always provide decimals, default to 18
      name: token.name,
      source: "dexscreener",
    };
  } catch (error: any) {
    console.log(`   ❌ DexScreener lookup failed: ${error.message}`);
    return null;
  }
}

/**
 * Validate that a token address is a valid Ethereum address
 * @param address - Address to validate
 * @returns True if valid, false otherwise
 */
export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}
