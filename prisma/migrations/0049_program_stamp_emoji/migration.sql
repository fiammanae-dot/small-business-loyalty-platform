-- The emoji a business picks as its stamp, drawn on the wallet card.
-- Nullable on purpose: every existing program keeps working and falls back to
-- a plain tick until its owner chooses one.
ALTER TABLE "loyalty_programs" ADD COLUMN "stamp_emoji" TEXT;
