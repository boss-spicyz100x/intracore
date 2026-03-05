CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"token_hash" text NOT NULL,
	"email" text NOT NULL,
	"expires_at" text NOT NULL,
	"created_at" text NOT NULL,
	CONSTRAINT "sessions_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "whitelists" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"created_at" text NOT NULL,
	CONSTRAINT "whitelists_email_unique" UNIQUE("email")
);
