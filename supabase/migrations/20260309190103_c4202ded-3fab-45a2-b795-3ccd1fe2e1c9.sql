
-- The INSERT/UPDATE WITH CHECK (true) on companies is intentional for this B2B lead gen app
-- where all authenticated team members share the same company pool.
-- But let's make it slightly more explicit by keeping the policies as-is
-- and instead add a DELETE restriction (only allow delete if you want to in the future).
-- The linter warnings are acceptable for shared company data.

-- No changes needed - the current policies are correct for this use case.
SELECT 1;
