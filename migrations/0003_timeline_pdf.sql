alter table events add column if not exists timeline_pdf bytea;
alter table events add column if not exists timeline_pdf_name text not null default '';
