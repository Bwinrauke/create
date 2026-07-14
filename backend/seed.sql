-- ============================================================
--  2137 Rent Book — seed data (the real roster + history)
--  Source: 2137 Master Rent Sheet (FDOR), Aug 2025 – Jul 2026.
--  Run AFTER schema.sql. Safe to run once on a fresh project.
-- ============================================================

-- ---------- TENANTS ----------
insert into tenants (name, unit, beds, lease_rent, deposit, lease_start, lease_end, program, govt_default, portion_default, phone) values
 ('Marcella Harris', '1B', '1BR', 2075.00, 0, '2026-03-01', '2027-02-28', 'CityFHEPS', 1938.30, 136.70, '272-280-7951'),
 ('Roshida Howell', '2C', '2BR', 2423.00, 0, '2026-03-01', '2027-02-28', 'CityFHEPS', 2400.02, 22.98, '929-650-6540'),
 ('Melanie Person', '2B', '2BR', 2423.00, 0, '2026-06-01', '2027-05-31', 'Shelter/FHEPS', 2117.90, 305.10, '929-681-0033'),
 ('Christopher Ferrer', '3D', '2BR', 2900.00, 0, '2025-11-01', '2026-10-31', 'Section 8', 2214.00, 686.00, '950-307-8135'),
 ('Esmi Medina', '3B', '2BR', 2747.00, 0, '2025-10-01', '2026-09-30', 'Section 8', 2747.00, 0.00, '934-210-1096'),
 ('Boris Altier Maselli', '1C', '2BR', 3040.00, 0, '2026-05-01', '2027-04-30', 'Section 8', 1825.00, 1215.00, '646-764-4156'),
 ('Diane Cabrera', '2D', '2BR', 2830.00, 0, '2026-05-01', '2027-04-30', 'Section 8', 2561.00, 269.00, '908-414-9436'),
 ('Lorly Parks', '3C', '2BR', 2722.00, 0, '2026-06-01', '2027-05-31', 'Section 8', 2722.00, 0.00, null);

-- ---------- RENT TERMS (initial term per tenant = ledger start at lease start) ----------
insert into rent_terms (tenant_id, effective_from, lease_rent, govt_expected, tenant_expected, note)
select id, d.eff::date, d.rent, d.gov, d.ten, 'Initial term'
from tenants t join (values
  ('Marcella Harris', '2026-03-01', 2075.00, 1938.30, 136.70),
  ('Roshida Howell', '2026-03-01', 2423.00, 2400.02, 22.98),
  ('Melanie Person', '2026-06-01', 2423.00, 2117.90, 305.10),
  ('Christopher Ferrer', '2025-11-01', 2900.00, 2214.00, 686.00),
  ('Esmi Medina', '2025-10-01', 2747.00, 2747.00, 0.00),
  ('Boris Altier Maselli', '2026-05-01', 3040.00, 1825.00, 1215.00),
  ('Diane Cabrera', '2026-05-01', 2830.00, 2561.00, 269.00),
  ('Lorly Parks', '2026-06-01', 2722.00, 2722.00, 0.00)
) as d(name, eff, rent, gov, ten) on d.name = t.name;

