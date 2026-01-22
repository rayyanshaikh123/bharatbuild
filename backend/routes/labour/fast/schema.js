const { buildSchema } = require("graphql");

/**
 * Labour GraphQL Schema
 * Optimized for low network coverage with minimal fields and pagination
 */

const labourSchema = buildSchema(`
  type Query {
    # Get assigned jobs
    jobs(page: Int!, limit: Int!): JobPage!
    
    # Get attendance history
    attendance(page: Int!, limit: Int!): AttendancePage!
  }

  type Mutation {
    # Check in to project
    checkIn(
      client_action_id: ID!
      project_id: ID!
      latitude: Float!
      longitude: Float!
      timestamp: String!
    ): CheckInResult!
    
    # Check out from project
    checkOut(
      client_action_id: ID!
      project_id: ID!
      latitude: Float!
      longitude: Float!
      timestamp: String!
    ): CheckOutResult!
  }

  # Paginated job list
  type JobPage {
    data: [Job!]!
    page: Int!
    limit: Int!
    total: Int!
    hasMore: Boolean!
  }

  # Minimal job fields
  type Job {
    id: ID!
    project_id: ID!
    project_name: String!
    status: String!
    assigned_at: String!
  }

  # Paginated attendance list
  type AttendancePage {
    data: [Attendance!]!
    page: Int!
    limit: Int!
    total: Int!
    hasMore: Boolean!
  }

  # Minimal attendance fields
  type Attendance {
    id: ID!
    project_id: ID!
    attendance_date: String!
    check_in_time: String
    check_out_time: String
    work_hours: Float
    status: String!
    source: String!
  }

  # Check-in result
  type CheckInResult {
    success: Boolean!
    attendance_id: ID
    sync_status: String!
    error: String
  }

  # Check-out result
  type CheckOutResult {
    success: Boolean!
    attendance_id: ID
    work_hours: Float
    sync_status: String!
    error: String
  }
`);

module.exports = labourSchema;
