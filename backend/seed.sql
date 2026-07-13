-- ============================================================
--  2137 Rent Book — seed data (the real roster)
--  Run AFTER schema.sql. Safe to run once on a fresh project.
-- ============================================================

-- ---------- TENANTS ----------
insert into tenants (name, unit, beds, lease_rent, deposit, lease_start, lease_end, program, govt_default, portion_default, phone) values
 ('Marcella Harris',      '1B', '1BR', 2075, 0, null,         null,         'CityFHEPS',     1938.30, 137.00, '272-280-7951'),
 ('Roshida Howell',       '2C', '2BR', 2423, 0, null,         null,         'CityFHEPS',     2400.02,  22.98, '929-650-6540'),
 ('Melanie Person',       '2B', '2BR', 2423, 0, null,         null,         'Shelter/FHEPS', 1834.96, 305.10, '929-681-0033'),
 ('Christopher Ferrer',   '3D', '2BR', 2900, 0, '2025-11-01', '2026-10-31', 'Section 8',     2214.00, 686.00, '950-307-8135'),
 ('Esmi Medina',          '3B', '2BR', 2747, 0, '2025-10-01', '2026-09-30', 'Section 8',     2747.00,   0.00, '934-210-1096'),
 ('Boris Altier Maselli', '1C', '2BR', 3040, 0, null,         null,         'Section 8',     1825.00,1215.00, '646-764-4156'),
 ('Diane Cabrera',        '2D', '2BR', 2830, 0, null,         null,         'Section 8',     2561.00, 269.00, '908-414-9436'),
 ('Lorly Parks',          '3C', '2BR', 2722, 0, null,         null,         'Section 8',        0.00,2722.00, null);

-- ---------- PARKING ----------
insert into parking_spots (name, spot, amount, method) values
 ('Ramuel D. Arias',      'Lot 4',     140, 'Zelle'),
 ('Noel F. Batista',      'Lot 5 & 6', 280, 'Zelle'),
 ('Matthew Reyes',        'Lot 1',     140, 'Zelle'),
 ('Jonathan Portugues',   'Lot 2',     125, 'Zelle'),
 ('Boris Altier Maselli', 'Lot 3',     140, 'In rent');

-- ---------- JULY 2026 COLLECTIONS ----------
insert into payments (tenant_id, month, govt, portion, assistance, check_num, bank_confirm, notes)
select id, '2026-07', d.govt, d.portion, d.assist, d.chk, d.bank, d.notes
from tenants t
join (values
  ('Marcella Harris',    1938.30, 137.00,  19.00, '22795869', true,  'NYC FAB portion'),
  ('Roshida Howell',     2400.02,  22.98,   0.00, '',         true,  ''),
  ('Melanie Person',     1834.96, 305.10, 141.50, '22713364', true,  'Shelter paid $283; program paid her share $305.10'),
  ('Christopher Ferrer', 2214.00, 686.00,   0.00, '',         true,  ''),
  ('Esmi Medina',        2747.00,   0.00,   0.00, '',         true,  ''),
  ('Boris Altier Maselli',1825.00,  0.00,   0.00, '',         false, 'Tenant portion outstanding'),
  ('Diane Cabrera',      2561.00, 269.00, 270.00, '',         true,  'Overpaid $270'),
  ('Lorly Parks',           0.00,   0.00,   0.00, '',         false, '')
) as d(name, govt, portion, assist, chk, bank, notes) on d.name = t.name;

-- Done. Sign up in the app, then add yourself to members (see README step 4).
