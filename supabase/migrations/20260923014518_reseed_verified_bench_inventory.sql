-- Replace all POC submissions with the verified public-location baseline.
-- Adoption details below are fictional fixtures; bench coordinates are not.
truncate table public.bench_updates restart identity;
truncate table public.bench_adoption_holds;
truncate table public.bench_adoptions;
delete from public.benches;

insert into public.benches (
  id,
  name,
  area,
  latitude,
  longitude,
  source,
  source_reference
)
values
  ('VC-001', 'Bench 01', 'Southwest park', 40.8887392, -73.8981296, 'OpenStreetMap', 'node/13093276666'),
  ('VC-002', 'Bench 02', 'Southwest park', 40.8888400, -73.8980808, 'OpenStreetMap', 'node/13093276665'),
  ('VC-003', 'Bench 03', 'Southwest park', 40.8889148, -73.8979676, 'OpenStreetMap', 'node/13093276668'),
  ('VC-004', 'Bench 04', 'Southwest park', 40.8892410, -73.8978701, 'OpenStreetMap', 'node/13093276667'),
  ('VC-005', 'Bench 05', 'Southwest park', 40.8896193, -73.8977898, 'OpenStreetMap', 'node/13093276669'),
  ('VC-006', 'Bench 06', 'Lake area', 40.8935019, -73.8892148, 'OpenStreetMap', 'node/9043834572'),
  ('VC-007', 'Bench 07', 'Putnam Greenway', 40.9031470, -73.8962130, 'OpenStreetMap', 'node/9934725753'),
  ('VC-008', 'Bench 08', 'Northwest park', 40.9092966, -73.8963095, 'OpenStreetMap', 'node/6765115255'),
  ('VC-009', 'Bench 09', 'Northwest park', 40.9093106, -73.8961881, 'OpenStreetMap', 'node/6765115263'),
  ('VC-010', 'Bench 10', 'Northwest park', 40.9093826, -73.8963168, 'OpenStreetMap', 'node/6765115266'),
  ('VC-011', 'Bench 11', 'Northwest park', 40.9093871, -73.8962049, 'OpenStreetMap', 'node/6765115268');

insert into public.bench_adoptions (
  bench_id,
  adopter_name,
  plaque_message,
  adoption_start,
  adoption_end,
  duration_count,
  duration_unit,
  contribution_amount,
  additional_contribution_amount,
  payment_method,
  is_anonymous,
  receipt_number
)
values
  (
    'VC-002',
    'POC anonymous patron',
    'For every walk we took together.',
    '2025-04-12',
    '2035-04-12',
    10,
    'year',
    3500,
    0,
    'check',
    true,
    'VCP-POC-0001'
  ),
  (
    'VC-004',
    'The Rivera family',
    'May every path bring you home.',
    '2026-06-18',
    '2036-06-18',
    10,
    'year',
    4000,
    500,
    'zelle',
    false,
    'VCP-POC-0002'
  ),
  (
    'VC-006',
    'Maya Chen',
    'Sit awhile. The path can wait.',
    '2024-11-03',
    '2039-11-03',
    15,
    'year',
    6000,
    750,
    'stock',
    false,
    'VCP-POC-0003'
  ),
  (
    'VC-008',
    'POC anonymous patron',
    'In gratitude for the quiet mornings.',
    '2026-02-14',
    '2036-02-14',
    10,
    'year',
    3500,
    0,
    'daf',
    true,
    'VCP-POC-0004'
  ),
  (
    'VC-010',
    'Friends of Sam Torres',
    'Always curious. Always kind.',
    '2023-09-01',
    '2035-09-01',
    12,
    'year',
    4200,
    0,
    'bank',
    false,
    'VCP-POC-0005'
  ),
  (
    'VC-011',
    'The Okafor family',
    'Rest here, then keep going.',
    '2025-10-22',
    '2045-10-22',
    20,
    'year',
    10000,
    3000,
    'card',
    false,
    'VCP-POC-0006'
  );
