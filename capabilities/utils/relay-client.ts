/**
 * Relay Protocol Client Utility
 * Initializes and exports a configured Relay client for Base chain
 */

/*//////////////////////////////////////////////////////////////
                            IMPORTS
//////////////////////////////////////////////////////////////*/

import {
  createClient,
  convertViemChainToRelayChain,
} from "@relayprotocol/relay-sdk";
import { base } from "viem/chains";

/*//////////////////////////////////////////////////////////////
                        CLIENT CONFIGURATION
//////////////////////////////////////////////////////////////*/

/**
 * Relay Protocol client configured for Base chain
 * Used across all trading capabilities
 */
export const relayClient = createClient({
  baseApiUrl: "https://api.relay.link",
  source: "openserv-relay-agent",
  chains: [convertViemChainToRelayChain(base)],
});

/*//////////////////////////////////////////////////////////////
                        CHAIN CONSTANTS
//////////////////////////////////////////////////////////////*/

/**
 * Base chain configuration
 */
export const BASE_CHAIN_ID = 8453;

/**
 * Base chain currency addresses
 */
export const BASE_CURRENCIES = {
  // Native ETH (Relay uses this special address for native tokens)
  ETH: "0x0000000000000000000000000000000000000000",
  // USDC on Base
  USDC: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
} as const;
