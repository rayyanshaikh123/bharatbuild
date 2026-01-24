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
	"source" text DEFAULT 'ONLINE',
	"geofence_breach_count" integer DEFAULT 0,
	"last_known_lat" numeric,
	"last_known_lng" numeric,
	"is_currently_breached" boolean DEFAULT false,
	"check_in_face_image" bytea,
	"check_in_face_features" jsonb,
	"check_out_face_image" bytea,
	"check_out_face_features" jsonb,
	"face_verification_status" text DEFAULT 'PENDING',
	"face_verification_confidence" numeric,
	"manual_labour_id" uuid,
	CONSTRAINT "attendance_project_id_labour_id_attendance_date_key" UNIQUE("project_id","labour_id","attendance_date"),
	CONSTRAINT "attendance_face_verification_status_check" CHECK (CHECK ((face_verification_status = ANY (ARRAY['PENDING'::text, 'VERIFIED'::text, 'FAILED'::text])))),
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
	"created_at" timestamp DEFAULT now(),
	"organization_id" uuid,
	"project_id" uuid,
	"category" text,
	"change_summary" jsonb
);
CREATE TABLE "dangerous_task_otps" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
	"task_request_id" uuid NOT NULL,
	"otp_hash" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"verified" boolean DEFAULT false,
	"verified_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
