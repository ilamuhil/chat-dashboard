-- Existing bots continue to appear everywhere until routes are configured.
ALTER TABLE "public"."bots"
  ADD COLUMN "widget_visibility_mode" VARCHAR(16) NOT NULL DEFAULT 'all',
  ADD COLUMN "widget_visibility_routes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD CONSTRAINT "bots_widget_visibility_mode_check"
    CHECK ("widget_visibility_mode" IN ('all', 'include', 'exclude')),
  ADD CONSTRAINT "bots_widget_visibility_routes_check"
    CHECK (cardinality("widget_visibility_routes") <= 50 AND
      ("widget_visibility_mode" = 'all' OR cardinality("widget_visibility_routes") > 0));
