import { z } from "zod";

import { OpportunitySchema } from "../schema.js";

/**
 * Schema for an important preparation-related date.
 */
export const preparationDateSchema = z.object({
  label: z.string(),
  value: z.string(),
});

/**
 * Schema for a requirement extracted from the opportunity source.
 */
export const preparationRequirementSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
});

/**
 * Schema for eligibility information.
 */
export const preparationEligibilitySchema = z.object({
  title: z.string(),
  description: z.string().optional(),
});

/**
 * Schema for participation or preparation constraints.
 */
export const preparationConstraintSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
});

/**
 * Schema for opportunity categories, tracks, or themes.
 */
export const preparationCategorySchema = z.object({
  name: z.string(),
  description: z.string().optional(),
});

/**
 * Schema for submission information.
 */
export const preparationSubmissionSchema = z.object({
  requirements: z.array(z.string()).optional(),
  instructions: z.string().optional(),
  submissionUrl: z.url().optional(),
});

/**
 * Schema for source content retrieved specifically for preparation.
 *
 * Route preserves this content as source material instead of asking
 * an LLM to summarize or interpret it.
 */
export const preparationSourceContentSchema = z.object({
  title: z.string().optional(),
  content: z.string(),
  url: z.url(),
});

/**
 * Schema describing the provenance of the preparation context.
 */
export const preparationSourceSchema = z.object({
  provider: z.string(),
  url: z.url(),
  retrievedAt: z.string(),
});

/**
 * Complete runtime validation schema for prepare_opportunity.
 *
 * The existing opportunitySchema is reused here so that the core
 * Opportunity model has a single source of truth.
 */
export const opportunityPreparationContextSchema = z.object({
  opportunity: OpportunitySchema,

  preparation: z.object({
    importantDates: z.array(preparationDateSchema).optional(),

    requirements: z.array(preparationRequirementSchema).optional(),

    eligibility: z.array(preparationEligibilitySchema).optional(),

    constraints: z.array(preparationConstraintSchema).optional(),

    categories: z.array(preparationCategorySchema).optional(),

    submission: preparationSubmissionSchema.optional(),
  }),

  sourceContent: z.array(preparationSourceContentSchema).optional(),

  source: preparationSourceSchema,
});
