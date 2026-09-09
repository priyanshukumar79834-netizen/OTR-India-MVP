ALTER TABLE "access_requests" ALTER COLUMN "status" SET DEFAULT 'PENDING';--> statement-breakpoint
ALTER TABLE "access_requests" ADD COLUMN "request_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "access_requests" ADD COLUMN "client_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "access_requests" ADD COLUMN "redirect_uri" text NOT NULL;--> statement-breakpoint
ALTER TABLE "access_requests" ADD COLUMN "purpose" text;--> statement-breakpoint
ALTER TABLE "access_requests" ADD COLUMN "user_id" text;--> statement-breakpoint
ALTER TABLE "access_requests" ADD COLUMN "expires_at" timestamp NOT NULL;--> statement-breakpoint
ALTER TABLE "access_requests" ADD COLUMN "consumed_at" timestamp;--> statement-breakpoint
ALTER TABLE "government_clients" ADD COLUMN "redirect_uris" jsonb;--> statement-breakpoint
ALTER TABLE "access_requests" ADD CONSTRAINT "access_requests_client_id_government_clients_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."government_clients"("client_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "access_requests" ADD CONSTRAINT "access_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "access_requests_request_id_idx" ON "access_requests" USING btree ("request_id");