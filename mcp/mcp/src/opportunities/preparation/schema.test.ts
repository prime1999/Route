import { opportunityPreparationContextSchema } from "./schema.js";

/**
 * This test verifies the runtime contract for prepare_opportunity.
 *
 * We test two things:
 *
 * 1. A realistic preparation context should pass validation.
 * 2. Invalid data should be rejected.
 *
 * This is important because TypeScript only checks types during
 * development. Zod protects Route at runtime when data comes from
 * external providers.
 */

const validPreparationContext = {
  opportunity: {
    id: "devpost:30984",
    title: "OpenCV AI Competition 2026, powered by AWS",
    type: "hackathon" as const,
    organization: "OpenCV",
    description: "OpenCV AI Competition 2026, powered by AWS.",
    url: "https://opencv26.devpost.com/",
    source: "devpost",
    sourceUrl: "https://devpost.com/api/hackathons",
    location: "Online",
    remote: true,
    deadline: "Aug 26 - Oct 27, 2026",
    prize: "$20,250",
    metadata: {
      themes: ["IoT", "Machine Learning/AI", "Serverless"],
    },
  },

  preparation: {
    importantDates: [
      {
        label: "Submission deadline",
        value: "Oct 27, 2026",
      },
    ],

    requirements: [
      {
        title: "Project submission",
        description: "Submit a project through the competition platform.",
      },
    ],

    eligibility: [
      {
        title: "Participation",
        description:
          "Participants must follow the competition eligibility rules.",
      },
    ],

    constraints: [
      {
        title: "Submission deadline",
        description: "Projects must be submitted before the deadline.",
      },
    ],

    categories: [
      {
        name: "Machine Learning/AI",
        description:
          "Projects related to machine learning and artificial intelligence.",
      },
    ],

    submission: {
      requirements: ["Project submission", "Project description"],
      instructions: "Follow the official competition submission instructions.",
      submissionUrl:
        "https://opencv26.devpost.com/challenges/start_a_submission",
    },
  },

  sourceContent: [
    {
      title: "Competition description",
      content:
        "Full source content retrieved from the official opportunity page.",
      url: "https://opencv26.devpost.com/",
    },
  ],

  source: {
    provider: "devpost",
    url: "https://opencv26.devpost.com/",
    retrievedAt: new Date().toISOString(),
  },
};

/**
 * Test 1: A realistic preparation context should validate.
 */
const validResult = opportunityPreparationContextSchema.safeParse(
  validPreparationContext,
);

if (!validResult.success) {
  console.error(
    "❌ Valid preparation context was rejected:",
    validResult.error,
  );

  process.exit(1);
}

console.log("✓ Valid preparation context passed schema validation.");

/**
 * Test 2: The schema should reject invalid opportunity data.
 *
 * We intentionally replace the opportunity URL with an invalid
 * value. The existing opportunitySchema should catch this.
 */
const invalidPreparationContext = {
  ...validPreparationContext,

  opportunity: {
    ...validPreparationContext.opportunity,
    url: "not-a-valid-url",
  },
};

const invalidResult = opportunityPreparationContextSchema.safeParse(
  invalidPreparationContext,
);

if (invalidResult.success) {
  console.error("❌ Invalid preparation context was incorrectly accepted.");

  process.exit(1);
}

console.log("✓ Invalid preparation context was correctly rejected.");

console.log("\n✓ PREPARATION SCHEMA TEST PASSED.");
