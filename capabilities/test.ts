/**
 * Test Capability
 * Simple test capability to verify agent is working
 */

/*//////////////////////////////////////////////////////////////
                               IMPORTS
//////////////////////////////////////////////////////////////*/

import { z } from "zod";
import type {
  CapabilityConfig,
  CapabilityContext,
} from "../types/capability.js";

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
    description: "Test capability that logs all received parameters",

    /*//////////////////////////////////////////////////////////////
                            SCHEMA DEFINITION
    //////////////////////////////////////////////////////////////*/

    schema: z.object({
      message: z.string().optional().describe("Optional test message"),
    }),

    /*//////////////////////////////////////////////////////////////
                              RUN FUNCTION
    //////////////////////////////////////////////////////////////*/

    async run({ args, action }) {
      /*//////////////////////////////////////////////////////////////
                             TEST EXECUTION
      //////////////////////////////////////////////////////////////*/

      console.log("\n========================================");
      console.log("🎉 HYPERLIQUID AGENT TEST");
      console.log("========================================");

      console.log("\n📋 ARGS RECEIVED:");
      console.log(JSON.stringify(args, null, 2));

      if (action) {
        console.log("\n📦 ACTION CONTEXT:");
        console.log(
          JSON.stringify(
            {
              type: action.type,
              taskId: action.task?.id,
              workspaceId: action.workspace?.id,
            },
            null,
            2
          )
        );
      }

      console.log("\n========================================");
      console.log("✅ Test capability finished");
      console.log("========================================\n");

      return JSON.stringify(
        {
          success: true,
          message: "Test capability executed successfully",
          timestamp: new Date().toISOString(),
          receivedArgs: args,
        },
        null,
        2
      );
    },
  };
}