CREATE TABLE "dangerous_task_requests" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
	"dangerous_task_id" uuid NOT NULL,
	"labour_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"status" text DEFAULT 'REQUESTED',
	"requested_at" timestamp DEFAULT now(),
	"approved_at" timestamp,
	"approved_by" uuid,
	"approval_method" text DEFAULT 'OTP',
	CONSTRAINT "dtr_status_check" CHECK (CHECK ((status = ANY (ARRAY['REQUESTED'::text, 'APPROVED'::text, 'REJECTED'::text, 'EXPIRED'::text]))))
);
CREATE TABLE "dangerous_tasks" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
	"project_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true,
	"created_by" uuid NOT NULL,
	"created_by_role" text DEFAULT 'SITE_ENGINEER',
	"created_at" timestamp DEFAULT now()
);
CREATE TABLE "dpr_items" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
	"dpr_id" uuid NOT NULL,
	"plan_item_id" uuid NOT NULL,
	"quantity_done" numeric DEFAULT '0' NOT NULL,
	"remarks" text,
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
CREATE TABLE "goods_receipt_notes" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
	"project_id" uuid NOT NULL,
	"purchase_order_id" uuid NOT NULL,
	"material_request_id" uuid NOT NULL,
	"received_items" jsonb NOT NULL,
	"received_at" timestamp DEFAULT now(),
	"received_by" uuid NOT NULL,
	"bill_image" bytea,
	"bill_image_mime" text,
	"delivery_proof_image" bytea,
	"delivery_proof_image_mime" text,
	"status" text DEFAULT 'PENDING',
	"manager_feedback" text,
	"reviewed_by" uuid,
	"reviewed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "grn_status_check" CHECK (CHECK ((status = ANY (ARRAY['PENDING'::text, 'APPROVED'::text, 'REJECTED'::text]))))
);
CREATE TABLE "grns" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
	"project_id" uuid NOT NULL,
	"purchase_order_id" uuid NOT NULL,
	"material_request_id" uuid NOT NULL,
	"site_engineer_id" uuid NOT NULL,
	"received_items" jsonb NOT NULL,
	"received_at" timestamp DEFAULT now() NOT NULL,
	"remarks" text,
	"status" text DEFAULT 'CREATED',
	"verified_by" uuid,
	"verified_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"bill_image" bytea,
	"bill_image_mime" text,
	"proof_image" bytea,
	"proof_image_mime" text,
	CONSTRAINT "grn_status_check" CHECK (CHECK ((status = ANY (ARRAY['CREATED'::text, 'VERIFIED'::text]))))
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
CREATE TABLE "manual_attendance_labours" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
	"project_id" uuid NOT NULL UNIQUE,
	"name" text NOT NULL UNIQUE,
	"skill" text NOT NULL UNIQUE,
	"created_at" timestamp DEFAULT now(),
	"created_by" uuid,
	CONSTRAINT "manual_attendance_labours_project_id_name_skill_key" UNIQUE("project_id","name","skill")
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
	"grn_id" uuid,
	CONSTRAINT "material_bills_status_check" CHECK (CHECK ((status = ANY (ARRAY['PENDING'::text, 'APPROVED'::text, 'REJECTED'::text]))))
);
CREATE TABLE "material_ledger" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
	"project_id" uuid NOT NULL,
	"dpr_id" uuid,
	"material_request_id" uuid,
	"material_name" text NOT NULL,
	"category" text,
	"quantity" numeric NOT NULL,
	"unit" text NOT NULL,
	"movement_type" text NOT NULL,
	"source" text NOT NULL,
	"remarks" text,
	"recorded_by" uuid,
	"recorded_by_role" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "material_ledger_movement_type_check" CHECK (CHECK ((movement_type = ANY (ARRAY['IN'::text, 'OUT'::text, 'ADJUSTMENT'::text])))),
	CONSTRAINT "material_ledger_recorded_by_role_check" CHECK (CHECK ((recorded_by_role = ANY (ARRAY['SITE_ENGINEER'::text, 'MANAGER'::text])))),
	CONSTRAINT "material_ledger_source_check" CHECK (CHECK ((source = ANY (ARRAY['AI_DPR'::text, 'MANUAL'::text, 'BILL'::text, 'ADJUSTMENT'::text]))))
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
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
	"user_id" uuid NOT NULL,
	"user_role" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"type" text DEFAULT 'INFO',
	"is_read" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"project_id" uuid,
	"metadata" jsonb
);
CREATE TABLE "organization_blacklist" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
	"org_id" uuid NOT NULL UNIQUE,
	"labour_id" uuid NOT NULL UNIQUE,
	"reason" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "organization_blacklist_org_id_labour_id_key" UNIQUE("org_id","labour_id")
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
CREATE TABLE "organization_purchase_managers" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
	"org_id" uuid NOT NULL UNIQUE,
	"purchase_manager_id" uuid NOT NULL UNIQUE,
	"status" text DEFAULT 'PENDING',
	"approved_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "opm_unique" UNIQUE("org_id","purchase_manager_id"),
	CONSTRAINT "opm_status_check" CHECK (CHECK ((status = ANY (ARRAY['PENDING'::text, 'APPROVED'::text, 'REJECTED'::text]))))
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
	"created_at" timestamp DEFAULT now(),
	"latitude" numeric,
	"longitude" numeric,
	"geofence" jsonb
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
	CONSTRAINT "password_reset_tokens_user_role_check" CHECK (CHECK ((user_role = ANY (ARRAY['OWNER'::text, 'MANAGER'::text, 'SITE_ENGINEER'::text, 'LABOUR'::text, 'PURCHASE_MANAGER'::text]))))
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
	"status" text DEFAULT 'PENDING',
	"completed_at" date,
	"updated_by" uuid,
	"updated_by_role" text,
	"delay_info" jsonb,
	"priority" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "plan_items_period_type_check" CHECK (CHECK ((period_type = ANY (ARRAY['WEEK'::text, 'MONTH'::text])))),
	CONSTRAINT "plan_items_priority_check" CHECK (CHECK (((priority >= 0) AND (priority <= 5)))),
	CONSTRAINT "plan_items_status_check" CHECK (CHECK ((status = ANY (ARRAY['PENDING'::text, 'IN_PROGRESS'::text, 'COMPLETED'::text, 'BLOCKED'::text])))),
	CONSTRAINT "plan_items_updated_by_role_check" CHECK (CHECK ((updated_by_role = ANY (ARRAY['MANAGER'::text, 'SITE_ENGINEER'::text]))))
);
CREATE TABLE "plans" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
	"project_id" uuid CONSTRAINT "plans_project_id_key" UNIQUE,
	"created_by" uuid,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"created_at" timestamp DEFAULT now()
);
CREATE TABLE "project_breaks" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
	"project_id" uuid NOT NULL,
	"started_at" timestamp NOT NULL,
	"ended_at" timestamp NOT NULL,
	"created_by" uuid NOT NULL,
	"created_by_role" text DEFAULT 'SITE_ENGINEER',
	"reason" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "project_breaks_duration_check" CHECK (CHECK ((ended_at > started_at))),
	CONSTRAINT "project_breaks_max_duration_check" CHECK (CHECK ((ended_at <= (started_at + '02:00:00'::interval))))
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
CREATE TABLE "project_purchase_managers" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
	"project_id" uuid NOT NULL UNIQUE,
	"purchase_manager_id" uuid NOT NULL UNIQUE,
	"status" text DEFAULT 'PENDING',
	"assigned_at" timestamp DEFAULT now(),
	CONSTRAINT "ppm_unique" UNIQUE("project_id","purchase_manager_id"),
	CONSTRAINT "ppm_status_check" CHECK (CHECK ((status = ANY (ARRAY['PENDING'::text, 'APPROVED'::text, 'REJECTED'::text]))))
);
CREATE TABLE "project_site_engineers" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
	"project_id" uuid UNIQUE,
	"site_engineer_id" uuid UNIQUE,
	"status" text DEFAULT 'PENDING',
	"assigned_at" timestamp DEFAULT now(),
	CONSTRAINT "project_site_engineers_project_id_site_engineer_id_key" UNIQUE("project_id","site_engineer_id"),
	CONSTRAINT "project_site_engineers_status_check" CHECK (CHECK ((status = ANY (ARRAY['PENDING'::text, 'APPROVED'::text, 'REJECTED'::text]))))
);
CREATE TABLE "project_tools" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
	"project_id" uuid NOT NULL,
	"name" text NOT NULL,
	"tool_code" text NOT NULL CONSTRAINT "project_tools_tool_code_key" UNIQUE,
	"description" text,
	"status" text DEFAULT 'AVAILABLE',
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "project_tools_status_check" CHECK (CHECK ((status = ANY (ARRAY['AVAILABLE'::text, 'ISSUED'::text, 'DAMAGED'::text, 'LOST'::text]))))
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
	"geofence" jsonb,
	"check_in_time" time DEFAULT '06:00:00' NOT NULL,
	"check_out_time" time DEFAULT '18:00:00' NOT NULL,
	CONSTRAINT "projects_status_check" CHECK (CHECK ((status = ANY (ARRAY['PLANNED'::text, 'ACTIVE'::text, 'COMPLETED'::text, 'ON_HOLD'::text]))))
);
CREATE TABLE "purchase_managers" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
	"name" text NOT NULL,
	"email" text NOT NULL CONSTRAINT "purchase_managers_email_key" UNIQUE,
	"phone" text NOT NULL CONSTRAINT "purchase_managers_phone_key" UNIQUE,
	"password_hash" text NOT NULL,
	"role" text DEFAULT 'PURCHASE_MANAGER' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
