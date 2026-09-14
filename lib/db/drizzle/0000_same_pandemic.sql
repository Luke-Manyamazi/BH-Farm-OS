-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE "farm_zones" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"dimensions" text,
	"status" text DEFAULT 'Active' NOT NULL,
	"accent" text DEFAULT 'sage' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "finance_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"category" text NOT NULL,
	"farm_unit" text NOT NULL,
	"description" text NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"transaction_date" date NOT NULL,
	"counterparty" text
);
--> statement-breakpoint
CREATE TABLE "goats" (
	"id" serial PRIMARY KEY NOT NULL,
	"goat_id" text NOT NULL,
	"name" text NOT NULL,
	"sex" text NOT NULL,
	"breed" text NOT NULL,
	"date_of_birth" date,
	"current_weight_kg" numeric(8, 2),
	"paddock" text DEFAULT 'Paddock 1' NOT NULL,
	"status" text DEFAULT 'Active' NOT NULL,
	"pregnancy_status" text DEFAULT 'Not pregnant' NOT NULL,
	"expected_kidding_date" date,
	"health_status" text DEFAULT 'Good' NOT NULL,
	CONSTRAINT "goats_goat_id_unique" UNIQUE("goat_id")
);
--> statement-breakpoint
CREATE TABLE "inventory_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"item_id" text NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"unit" text NOT NULL,
	"quantity" numeric(10, 2) DEFAULT '0' NOT NULL,
	"minimum_stock" numeric(10, 2) DEFAULT '0' NOT NULL,
	"maximum_stock" numeric(10, 2) DEFAULT '0' NOT NULL,
	"supplier" text,
	"purchase_price" numeric(10, 2),
	"last_purchase_date" date,
	"storage_location" text,
	CONSTRAINT "inventory_items_item_id_unique" UNIQUE("item_id")
);
--> statement-breakpoint
CREATE TABLE "inventory_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"inventory_item_id" integer NOT NULL,
	"type" text NOT NULL,
	"quantity" numeric(10, 2) NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "poultry_flocks" (
	"id" serial PRIMARY KEY NOT NULL,
	"batch_id" text NOT NULL,
	"kind" text NOT NULL,
	"breed" text NOT NULL,
	"current_quantity" integer NOT NULL,
	"starting_quantity" integer NOT NULL,
	"mortality" integer DEFAULT 0 NOT NULL,
	"average_weight_kg" numeric(8, 2),
	"feed_kg" numeric(10, 2) DEFAULT '0' NOT NULL,
	"status" text DEFAULT 'Active' NOT NULL,
	"expected_sale_date" date,
	CONSTRAINT "poultry_flocks_batch_id_unique" UNIQUE("batch_id")
);
--> statement-breakpoint
CREATE TABLE "farm_tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"farm_unit" text NOT NULL,
	"priority" text DEFAULT 'Normal' NOT NULL,
	"due_date" date NOT NULL,
	"due_time" text,
	"recurrence" text,
	"status" text DEFAULT 'Pending' NOT NULL,
	"completed_at" timestamp with time zone,
	"assigned_to" text,
	"notes" text
);

*/