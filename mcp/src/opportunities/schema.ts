import { z } from "zod";

/**
 * Route Opportunity Validation Schemas
 * ====================================
 *
 * TypeScript protects us during development.
 *
 * Zod protects us at runtime.
 *
 * Every external provider should pass its data through these
 * schemas before Route exposes the opportunity to MCP clients.
 */

/**
 * Supported opportunity categories.
 *
 * This schema mirrors the OpportunityType TypeScript union.
 */
export const OpportunityTypeSchema = z.enum(["job", "hackathon"]);

/**
 * Runtime validation schema for Route opportunities.
 *
 * Any provider returning data must satisfy this schema.
 */
export const OpportunitySchema = z.object({
  /**
   * Route-generated identifier.
   */
  id: z.string(),

  /**
   * Opportunity title.
   */
  title: z.string(),

  /**
   * Opportunity category.
   */
  type: OpportunityTypeSchema,

  /**
   * Organization name.
   */
  organization: z.string(),

  /**
   * Human-readable summary.
   */
  description: z.string(),

  /**
   * Canonical URL.
   */
  url: z.string().url(),

  /**
   * Provider name.
   */
  source: z.string(),

  /**
   * Original provider URL.
   */
  sourceUrl: z.string().url(),

  /**
   * Location information.
   */
  location: z.string().optional(),

  /**
   * Whether remote participation is possible.
   */
  remote: z.boolean().optional(),

  /**
   * ISO date string.
   */
  deadline: z.string().optional(),

  /**
   * Prize information.
   */
  prize: z.string().optional(),

  /**
   * Provider-specific metadata.
   */
  metadata: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Array schema used by search operations.
 *
 * Example:
 *
 * search_opportunities()
 *      ↓
 * Opportunity[]
 */
export const OpportunitiesSchema = z.array(OpportunitySchema);

/**
 * TypeScript types inferred directly from Zod.
 *
 * This guarantees our runtime schema and TypeScript types
 * stay synchronized.
 */
export type Opportunity = z.infer<typeof OpportunitySchema>;

export type OpportunityType = z.infer<typeof OpportunityTypeSchema>;
