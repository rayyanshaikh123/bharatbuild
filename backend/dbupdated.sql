CREATE SCHEMA "public";
CREATE TABLE "attendance" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
	"project_id" uuid UNIQUE,
	"labour_id" uuid UNIQUE,
	"site_engineer_id" uuid,
	"attendance_date" date NOT NULL UNIQUE,
	"check_in_time" timestamp,
	"check_out_time" timestamp,
	"work_hours" numeric,
	"status" text DEFAULT 'PENDING',
	"approved_by" uuid,
	"approved_at" timestamp,
	"is_manual" boolean DEFAULT false,
	"entry_exit_count" integer DEFAULT 0,
	"max_allowed_exits" integer DEFAULT 3,
	"last_event_at" timestamp,
	CONSTRAINT "attendance_project_id_labour_id_attendance_date_key" UNIQUE("project_id","labour_id","attendance_date"),
	CONSTRAINT "attendance_status_check" CHECK (CHECK ((status = ANY (ARRAY['PENDING'::text, 'APPROVED'::text, 'REJECTED'::text]))))
);
CREATE TABLE "attendance_sessions" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
	"attendance_id" uuid NOT NULL,
	"check_in_time" timestamp NOT NULL,
	"check_out_time" timestamp,
	"worked_minutes" integer,
	"created_at" timestamp DEFAULT now()
);
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
	"entity_type" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"action" text NOT NULL,
	"remarks" text,
	"acted_by_role" text NOT NULL,
	"acted_by_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now()
);
CREATE TABLE "dprs" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
	"project_id" uuid UNIQUE,
	"site_engineer_id" uuid UNIQUE,
	"report_date" date NOT NULL UNIQUE,
	"status" text DEFAULT 'PENDING',
	"submitted_at" timestamp DEFAULT now(),
	"reviewed_by" uuid,
	"reviewed_at" timestamp,
	"remarks" text,
	"report_image" bytea,
	"report_image_mime" text,
	"title" text,
	"description" text,
	"plan_id" uuid,
	"plan_item_id" uuid,
	CONSTRAINT "dprs_project_id_site_engineer_id_report_date_key" UNIQUE("project_id","site_engineer_id","report_date"),
	CONSTRAINT "dprs_status_check" CHECK (CHECK ((status = ANY (ARRAY['PENDING'::text, 'APPROVED'::text, 'REJECTED'::text]))))
);
CREATE TABLE "labour_addresses" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
	"labour_id" uuid,
	"latitude" numeric,
	"longitude" numeric,
	"address_text" text,
	"is_primary" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"tag" varchar(50) DEFAULT 'Other'
);
CREATE TABLE "labour_request_participants" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
	"labour_request_id" uuid UNIQUE,
	"labour_id" uuid UNIQUE,
	"joined_at" timestamp DEFAULT now(),
	"status" varchar(20) DEFAULT 'PENDING',
	CONSTRAINT "labour_request_participants_labour_request_id_labour_id_key" UNIQUE("labour_request_id","labour_id")
);
CREATE TABLE "labour_requests" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
	"project_id" uuid UNIQUE,
	"site_engineer_id" uuid,
	"category" text NOT NULL UNIQUE,
	"required_count" integer NOT NULL,
	"search_radius_meters" integer NOT NULL,
	"request_date" date NOT NULL UNIQUE,
	"status" text DEFAULT 'OPEN',
	"copied_from" uuid,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "labour_requests_project_id_category_request_date_key" UNIQUE("project_id","category","request_date"),
	CONSTRAINT "labour_requests_status_check" CHECK (CHECK ((status = ANY (ARRAY['OPEN'::text, 'LOCKED'::text, 'CLOSED'::text]))))
);
CREATE TABLE "labours" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
	"name" text NOT NULL,
	"phone" text NOT NULL CONSTRAINT "labours_phone_key" UNIQUE,
	"role" text DEFAULT 'LABOUR' NOT NULL,
	"skill_type" text,
	"created_at" timestamp DEFAULT now(),
	"categories" text[] DEFAULT '{}' NOT NULL,
	"primary_latitude" numeric,
	"primary_longitude" numeric,
	"travel_radius_meters" integer,
	CONSTRAINT "labours_skill_type_check" CHECK (CHECK ((skill_type = ANY (ARRAY['SKILLED'::text, 'SEMI_SKILLED'::text, 'UNSKILLED'::text]))))
);
CREATE TABLE "managers" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
	"name" text NOT NULL,
	"email" text NOT NULL CONSTRAINT "managers_email_key" UNIQUE,
	"phone" text NOT NULL CONSTRAINT "managers_phone_key" UNIQUE,
	"password_hash" text NOT NULL,
	"role" text DEFAULT 'MANAGER' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
