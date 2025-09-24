-- Ensure ON CONFLICT works by adding a unique index on messageId
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
        AND indexname = 'ux_response_analytics_message_id'
) THEN CREATE UNIQUE INDEX ux_response_analytics_message_id ON "ResponseAnalytics"("messageId");
END IF;
END $$;