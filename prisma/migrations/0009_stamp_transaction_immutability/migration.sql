-- Stamp transactions are an append-only audit ledger.
CREATE OR REPLACE FUNCTION "public"."prevent_stamp_transaction_mutation"()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'stamp_transactions are immutable';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "stamp_transactions_prevent_update_delete"
BEFORE UPDATE OR DELETE ON "public"."stamp_transactions"
FOR EACH ROW EXECUTE FUNCTION "public"."prevent_stamp_transaction_mutation"();