CREATE TABLE "material_bills" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
	"material_request_id" uuid,
	"project_id" uuid,
	"vendor_name" text NOT NULL,
	"vendor_contact" text,
	"bill_number" text NOT NULL,
	"bill_amount" numeric NOT NULL,
	"gst_percentage" numeric NOT NULL,
	"gst_amount" numeric NOT NULL,
	"total_amount" numeric NOT NULL,
	"category" text NOT NULL,
	"status" text DEFAULT 'PENDING',
	"manager_feedback" text,
	"uploaded_by" uuid,
	"reviewed_by" uuid,
	"reviewed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"bill_image" bytea,
	"bill_image_mime" text,
	CONSTRAINT "material_bills_status_check" CHECK (CHECK ((status = ANY (ARRAY['PENDING'::text, 'APPROVED'::text, 'REJECTED'::text]))))
);
CREATE TABLE "material_requests" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
	"project_id" uuid,
	"site_engineer_id" uuid,
	"dpr_id" uuid,
	"title" text NOT NULL,
	"category" text NOT NULL,
	"quantity" numeric NOT NULL,
	"description" text,
	"status" text DEFAULT 'PENDING',
	"manager_feedback" text,
	"reviewed_by" uuid,
	"reviewed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"request_image" bytea,
	"request_image_mime" text,
	CONSTRAINT "material_requests_status_check" CHECK (CHECK ((status = ANY (ARRAY['PENDING'::text, 'APPROVED'::text, 'REJECTED'::text]))))
);
CREATE TABLE "organization_managers" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
	"org_id" uuid UNIQUE,
	"manager_id" uuid UNIQUE,
	"status" text DEFAULT 'PENDING',
	"approved_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "organization_managers_org_id_manager_id_key" UNIQUE("org_id","manager_id"),
	CONSTRAINT "organization_managers_status_check" CHECK (CHECK ((status = ANY (ARRAY['PENDING'::text, 'APPROVED'::text, 'REJECTED'::text]))))
);
CREATE TABLE "organization_site_engineers" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
	"org_id" uuid UNIQUE,
	"site_engineer_id" uuid UNIQUE,
	"approved_by" uuid,
	"status" text DEFAULT 'PENDING',
	"approved_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "organization_site_engineers_org_id_site_engineer_id_key" UNIQUE("org_id","site_engineer_id"),
	CONSTRAINT "organization_site_engineers_status_check" CHECK (CHECK ((status = ANY (ARRAY['PENDING'::text, 'APPROVED'::text, 'REJECTED'::text]))))
);
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
	"name" text NOT NULL,
	"address" text,
	"office_phone" text,
	"org_type" text,
	"owner_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now()
);
CREATE TABLE "otp_logs" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
	"phone" text NOT NULL,
	"otp_hash" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"verified" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
CREATE TABLE "owners" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
	"name" text NOT NULL,
	"email" text NOT NULL CONSTRAINT "owners_email_key" UNIQUE,
	"phone" text NOT NULL CONSTRAINT "owners_phone_key" UNIQUE,
	"password_hash" text NOT NULL,
	"role" text DEFAULT 'OWNER' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
