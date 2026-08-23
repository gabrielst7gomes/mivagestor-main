-- Substitui SELECT público amplo por SELECT autenticado por dono;
-- a leitura pública das imagens continua via URL pública do bucket (já é public=true).
DROP POLICY IF EXISTS "Avatars are publicly accessible" ON storage.objects;

CREATE POLICY "Users can read their own avatar"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);