const express = require("express");
const { graphqlHTTP } = require("express-graphql");
const compression = require("compression");
const router = express.Router();
const engineerCheck = require("../../../middleware/engineerCheck");
const engineerSchema = require("./schema");
const engineerResolvers = require("./resolvers");

/**
 * Engineer GraphQL Fast Layer
 * Optimized for low network coverage with HTTP/2 and Brotli compression
 */

// Apply engineer authentication middleware BEFORE GraphQL
router.use(engineerCheck);

// Enable Brotli compression for GraphQL responses
router.use(
  compression({
    filter: (req, res) => {
      // Always compress GraphQL responses
      return true;
    },
    threshold: 0, // Compress all responses
    level: 6, // Brotli compression level (0-11, 6 is balanced)
    brotli: {
      enabled: true,
      zlib: {},
    },
  }),
);

// GraphQL endpoint
router.use(
  "/graphql",
  graphqlHTTP((req) => ({
    schema: engineerSchema,
    rootValue: engineerResolvers,
    context: {
      user: req.user, // Populated by engineerCheck middleware
    },
    graphiql: process.env.NODE_ENV !== "production", // Enable GraphiQL in development only
    customFormatErrorFn: (error) => ({
      message: error.message,
      locations: error.locations,
      path: error.path,
    }),
  })),
);

module.exports = router;