CREATE TABLE "password_reset_tokens" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
	"user_id" uuid NOT NULL,
	"user_role" text NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "password_reset_tokens_user_role_check" CHECK (CHECK ((user_role = ANY (ARRAY['OWNER'::text, 'MANAGER'::text, 'SITE_ENGINEER'::text, 'LABOUR'::text]))))
);
CREATE TABLE "plan_items" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
	"plan_id" uuid,
	"period_type" text,
	"period_start" date,
	"period_end" date,
	"task_name" text NOT NULL,
	"description" text,
	"planned_quantity" numeric,
	"planned_manpower" integer,
	"planned_cost" numeric,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "plan_items_period_type_check" CHECK (CHECK ((period_type = ANY (ARRAY['WEEK'::text, 'MONTH'::text]))))
);
CREATE TABLE "plans" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
	"project_id" uuid CONSTRAINT "plans_project_id_key" UNIQUE,
	"created_by" uuid,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"created_at" timestamp DEFAULT now()
);
CREATE TABLE "project_managers" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
	"project_id" uuid UNIQUE,
	"manager_id" uuid UNIQUE,
	"assigned_at" timestamp DEFAULT now(),
	"status" text NOT NULL,
	CONSTRAINT "project_managers_project_id_manager_id_key" UNIQUE("project_id","manager_id"),
	CONSTRAINT "project_managers_status_check" CHECK (CHECK ((status = ANY (ARRAY['PENDING'::text, 'ACTIVE'::text, 'REJECTED'::text]))))
);
CREATE TABLE "project_site_engineers" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
	"project_id" uuid UNIQUE,
	"site_engineer_id" uuid UNIQUE,
	"status" text DEFAULT 'PENDING',
	"assigned_at" timestamp DEFAULT now(),
	CONSTRAINT "project_site_engineers_project_id_site_engineer_id_key" UNIQUE("project_id","site_engineer_id"),
	CONSTRAINT "project_site_engineers_status_check" CHECK (CHECK ((status = ANY (ARRAY['PENDING'::text, 'ACTIVE'::text, 'REMOVED'::text, 'REJECTED'::text]))))
);
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
	"org_id" uuid,
	"name" text NOT NULL,
	"location_text" text,
	"latitude" numeric,
	"longitude" numeric,
	"geofence_radius" integer,
	"start_date" date,
	"end_date" date,
	"budget" numeric,
	"status" text,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now(),
	"current_invested" numeric DEFAULT '0',
	CONSTRAINT "projects_status_check" CHECK (CHECK ((status = ANY (ARRAY['PLANNED'::text, 'ACTIVE'::text, 'COMPLETED'::text, 'ON_HOLD'::text]))))
);
CREATE TABLE "session" (
	"sid" varchar PRIMARY KEY,
	"sess" json NOT NULL,
	"expire" timestamp NOT NULL
);
CREATE TABLE "site_engineers" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
	"name" text NOT NULL,
	"email" text NOT NULL CONSTRAINT "site_engineers_email_key" UNIQUE,
	"phone" text NOT NULL CONSTRAINT "site_engineers_phone_key" UNIQUE,
	"password_hash" text NOT NULL,
	"role" text DEFAULT 'SITE_ENGINEER' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
