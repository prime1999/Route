import type { Opportunity } from "../types.js";

/**
 * Represents an important date associated with an opportunity.
 *
 * Examples:
 * - Submission deadline
 * - Registration deadline
 * - Event start date
 * - Event end date
 */
export interface PreparationDate {
  label: string;
  value: string;
}

/**
 * Represents a requirement extracted from the opportunity source.
 */
export interface PreparationRequirement {
  title: string;
  description?: string;
}

/**
 * Represents eligibility information extracted from the opportunity source.
 */
export interface PreparationEligibility {
  title: string;
  description?: string;
}

/**
 * Represents a constraint that may affect participation
 * or preparation for the opportunity.
 */
export interface PreparationConstraint {
  title: string;
  description?: string;
}

/**
 * Represents a category, track, theme, or other classification
 * provided by the opportunity source.
 */
export interface PreparationCategory {
  name: string;
  description?: string;
}

/**
 * Represents submission-related information.
 */
export interface PreparationSubmission {
  requirements?: string[];
  instructions?: string;
  submissionUrl?: string;
}

/**
 * Represents additional source content retrieved specifically
 * to help an AI agent understand how to prepare for an opportunity.
 *
 * Route preserves the original source content rather than
 * generating an LLM summary.
 */
export interface PreparationSourceContent {
  title?: string;
  content: string;
  url: string;
}

/**
 * Represents the provenance of the preparation context.
 *
 * This allows consumers to know which provider supplied the
 * information, which source URL it came from, and when it was
 * retrieved.
 */
export interface PreparationSource {
  provider: string;
  url: string;
  retrievedAt: string;
}

/**
 * Complete TypeScript representation of the preparation context
 * returned by prepare_opportunity.
 *
 * The core Opportunity object remains the single source of truth
 * for the opportunity itself. This type only adds preparation-
 * specific information around that Opportunity.
 */
export interface OpportunityPreparationContext {
  opportunity: Opportunity;

  preparation: {
    importantDates?: PreparationDate[];
    requirements?: PreparationRequirement[];
    eligibility?: PreparationEligibility[];
    constraints?: PreparationConstraint[];
    categories?: PreparationCategory[];
    submission?: PreparationSubmission;
  };

  sourceContent?: PreparationSourceContent[];

  source: PreparationSource;
}
