# Stop transactions from disappearing

## Goal
Keep saved transactions visible during normal use and after reloading, and show a clear recoverable error instead of an empty list when loading fails.

## Plan
1. Verify whether the affected transactions remain saved and inspect the browser’s transaction requests and errors, without exposing transaction details.
2. Trace the transaction-loading and mutation paths, including overlapping reloads, to identify why the list clears both during use and after refresh.
3. Fix the confirmed cause so failed or stale loads cannot replace valid transaction data with an empty list; show an error and retry path when the saved data cannot be loaded.
4. Add a focused regression test for the confirmed failure case and verify the transaction list behavior.

## Technical details
The current data loader does not check Supabase response errors before mapping transactions; a failed query can therefore be treated as an empty result. This is a confirmed risk in the code, not yet a confirmed cause of the reported behavior. Preserve existing transaction rules and access controls; make no schema or data-cleanup changes.