CREATE TABLE "wage_rates" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
	"project_id" uuid NOT NULL UNIQUE,
	"skill_type" text UNIQUE,
	"category" text NOT NULL UNIQUE,
	"hourly_rate" numeric NOT NULL,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "wage_rates_project_id_skill_type_category_key" UNIQUE("project_id","skill_type","category"),
	CONSTRAINT "wage_rates_skill_type_check" CHECK (CHECK ((skill_type = ANY (ARRAY['SKILLED'::text, 'SEMI_SKILLED'::text, 'UNSKILLED'::text]))))
);
CREATE TABLE "wages" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
	"attendance_id" uuid CONSTRAINT "wages_attendance_id_key" UNIQUE,
	"labour_id" uuid,
	"project_id" uuid,
	"wage_type" text DEFAULT 'DAILY',
	"rate" numeric NOT NULL,
	"total_amount" numeric NOT NULL,
	"status" text DEFAULT 'PENDING',
	"approved_by" uuid,
	"approved_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"worked_hours" numeric,
	"is_ready_for_payment" boolean DEFAULT false,
	"paid_at" timestamp,
	CONSTRAINT "wages_status_check" CHECK (CHECK ((status = ANY (ARRAY['PENDING'::text, 'APPROVED'::text, 'REJECTED'::text])))),
	CONSTRAINT "wages_wage_type_check" CHECK (CHECK ((wage_type = ANY (ARRAY['DAILY'::text, 'HOURLY'::text]))))
);
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "site_engineers"("id");
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_labour_id_fkey" FOREIGN KEY ("labour_id") REFERENCES "labours"("id");
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id");
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_site_engineer_id_fkey" FOREIGN KEY ("site_engineer_id") REFERENCES "site_engineers"("id");
ALTER TABLE "attendance_sessions" ADD CONSTRAINT "attendance_sessions_attendance_id_fkey" FOREIGN KEY ("attendance_id") REFERENCES "attendance"("id") ON DELETE CASCADE;
ALTER TABLE "dprs" ADD CONSTRAINT "dprs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE;
ALTER TABLE "dprs" ADD CONSTRAINT "dprs_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "managers"("id");
ALTER TABLE "dprs" ADD CONSTRAINT "dprs_site_engineer_id_fkey" FOREIGN KEY ("site_engineer_id") REFERENCES "site_engineers"("id");
ALTER TABLE "labour_addresses" ADD CONSTRAINT "labour_addresses_labour_id_fkey" FOREIGN KEY ("labour_id") REFERENCES "labours"("id") ON DELETE CASCADE;
ALTER TABLE "labour_request_participants" ADD CONSTRAINT "labour_request_participants_labour_id_fkey" FOREIGN KEY ("labour_id") REFERENCES "labours"("id");
ALTER TABLE "labour_request_participants" ADD CONSTRAINT "labour_request_participants_labour_request_id_fkey" FOREIGN KEY ("labour_request_id") REFERENCES "labour_requests"("id") ON DELETE CASCADE;
ALTER TABLE "labour_requests" ADD CONSTRAINT "labour_requests_copied_from_fkey" FOREIGN KEY ("copied_from") REFERENCES "labour_requests"("id");
ALTER TABLE "labour_requests" ADD CONSTRAINT "labour_requests_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE;
ALTER TABLE "labour_requests" ADD CONSTRAINT "labour_requests_site_engineer_id_fkey" FOREIGN KEY ("site_engineer_id") REFERENCES "site_engineers"("id");
ALTER TABLE "material_bills" ADD CONSTRAINT "material_bills_material_request_id_fkey" FOREIGN KEY ("material_request_id") REFERENCES "material_requests"("id") ON DELETE SET NULL;
ALTER TABLE "material_bills" ADD CONSTRAINT "material_bills_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id");
ALTER TABLE "material_bills" ADD CONSTRAINT "material_bills_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "managers"("id");
ALTER TABLE "material_bills" ADD CONSTRAINT "material_bills_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "site_engineers"("id");
ALTER TABLE "material_requests" ADD CONSTRAINT "material_requests_dpr_id_fkey" FOREIGN KEY ("dpr_id") REFERENCES "dprs"("id") ON DELETE SET NULL;
ALTER TABLE "material_requests" ADD CONSTRAINT "material_requests_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id");
ALTER TABLE "material_requests" ADD CONSTRAINT "material_requests_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "managers"("id");
ALTER TABLE "material_requests" ADD CONSTRAINT "material_requests_site_engineer_id_fkey" FOREIGN KEY ("site_engineer_id") REFERENCES "site_engineers"("id");
ALTER TABLE "organization_managers" ADD CONSTRAINT "organization_managers_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "managers"("id") ON DELETE CASCADE;
ALTER TABLE "organization_managers" ADD CONSTRAINT "organization_managers_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE;
ALTER TABLE "organization_site_engineers" ADD CONSTRAINT "organization_site_engineers_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "managers"("id");
ALTER TABLE "organization_site_engineers" ADD CONSTRAINT "organization_site_engineers_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE;
ALTER TABLE "organization_site_engineers" ADD CONSTRAINT "organization_site_engineers_site_engineer_id_fkey" FOREIGN KEY ("site_engineer_id") REFERENCES "site_engineers"("id") ON DELETE CASCADE;
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "owners"("id") ON DELETE CASCADE;
ALTER TABLE "plan_items" ADD CONSTRAINT "plan_items_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE CASCADE;
ALTER TABLE "plans" ADD CONSTRAINT "plans_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "managers"("id");
ALTER TABLE "plans" ADD CONSTRAINT "plans_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE;
ALTER TABLE "project_managers" ADD CONSTRAINT "project_managers_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "managers"("id");
ALTER TABLE "project_managers" ADD CONSTRAINT "project_managers_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE;
ALTER TABLE "project_site_engineers" ADD CONSTRAINT "project_site_engineers_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE;
ALTER TABLE "project_site_engineers" ADD CONSTRAINT "project_site_engineers_site_engineer_id_fkey" FOREIGN KEY ("site_engineer_id") REFERENCES "site_engineers"("id");
ALTER TABLE "projects" ADD CONSTRAINT "projects_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "managers"("id");
ALTER TABLE "projects" ADD CONSTRAINT "projects_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE;
ALTER TABLE "wage_rates" ADD CONSTRAINT "wage_rates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "managers"("id");
ALTER TABLE "wage_rates" ADD CONSTRAINT "wage_rates_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE;
ALTER TABLE "wages" ADD CONSTRAINT "wages_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "managers"("id");
ALTER TABLE "wages" ADD CONSTRAINT "wages_attendance_id_fkey" FOREIGN KEY ("attendance_id") REFERENCES "attendance"("id") ON DELETE CASCADE;
ALTER TABLE "wages" ADD CONSTRAINT "wages_labour_id_fkey" FOREIGN KEY ("labour_id") REFERENCES "labours"("id");
ALTER TABLE "wages" ADD CONSTRAINT "wages_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id");
CREATE UNIQUE INDEX "attendance_pkey" ON "attendance" ("id");
CREATE UNIQUE INDEX "attendance_project_id_labour_id_attendance_date_key" ON "attendance" ("project_id","labour_id","attendance_date");
CREATE INDEX "idx_attendance_status" ON "attendance" ("status");
CREATE UNIQUE INDEX "attendance_sessions_pkey" ON "attendance_sessions" ("id");
CREATE INDEX "idx_attendance_sessions_attendance" ON "attendance_sessions" ("attendance_id");
CREATE UNIQUE INDEX "audit_logs_pkey" ON "audit_logs" ("id");
CREATE INDEX "idx_audit_actor" ON "audit_logs" ("acted_by_role","acted_by_id");
CREATE INDEX "idx_audit_entity" ON "audit_logs" ("entity_type","entity_id");
CREATE INDEX "idx_audit_time" ON "audit_logs" ("created_at");
CREATE UNIQUE INDEX "dprs_pkey" ON "dprs" ("id");
CREATE UNIQUE INDEX "dprs_project_id_site_engineer_id_report_date_key" ON "dprs" ("project_id","site_engineer_id","report_date");
CREATE UNIQUE INDEX "labour_addresses_pkey" ON "labour_addresses" ("id");
CREATE UNIQUE INDEX "labour_request_participants_labour_request_id_labour_id_key" ON "labour_request_participants" ("labour_request_id","labour_id");
CREATE UNIQUE INDEX "labour_request_participants_pkey" ON "labour_request_participants" ("id");
CREATE INDEX "idx_labour_requests_date" ON "labour_requests" ("request_date");
CREATE INDEX "idx_labour_requests_status" ON "labour_requests" ("status");
CREATE UNIQUE INDEX "labour_requests_pkey" ON "labour_requests" ("id");
CREATE UNIQUE INDEX "labour_requests_project_id_category_request_date_key" ON "labour_requests" ("project_id","category","request_date");
CREATE INDEX "idx_labour_phone" ON "labours" ("phone");
CREATE INDEX "idx_labours_categories" ON "labours" USING gin ("categories");
CREATE UNIQUE INDEX "labours_phone_key" ON "labours" ("phone");
CREATE UNIQUE INDEX "labours_pkey" ON "labours" ("id");
CREATE INDEX "idx_manager_email" ON "managers" ("email");
CREATE UNIQUE INDEX "managers_email_key" ON "managers" ("email");
CREATE UNIQUE INDEX "managers_phone_key" ON "managers" ("phone");
CREATE UNIQUE INDEX "managers_pkey" ON "managers" ("id");
CREATE INDEX "idx_material_bill_status" ON "material_bills" ("status");
CREATE UNIQUE INDEX "material_bills_pkey" ON "material_bills" ("id");
CREATE INDEX "idx_material_req_status" ON "material_requests" ("status");
CREATE UNIQUE INDEX "material_requests_pkey" ON "material_requests" ("id");
CREATE UNIQUE INDEX "organization_managers_org_id_manager_id_key" ON "organization_managers" ("org_id","manager_id");
CREATE UNIQUE INDEX "organization_managers_pkey" ON "organization_managers" ("id");
CREATE UNIQUE INDEX "organization_site_engineers_org_id_site_engineer_id_key" ON "organization_site_engineers" ("org_id","site_engineer_id");
CREATE UNIQUE INDEX "organization_site_engineers_pkey" ON "organization_site_engineers" ("id");
CREATE UNIQUE INDEX "organizations_pkey" ON "organizations" ("id");
CREATE INDEX "idx_otp_expiry" ON "otp_logs" ("expires_at");
CREATE INDEX "idx_otp_phone" ON "otp_logs" ("phone");
CREATE UNIQUE INDEX "otp_logs_pkey" ON "otp_logs" ("id");
CREATE INDEX "idx_owner_email" ON "owners" ("email");
CREATE UNIQUE INDEX "owners_email_key" ON "owners" ("email");
CREATE UNIQUE INDEX "owners_phone_key" ON "owners" ("phone");
CREATE UNIQUE INDEX "owners_pkey" ON "owners" ("id");
CREATE UNIQUE INDEX "password_reset_tokens_pkey" ON "password_reset_tokens" ("id");
CREATE UNIQUE INDEX "plan_items_pkey" ON "plan_items" ("id");
CREATE UNIQUE INDEX "plans_pkey" ON "plans" ("id");
CREATE UNIQUE INDEX "plans_project_id_key" ON "plans" ("project_id");
CREATE UNIQUE INDEX "project_managers_pkey" ON "project_managers" ("id");
CREATE UNIQUE INDEX "project_managers_project_id_manager_id_key" ON "project_managers" ("project_id","manager_id");
CREATE UNIQUE INDEX "project_site_engineers_pkey" ON "project_site_engineers" ("id");
CREATE UNIQUE INDEX "project_site_engineers_project_id_site_engineer_id_key" ON "project_site_engineers" ("project_id","site_engineer_id");
CREATE INDEX "idx_projects_org" ON "projects" ("org_id");
CREATE INDEX "idx_projects_status" ON "projects" ("status");
CREATE UNIQUE INDEX "projects_pkey" ON "projects" ("id");
CREATE UNIQUE INDEX "session_pkey" ON "session" ("sid");
CREATE INDEX "idx_site_engineer_email" ON "site_engineers" ("email");
CREATE UNIQUE INDEX "site_engineers_email_key" ON "site_engineers" ("email");
CREATE UNIQUE INDEX "site_engineers_phone_key" ON "site_engineers" ("phone");
CREATE UNIQUE INDEX "site_engineers_pkey" ON "site_engineers" ("id");
CREATE UNIQUE INDEX "wage_rates_pkey" ON "wage_rates" ("id");
CREATE UNIQUE INDEX "wage_rates_project_id_skill_type_category_key" ON "wage_rates" ("project_id","skill_type","category");
CREATE INDEX "idx_wages_status" ON "wages" ("status");
CREATE UNIQUE INDEX "wages_attendance_id_key" ON "wages" ("attendance_id");
CREATE UNIQUE INDEX "wages_pkey" ON "wages" ("id");