CREATE TABLE "purchase_orders" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
	"material_request_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"po_number" text NOT NULL CONSTRAINT "purchase_orders_po_number_key" UNIQUE,
	"vendor_name" text NOT NULL,
	"vendor_contact" text,
	"items" jsonb NOT NULL,
	"total_amount" numeric NOT NULL,
	"status" text DEFAULT 'DRAFT',
	"po_pdf_url" text,
	"created_by" uuid NOT NULL,
	"created_by_role" text DEFAULT 'PURCHASE_MANAGER',
	"created_at" timestamp DEFAULT now(),
	"sent_at" timestamp,
	"po_pdf" bytea,
	"po_pdf_mime" text,
	"grn_created" boolean DEFAULT false,
	CONSTRAINT "purchase_orders_status_check" CHECK (CHECK ((status = ANY (ARRAY['DRAFT'::text, 'SENT'::text, 'ACKNOWLEDGED'::text]))))
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
	"updated_at" timestamp DEFAULT now(),
	"push_notifications_enabled" boolean DEFAULT true,
	"email_notifications_enabled" boolean DEFAULT false
);
CREATE TABLE "sync_action_log" (
	"id" uuid PRIMARY KEY,
	"user_id" uuid NOT NULL,
	"user_role" text NOT NULL,
	"action_type" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid,
	"project_id" uuid,
	"organization_id" uuid,
	"payload" jsonb NOT NULL,
	"status" text DEFAULT 'APPLIED' NOT NULL,
	"error_message" text,
	"created_at" timestamp DEFAULT now()
);
CREATE TABLE "sync_errors" (
	"id" uuid PRIMARY KEY,
	"sync_action_id" uuid,
	"user_id" uuid,
	"reason" text,
	"payload" jsonb,
	"created_at" timestamp DEFAULT now()
);
CREATE TABLE "tool_qr_codes" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
	"tool_id" uuid NOT NULL UNIQUE,
	"project_id" uuid NOT NULL,
	"qr_token" text NOT NULL CONSTRAINT "tool_qr_codes_qr_token_key" UNIQUE,
	"valid_date" date NOT NULL UNIQUE,
	"generated_by" uuid NOT NULL,
	"generated_at" timestamp DEFAULT now(),
	"is_active" boolean DEFAULT true,
	CONSTRAINT "tool_qr_unique_day" UNIQUE("tool_id","valid_date")
);
CREATE TABLE "tool_transactions" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
	"tool_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"labour_id" uuid NOT NULL,
	"issued_at" timestamp NOT NULL,
	"returned_at" timestamp,
	"issued_by" uuid NOT NULL,
	"returned_by" uuid,
	"status" text DEFAULT 'ISSUED',
	"remarks" text,
	CONSTRAINT "tool_transactions_status_check" CHECK (CHECK ((status = ANY (ARRAY['ISSUED'::text, 'RETURNED'::text]))))
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
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_manual_labour_id_fkey" FOREIGN KEY ("manual_labour_id") REFERENCES "manual_attendance_labours"("id") ON DELETE SET NULL;
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id");
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_site_engineer_id_fkey" FOREIGN KEY ("site_engineer_id") REFERENCES "site_engineers"("id");
ALTER TABLE "attendance_sessions" ADD CONSTRAINT "attendance_sessions_attendance_id_fkey" FOREIGN KEY ("attendance_id") REFERENCES "attendance"("id") ON DELETE CASCADE;
ALTER TABLE "dangerous_task_otps" ADD CONSTRAINT "dto_request_fkey" FOREIGN KEY ("task_request_id") REFERENCES "dangerous_task_requests"("id") ON DELETE CASCADE;
ALTER TABLE "dangerous_task_requests" ADD CONSTRAINT "dtr_labour_fkey" FOREIGN KEY ("labour_id") REFERENCES "labours"("id") ON DELETE CASCADE;
ALTER TABLE "dangerous_task_requests" ADD CONSTRAINT "dtr_project_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE;
ALTER TABLE "dangerous_task_requests" ADD CONSTRAINT "dtr_task_fkey" FOREIGN KEY ("dangerous_task_id") REFERENCES "dangerous_tasks"("id") ON DELETE CASCADE;
ALTER TABLE "dangerous_tasks" ADD CONSTRAINT "dt_project_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE;
ALTER TABLE "dpr_items" ADD CONSTRAINT "dpr_items_dpr_id_fkey" FOREIGN KEY ("dpr_id") REFERENCES "dprs"("id") ON DELETE CASCADE;
ALTER TABLE "dpr_items" ADD CONSTRAINT "dpr_items_plan_item_id_fkey" FOREIGN KEY ("plan_item_id") REFERENCES "plan_items"("id");
ALTER TABLE "dprs" ADD CONSTRAINT "dprs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE;
ALTER TABLE "dprs" ADD CONSTRAINT "dprs_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "managers"("id");
ALTER TABLE "dprs" ADD CONSTRAINT "dprs_site_engineer_id_fkey" FOREIGN KEY ("site_engineer_id") REFERENCES "site_engineers"("id");
ALTER TABLE "goods_receipt_notes" ADD CONSTRAINT "grn_material_request_fkey" FOREIGN KEY ("material_request_id") REFERENCES "material_requests"("id") ON DELETE RESTRICT;
ALTER TABLE "goods_receipt_notes" ADD CONSTRAINT "grn_po_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE RESTRICT;
ALTER TABLE "goods_receipt_notes" ADD CONSTRAINT "grn_project_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE;
ALTER TABLE "goods_receipt_notes" ADD CONSTRAINT "grn_received_by_fkey" FOREIGN KEY ("received_by") REFERENCES "site_engineers"("id");
ALTER TABLE "goods_receipt_notes" ADD CONSTRAINT "grn_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "managers"("id");
ALTER TABLE "grns" ADD CONSTRAINT "grn_material_request_fkey" FOREIGN KEY ("material_request_id") REFERENCES "material_requests"("id") ON DELETE RESTRICT;
ALTER TABLE "grns" ADD CONSTRAINT "grn_po_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE RESTRICT;
ALTER TABLE "grns" ADD CONSTRAINT "grn_project_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE;
ALTER TABLE "grns" ADD CONSTRAINT "grn_site_engineer_fkey" FOREIGN KEY ("site_engineer_id") REFERENCES "site_engineers"("id") ON DELETE CASCADE;
ALTER TABLE "grns" ADD CONSTRAINT "grn_verified_by_fkey" FOREIGN KEY ("verified_by") REFERENCES "managers"("id");
ALTER TABLE "labour_addresses" ADD CONSTRAINT "labour_addresses_labour_id_fkey" FOREIGN KEY ("labour_id") REFERENCES "labours"("id") ON DELETE CASCADE;
ALTER TABLE "labour_request_participants" ADD CONSTRAINT "labour_request_participants_labour_id_fkey" FOREIGN KEY ("labour_id") REFERENCES "labours"("id");
ALTER TABLE "labour_request_participants" ADD CONSTRAINT "labour_request_participants_labour_request_id_fkey" FOREIGN KEY ("labour_request_id") REFERENCES "labour_requests"("id") ON DELETE CASCADE;
ALTER TABLE "labour_requests" ADD CONSTRAINT "labour_requests_copied_from_fkey" FOREIGN KEY ("copied_from") REFERENCES "labour_requests"("id");
ALTER TABLE "labour_requests" ADD CONSTRAINT "labour_requests_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE;
ALTER TABLE "labour_requests" ADD CONSTRAINT "labour_requests_site_engineer_id_fkey" FOREIGN KEY ("site_engineer_id") REFERENCES "site_engineers"("id");
ALTER TABLE "manual_attendance_labours" ADD CONSTRAINT "manual_attendance_labours_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "site_engineers"("id");
ALTER TABLE "manual_attendance_labours" ADD CONSTRAINT "manual_attendance_labours_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE;
ALTER TABLE "material_bills" ADD CONSTRAINT "material_bills_grn_fkey" FOREIGN KEY ("grn_id") REFERENCES "goods_receipt_notes"("id") ON DELETE SET NULL;
ALTER TABLE "material_bills" ADD CONSTRAINT "material_bills_material_request_id_fkey" FOREIGN KEY ("material_request_id") REFERENCES "material_requests"("id") ON DELETE SET NULL;
ALTER TABLE "material_bills" ADD CONSTRAINT "material_bills_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id");
ALTER TABLE "material_bills" ADD CONSTRAINT "material_bills_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "managers"("id");
ALTER TABLE "material_bills" ADD CONSTRAINT "material_bills_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "site_engineers"("id");
ALTER TABLE "material_ledger" ADD CONSTRAINT "material_ledger_dpr_id_fkey" FOREIGN KEY ("dpr_id") REFERENCES "dprs"("id") ON DELETE SET NULL;
ALTER TABLE "material_ledger" ADD CONSTRAINT "material_ledger_material_request_id_fkey" FOREIGN KEY ("material_request_id") REFERENCES "material_requests"("id") ON DELETE SET NULL;
ALTER TABLE "material_ledger" ADD CONSTRAINT "material_ledger_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE;
ALTER TABLE "material_requests" ADD CONSTRAINT "material_requests_dpr_id_fkey" FOREIGN KEY ("dpr_id") REFERENCES "dprs"("id") ON DELETE SET NULL;
ALTER TABLE "material_requests" ADD CONSTRAINT "material_requests_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id");
ALTER TABLE "material_requests" ADD CONSTRAINT "material_requests_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "managers"("id");
ALTER TABLE "material_requests" ADD CONSTRAINT "material_requests_site_engineer_id_fkey" FOREIGN KEY ("site_engineer_id") REFERENCES "site_engineers"("id");
ALTER TABLE "organization_blacklist" ADD CONSTRAINT "organization_blacklist_labour_id_fkey" FOREIGN KEY ("labour_id") REFERENCES "labours"("id") ON DELETE CASCADE;
ALTER TABLE "organization_blacklist" ADD CONSTRAINT "organization_blacklist_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE;
ALTER TABLE "organization_managers" ADD CONSTRAINT "organization_managers_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "managers"("id") ON DELETE CASCADE;
ALTER TABLE "organization_managers" ADD CONSTRAINT "organization_managers_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE;
ALTER TABLE "organization_purchase_managers" ADD CONSTRAINT "opm_org_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE;
ALTER TABLE "organization_purchase_managers" ADD CONSTRAINT "opm_pm_fkey" FOREIGN KEY ("purchase_manager_id") REFERENCES "purchase_managers"("id") ON DELETE CASCADE;
ALTER TABLE "organization_site_engineers" ADD CONSTRAINT "organization_site_engineers_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "managers"("id");
ALTER TABLE "organization_site_engineers" ADD CONSTRAINT "organization_site_engineers_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE;
ALTER TABLE "organization_site_engineers" ADD CONSTRAINT "organization_site_engineers_site_engineer_id_fkey" FOREIGN KEY ("site_engineer_id") REFERENCES "site_engineers"("id") ON DELETE CASCADE;
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "owners"("id") ON DELETE CASCADE;
ALTER TABLE "plan_items" ADD CONSTRAINT "plan_items_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE CASCADE;
ALTER TABLE "plans" ADD CONSTRAINT "plans_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "managers"("id");
ALTER TABLE "plans" ADD CONSTRAINT "plans_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE;
ALTER TABLE "project_managers" ADD CONSTRAINT "project_managers_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "managers"("id");
ALTER TABLE "project_managers" ADD CONSTRAINT "project_managers_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE;
ALTER TABLE "project_purchase_managers" ADD CONSTRAINT "ppm_pm_fkey" FOREIGN KEY ("purchase_manager_id") REFERENCES "purchase_managers"("id") ON DELETE CASCADE;
ALTER TABLE "project_purchase_managers" ADD CONSTRAINT "ppm_project_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE;
ALTER TABLE "project_site_engineers" ADD CONSTRAINT "project_site_engineers_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE;
ALTER TABLE "project_site_engineers" ADD CONSTRAINT "project_site_engineers_site_engineer_id_fkey" FOREIGN KEY ("site_engineer_id") REFERENCES "site_engineers"("id");
ALTER TABLE "projects" ADD CONSTRAINT "projects_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "managers"("id");
ALTER TABLE "projects" ADD CONSTRAINT "projects_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE;
ALTER TABLE "purchase_orders" ADD CONSTRAINT "po_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "purchase_managers"("id") ON DELETE CASCADE;
ALTER TABLE "purchase_orders" ADD CONSTRAINT "po_material_request_fkey" FOREIGN KEY ("material_request_id") REFERENCES "material_requests"("id") ON DELETE RESTRICT;
ALTER TABLE "purchase_orders" ADD CONSTRAINT "po_project_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE;
ALTER TABLE "wage_rates" ADD CONSTRAINT "wage_rates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "managers"("id");
ALTER TABLE "wage_rates" ADD CONSTRAINT "wage_rates_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE;
ALTER TABLE "wages" ADD CONSTRAINT "wages_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "managers"("id");
ALTER TABLE "wages" ADD CONSTRAINT "wages_attendance_id_fkey" FOREIGN KEY ("attendance_id") REFERENCES "attendance"("id") ON DELETE CASCADE;
ALTER TABLE "wages" ADD CONSTRAINT "wages_labour_id_fkey" FOREIGN KEY ("labour_id") REFERENCES "labours"("id");
ALTER TABLE "wages" ADD CONSTRAINT "wages_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id");
CREATE UNIQUE INDEX "attendance_pkey" ON "attendance" ("id");
CREATE UNIQUE INDEX "attendance_project_id_labour_id_attendance_date_key" ON "attendance" ("project_id","labour_id","attendance_date");
CREATE INDEX "idx_attendance_face_verification_status" ON "attendance" ("face_verification_status");
CREATE INDEX "idx_attendance_manual_labour" ON "attendance" ("manual_labour_id");
CREATE INDEX "idx_attendance_status" ON "attendance" ("status");
CREATE UNIQUE INDEX "attendance_sessions_pkey" ON "attendance_sessions" ("id");
CREATE INDEX "idx_attendance_sessions_attendance" ON "attendance_sessions" ("attendance_id");
CREATE UNIQUE INDEX "audit_logs_pkey" ON "audit_logs" ("id");
CREATE INDEX "idx_audit_actor" ON "audit_logs" ("acted_by_role","acted_by_id");
CREATE INDEX "idx_audit_entity" ON "audit_logs" ("entity_type","entity_id");
CREATE INDEX "idx_audit_time" ON "audit_logs" ("created_at");
CREATE UNIQUE INDEX "dangerous_task_otps_pkey" ON "dangerous_task_otps" ("id");
CREATE UNIQUE INDEX "dangerous_task_requests_pkey" ON "dangerous_task_requests" ("id");
CREATE UNIQUE INDEX "dangerous_tasks_pkey" ON "dangerous_tasks" ("id");
CREATE UNIQUE INDEX "dpr_items_pkey" ON "dpr_items" ("id");
CREATE INDEX "idx_dpr_items_dpr" ON "dpr_items" ("dpr_id");
CREATE INDEX "idx_dpr_items_plan_item" ON "dpr_items" ("plan_item_id");
CREATE UNIQUE INDEX "dprs_pkey" ON "dprs" ("id");
CREATE UNIQUE INDEX "dprs_project_id_site_engineer_id_report_date_key" ON "dprs" ("project_id","site_engineer_id","report_date");
CREATE UNIQUE INDEX "goods_receipt_notes_pkey" ON "goods_receipt_notes" ("id");
CREATE UNIQUE INDEX "grns_pkey" ON "grns" ("id");
CREATE INDEX "idx_grn_po" ON "grns" ("purchase_order_id");
CREATE INDEX "idx_grn_project" ON "grns" ("project_id");
CREATE INDEX "idx_grn_status" ON "grns" ("status");
CREATE UNIQUE INDEX "labour_addresses_pkey" ON "labour_addresses" ("id");
CREATE UNIQUE INDEX "labour_request_participants_labour_request_id_labour_id_key" ON "labour_request_participants" ("labour_request_id","labour_id");
CREATE UNIQUE INDEX "labour_request_participants_pkey" ON "labour_request_participants" ("id");
CREATE INDEX "idx_labour_requests_composite" ON "labour_requests" ("status","request_date","category");
CREATE INDEX "idx_labour_requests_date" ON "labour_requests" ("request_date");
CREATE INDEX "idx_labour_requests_project_id" ON "labour_requests" ("project_id");
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
CREATE INDEX "idx_manual_attendance_labours_project" ON "manual_attendance_labours" ("project_id");
CREATE UNIQUE INDEX "manual_attendance_labours_pkey" ON "manual_attendance_labours" ("id");
CREATE UNIQUE INDEX "manual_attendance_labours_project_id_name_skill_key" ON "manual_attendance_labours" ("project_id","name","skill");
CREATE INDEX "idx_material_bill_status" ON "material_bills" ("status");
CREATE UNIQUE INDEX "material_bills_pkey" ON "material_bills" ("id");
CREATE UNIQUE INDEX "material_ledger_pkey" ON "material_ledger" ("id");
CREATE INDEX "idx_material_req_status" ON "material_requests" ("status");
CREATE UNIQUE INDEX "material_requests_pkey" ON "material_requests" ("id");
CREATE UNIQUE INDEX "notifications_pkey" ON "notifications" ("id");
CREATE INDEX "idx_blacklist_labour" ON "organization_blacklist" ("labour_id");
CREATE INDEX "idx_blacklist_org" ON "organization_blacklist" ("org_id");
CREATE UNIQUE INDEX "organization_blacklist_org_id_labour_id_key" ON "organization_blacklist" ("org_id","labour_id");
CREATE UNIQUE INDEX "organization_blacklist_pkey" ON "organization_blacklist" ("id");
CREATE UNIQUE INDEX "organization_managers_org_id_manager_id_key" ON "organization_managers" ("org_id","manager_id");
CREATE UNIQUE INDEX "organization_managers_pkey" ON "organization_managers" ("id");
CREATE UNIQUE INDEX "opm_unique" ON "organization_purchase_managers" ("org_id","purchase_manager_id");
CREATE UNIQUE INDEX "organization_purchase_managers_pkey" ON "organization_purchase_managers" ("id");
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
CREATE UNIQUE INDEX "project_breaks_pkey" ON "project_breaks" ("id");
CREATE UNIQUE INDEX "project_managers_pkey" ON "project_managers" ("id");
CREATE UNIQUE INDEX "project_managers_project_id_manager_id_key" ON "project_managers" ("project_id","manager_id");
CREATE UNIQUE INDEX "ppm_unique" ON "project_purchase_managers" ("project_id","purchase_manager_id");
CREATE UNIQUE INDEX "project_purchase_managers_pkey" ON "project_purchase_managers" ("id");
CREATE UNIQUE INDEX "project_site_engineers_pkey" ON "project_site_engineers" ("id");
CREATE UNIQUE INDEX "project_site_engineers_project_id_site_engineer_id_key" ON "project_site_engineers" ("project_id","site_engineer_id");
CREATE UNIQUE INDEX "project_tools_pkey" ON "project_tools" ("id");
CREATE UNIQUE INDEX "project_tools_tool_code_key" ON "project_tools" ("tool_code");
CREATE INDEX "idx_projects_lat_lng" ON "projects" ("latitude","longitude");
CREATE INDEX "idx_projects_org" ON "projects" ("org_id");
CREATE INDEX "idx_projects_status" ON "projects" ("status");
CREATE UNIQUE INDEX "projects_pkey" ON "projects" ("id");
CREATE UNIQUE INDEX "purchase_managers_email_key" ON "purchase_managers" ("email");
CREATE UNIQUE INDEX "purchase_managers_phone_key" ON "purchase_managers" ("phone");
CREATE UNIQUE INDEX "purchase_managers_pkey" ON "purchase_managers" ("id");
CREATE INDEX "idx_po_created_by" ON "purchase_orders" ("created_by");
CREATE INDEX "idx_po_project" ON "purchase_orders" ("project_id");
CREATE INDEX "idx_po_status" ON "purchase_orders" ("status");
CREATE UNIQUE INDEX "purchase_orders_pkey" ON "purchase_orders" ("id");
CREATE UNIQUE INDEX "purchase_orders_po_number_key" ON "purchase_orders" ("po_number");
CREATE INDEX "IDX_session_expire" ON "session" ("expire");
CREATE UNIQUE INDEX "session_pkey" ON "session" ("sid");
CREATE INDEX "idx_site_engineer_email" ON "site_engineers" ("email");
CREATE UNIQUE INDEX "site_engineers_email_key" ON "site_engineers" ("email");
CREATE UNIQUE INDEX "site_engineers_phone_key" ON "site_engineers" ("phone");
CREATE UNIQUE INDEX "site_engineers_pkey" ON "site_engineers" ("id");
CREATE UNIQUE INDEX "sync_action_log_pkey" ON "sync_action_log" ("id");
CREATE UNIQUE INDEX "sync_errors_pkey" ON "sync_errors" ("id");
CREATE UNIQUE INDEX "tool_qr_codes_pkey" ON "tool_qr_codes" ("id");
CREATE UNIQUE INDEX "tool_qr_codes_qr_token_key" ON "tool_qr_codes" ("qr_token");
CREATE UNIQUE INDEX "tool_qr_unique_day" ON "tool_qr_codes" ("tool_id","valid_date");
CREATE UNIQUE INDEX "tool_transactions_pkey" ON "tool_transactions" ("id");
CREATE UNIQUE INDEX "wage_rates_pkey" ON "wage_rates" ("id");
CREATE UNIQUE INDEX "wage_rates_project_id_skill_type_category_key" ON "wage_rates" ("project_id","skill_type","category");
CREATE INDEX "idx_wages_status" ON "wages" ("status");
CREATE UNIQUE INDEX "wages_attendance_id_key" ON "wages" ("attendance_id");
CREATE UNIQUE INDEX "wages_pkey" ON "wages" ("id");