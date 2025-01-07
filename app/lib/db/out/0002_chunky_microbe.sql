ALTER TABLE "log" RENAME TO "llm_log";--> statement-breakpoint
ALTER TABLE "llm_log" DROP CONSTRAINT "log_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "llm_log" ADD CONSTRAINT "llm_log_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;