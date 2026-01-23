const express = require("express");
const { graphqlHTTP } = require("express-graphql");
const compression = require("compression");
const router = express.Router();
const labourCheck = require("../../../middleware/labourCheck");
const labourSchema = require("./schema");
const labourResolvers = require("./resolvers");

/**
 * Labour GraphQL Fast Layer
 * Optimized for low network coverage with HTTP/2 and Brotli compression
 */

// Apply labour authentication middleware BEFORE GraphQL
router.use(labourCheck);

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
    schema: labourSchema,
    rootValue: labourResolvers,
    context: {
      user: req.user, // Populated by labourCheck middleware
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
