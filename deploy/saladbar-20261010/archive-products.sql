BEGIN;
DO $rollback$
BEGIN
  IF EXISTS(SELECT 1 FROM menu_products WHERE data->>'builder_release'='saladbar-20261010'
    AND (version<>1 OR data->>'status'<>'active')) THEN
    RAISE EXCEPTION 'Builder catalog changed since release; review before rollback';
  END IF;
  UPDATE menu_products SET data=jsonb_set(data,'{status}','"archived"'::jsonb),version=version+1,updated_at=now()
    WHERE data->>'builder_release'='saladbar-20261010';
END $rollback$;
COMMIT;
