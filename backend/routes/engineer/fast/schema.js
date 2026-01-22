const { buildSchema } = require("graphql");

/**
 * Engineer GraphQL Schema
 * Optimized for low network coverage with minimal fields and pagination
 */

const engineerSchema = buildSchema(`
  type Query {
    # Get material requests
    materialRequests(
      project_id: ID!
      page: Int!
      limit: Int!
    ): MaterialRequestPage!
    
    # Get attendance records
    attendance(
      project_id: ID!
      page: Int!
      limit: Int!
    ): AttendancePage!
    
    # Get wages
    wages(
      project_id: ID!
      page: Int!
      limit: Int!
    ): WagePage!
  }

  type Mutation {
    # Create material request
    createMaterialRequest(
      client_action_id: ID!
      project_id: ID!
      title: String!
      category: String!
      quantity: Int!
      description: String
    ): MaterialRequestResult!
    
    # Update material request
    updateMaterialRequest(
      client_action_id: ID!
      request_id: ID!
      title: String
      quantity: Int
      description: String
    ): MaterialRequestResult!
    
    # Delete material request
    deleteMaterialRequest(
      client_action_id: ID!
      request_id: ID!
    ): DeleteResult!
    
    # Create manual attendance
    createManualAttendance(
      client_action_id: ID!
      project_id: ID!
      labour_id: ID!
      attendance_date: String!
      work_hours: Float!
    ): AttendanceResult!
  }

  # Paginated material request list
  type MaterialRequestPage {
    data: [MaterialRequest!]!
    page: Int!
    limit: Int!
    total: Int!
    hasMore: Boolean!
  }

  # Minimal material request fields
  type MaterialRequest {
    id: ID!
    project_id: ID!
    title: String!
    category: String!
    quantity: Int!
    status: String!
    created_at: String!
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
    labour_id: ID!
    attendance_date: String!
    work_hours: Float
    status: String!
    source: String!
  }

  # Paginated wage list
  type WagePage {
    data: [Wage!]!
    page: Int!
    limit: Int!
    total: Int!
    hasMore: Boolean!
  }

  # Minimal wage fields
  type Wage {
    id: ID!
    project_id: ID!
    labour_id: ID!
    total_amount: Float!
    status: String!
    created_at: String!
  }

  # Material request result
  type MaterialRequestResult {
    success: Boolean!
    request_id: ID
    sync_status: String!
    error: String
  }

  # Delete result
  type DeleteResult {
    success: Boolean!
    sync_status: String!
    error: String
  }

  # Attendance result
  type AttendanceResult {
    success: Boolean!
    attendance_id: ID
    sync_status: String!
    error: String
  }
`);

module.exports = engineerSchema;