-- ---------- COLLECTIONS  (Aug 2025 – Jul 2026) ----------
insert into payments (tenant_id, month, govt, portion, assistance, check_num, bank_confirm, notes)
select t.id, d.month, d.govt, d.portion, d.assist, d.chk, d.bank, d.notes
from tenants t join (values
  ('Esmi Medina', '2025-08', 2747.00, 0.00, 0.00, '', true, ''),
  ('Esmi Medina', '2025-09', 2747.00, 0.00, 0.00, '', true, ''),
  ('Christopher Ferrer', '2025-10', 2214.00, 686.00, 0.00, '', true, ''),
  ('Esmi Medina', '2025-10', 2747.00, 0.00, 0.00, '', true, ''),
  ('Christopher Ferrer', '2025-11', 2214.00, 686.00, 0.00, '', true, ''),
  ('Esmi Medina', '2025-11', 2747.00, 0.00, 0.00, '', true, ''),
  ('Christopher Ferrer', '2025-12', 2214.00, 686.00, 0.00, '', true, ''),
  ('Esmi Medina', '2025-12', 2747.00, 0.00, 0.00, '', true, ''),
  ('Christopher Ferrer', '2026-01', 2214.00, 686.00, 0.00, '', true, ''),
  ('Esmi Medina', '2026-01', 2747.00, 0.00, 0.00, '', true, ''),
  ('Christopher Ferrer', '2026-02', 2214.00, 686.00, 0.00, '', true, ''),
  ('Esmi Medina', '2026-02', 2747.00, 0.00, 0.00, '', true, ''),
  ('Marcella Harris', '2026-03', 1406.00, 0.00, 0.00, '44586041', true, 'Moved in mid-month — partial'),
  ('Roshida Howell', '2026-03', 1641.00, 0.00, 0.00, '44596051', true, 'Partial — move-in month'),
  ('Christopher Ferrer', '2026-03', 2214.00, 686.00, 0.00, '', true, ''),
  ('Esmi Medina', '2026-03', 2747.00, 0.00, 0.00, '', true, ''),
  ('Marcella Harris', '2026-04', 1938.30, 0.00, 0.00, '44586040', true, 'Tenant portion outstanding'),
  ('Roshida Howell', '2026-04', 2400.02, 22.98, 0.00, '44596052', true, 'Covers Apr–Jul'),
  ('Christopher Ferrer', '2026-04', 2214.00, 686.00, 0.00, '', true, ''),
  ('Esmi Medina', '2026-04', 2747.00, 0.00, 0.00, '', true, ''),
  ('Marcella Harris', '2026-05', 1938.30, 0.00, 0.00, '44586040', true, 'Tenant portion outstanding'),
  ('Roshida Howell', '2026-05', 2400.02, 22.98, 0.00, '', true, ''),
  ('Christopher Ferrer', '2026-05', 2214.00, 686.00, 0.00, '', true, ''),
  ('Esmi Medina', '2026-05', 2747.00, 0.00, 0.00, '', true, ''),
  ('Boris Altier Maselli', '2026-05', 1825.00, 1215.00, 0.00, '', true, ''),
  ('Diane Cabrera', '2026-05', 2561.00, 269.00, 0.00, '', true, ''),
  ('Marcella Harris', '2026-06', 1938.30, 136.70, 0.00, '44586040', true, ''),
  ('Roshida Howell', '2026-06', 2400.02, 22.98, 0.00, '22624052', true, ''),
  ('Melanie Person', '2026-06', 1834.96, 305.10, 282.94, '', true, 'Program paid her share $305.10; shelter $283'),
  ('Christopher Ferrer', '2026-06', 2214.00, 686.00, 0.00, '', true, ''),
  ('Esmi Medina', '2026-06', 2747.00, 0.00, 0.00, '', true, ''),
  ('Boris Altier Maselli', '2026-06', 1825.00, 1215.00, 0.00, '', true, ''),
  ('Diane Cabrera', '2026-06', 2561.00, 269.00, 0.00, '', true, ''),
  ('Lorly Parks', '2026-06', 2722.00, 0.00, 0.00, '', true, ''),
  ('Marcella Harris', '2026-07', 1938.30, 136.70, 19.00, '22795869', false, 'NYC FAB portion, check #'),
  ('Roshida Howell', '2026-07', 2400.02, 22.98, 0.00, '', true, ''),
  ('Melanie Person', '2026-07', 1834.96, 305.10, 141.50, '22713364', true, 'Shelter $283; program paid her share $305.10'),
  ('Christopher Ferrer', '2026-07', 2214.00, 686.00, 0.00, '', true, ''),
  ('Esmi Medina', '2026-07', 2747.00, 0.00, 0.00, '', true, ''),
  ('Boris Altier Maselli', '2026-07', 1825.00, 0.00, 0.00, '', false, 'Tenant portion outstanding'),
  ('Diane Cabrera', '2026-07', 2561.00, 269.00, 270.00, '', true, 'Overpaid $270'),
  ('Lorly Parks', '2026-07', 0.00, 0.00, 0.00, '', false, 'Owed — no payment received')
) as d(name, month, govt, portion, assist, chk, bank, notes) on d.name = t.name;

-- ---------- PARKING ----------
insert into parking_spots (name, spot, amount, method) values
 ('Ramuel D. Arias',      'Lot 4',     140, 'Zelle'),
 ('Noel F. Batista',      'Lot 5 & 6', 280, 'Zelle'),
 ('Matthew Reyes',        'Lot 1',     140, 'Zelle'),
 ('Jonathan Portugues',   'Lot 2',     125, 'Zelle'),
 ('Boris Altier Maselli', 'Lot 3',     140, 'In rent');

-- ---------- PARKING PAYMENTS (paid months per spot) ----------
insert into parking_payments (spot_id, month, paid)
select s.id, d.month, true
from parking_spots s join (values
  ('Lot 4', '2026-04'),
  ('Lot 4', '2026-05'),
  ('Lot 4', '2026-06'),
  ('Lot 4', '2026-07'),
  ('Lot 5 & 6', '2026-03'),
  ('Lot 5 & 6', '2026-04'),
  ('Lot 5 & 6', '2026-05'),
  ('Lot 5 & 6', '2026-06'),
  ('Lot 5 & 6', '2026-07'),
  ('Lot 1', '2026-05'),
  ('Lot 1', '2026-06'),
  ('Lot 1', '2026-07'),
  ('Lot 2', '2026-03'),
  ('Lot 2', '2026-04'),
  ('Lot 2', '2026-05'),
  ('Lot 2', '2026-06'),
  ('Lot 2', '2026-07'),
  ('Lot 3', '2026-05'),
  ('Lot 3', '2026-06'),
  ('Lot 3', '2026-07')
) as d(spot, month) on d.spot = s.spot;

-- Done. Sign up in the app, then add yourself to members (see README step 4).
