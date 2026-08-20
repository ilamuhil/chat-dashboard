-- Rename the existing column without losing its data.
ALTER TABLE "conversations_meta"
RENAME COLUMN "hand_over_status" TO "handover_status";
