-- ============================================================================
--  Migration 0004 : stockage des justificatifs (Supabase Storage)
--
--  Bucket PRIVE `justificatifs`. Les fichiers ne sont accessibles que via une
--  URL signee temporaire ; l'acces est filtre par les memes regles que les
--  projets (fonctions definies dans 0002_rls_policies.sql).
--
--  Arborescence des cles : <projectId>/<lineId>/<uid>-<fichier>
-- ============================================================================

-- Bucket prive (idempotent).
insert into storage.buckets (id, name, public)
values ('justificatifs', 'justificatifs', false)
on conflict (id) do nothing;

-- RLS sur storage.objects est deja active par defaut sur Supabase.

-- Lecture : tout membre du bureau authentifie.
create policy "justif_read" on storage.objects for select
  using (bucket_id = 'justificatifs' and is_authenticated_member());

-- Ecriture : roles autorises a modifier les projets/documents.
create policy "justif_insert" on storage.objects for insert
  with check (bucket_id = 'justificatifs' and can_write_projets());

create policy "justif_update" on storage.objects for update
  using (bucket_id = 'justificatifs' and can_write_projets())
  with check (bucket_id = 'justificatifs' and can_write_projets());

create policy "justif_delete" on storage.objects for delete
  using (bucket_id = 'justificatifs' and can_write_projets());
