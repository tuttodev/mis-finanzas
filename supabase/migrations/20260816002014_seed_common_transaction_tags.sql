-- Seed a reusable catalog of common tags and keep them separate from user-created tags.
alter table public.tags
  add column is_system boolean not null default false;

with common_tags(name) as (
  values
    ('Mercado'), ('Restaurantes'), ('Domicilios'), ('Cafeterías'), ('Snacks'),
    ('Gasolina'), ('Taxi'), ('Transporte público'), ('Parqueadero'), ('Peajes'),
    ('Mantenimiento vehículo'), ('Arriendo'), ('Hipoteca'), ('Reparaciones del hogar'),
    ('Muebles'), ('Decoración'), ('Energía'), ('Agua'), ('Gas'), ('Internet'),
    ('Telefonía'), ('Suscripciones'), ('Medicamentos'), ('Médico'), ('Odontología'),
    ('Exámenes médicos'), ('Seguro médico'), ('Matrícula'), ('Cursos'), ('Libros'),
    ('Útiles escolares'), ('Certificaciones'), ('Cine'), ('Streaming'), ('Eventos'),
    ('Juegos'), ('Hobbies'), ('Ropa'), ('Tecnología'), ('Hogar'), ('Regalos'),
    ('Mascotas'), ('Tarjeta de crédito'), ('Préstamo'), ('Cuota'), ('Intereses de deuda'),
    ('Donaciones'), ('Impuestos'), ('Trámites'), ('Viajes'), ('Rendimientos de ahorro'),
    ('Intereses de ahorro')
)
insert into public.tags (name, is_system)
select common_tags.name, true
from common_tags
where not exists (
  select 1
  from public.tags existing
  where lower(existing.name) = lower(common_tags.name)
);
