alter table events add column if not exists contract_pdf bytea;
alter table events add column if not exists contract_pdf_name text not null default '';
