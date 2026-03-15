ALTER TABLE public.saved_filters ADD COLUMN is_default boolean NOT NULL DEFAULT false;

-- Add update policy for saved_filters
CREATE POLICY "Users can update their own filters"
ON public.saved_filters FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);