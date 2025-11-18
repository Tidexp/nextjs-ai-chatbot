DO $$ BEGIN CREATE TYPE "public"."user_type" AS ENUM('guest', 'regular');
EXCEPTION
WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
ALTER TABLE "public"."User"
ADD COLUMN "type" "public"."user_type" DEFAULT 'guest';
EXCEPTION
WHEN duplicate_column THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
ALTER TABLE "public"."User"
ADD COLUMN "displayName" varchar(100);
EXCEPTION
WHEN duplicate_column THEN null;
END $$;