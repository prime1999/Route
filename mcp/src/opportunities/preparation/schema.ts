import { z } from "zod";

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
 * Schema for source content retrieved for preparation.
 *
 * The content is preserved as source material instead of being
 * summarized inside Route.
 */
export const preparationSourceContentSchema = z.object({
  title: z.string().optional(),
  content: z.string(),
  url: z.url(),
});

/**
 * Schema describing where the preparation context came from.
 */
export const preparationSourceSchema = z.object({
  provider: z.string(),
  url: z.url(),
  retrievedAt: z.string(),
});

/**
 * Complete runtime validation schema for prepare_opportunity.
 *
 * The existing Opportunity schema will be reused here rather than
 * creating another definition of an Opportunity.
 */
export const opportunityPreparationContextSchema = z.object({
  opportunity: z.object({
    id: z.string(),
    title: z.string(),
    type: z.enum(["job", "hackathon"]),
    organization: z.string(),
    description: z.string(),
    url: z.url(),
    source: z.string(),
    sourceUrl: z.url(),
    location: z.string().optional(),
    remote: z.boolean().optional(),
    deadline: z.string().optional(),
    prize: z.string().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  }),

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
