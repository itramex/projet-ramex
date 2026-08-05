

## Codely Structured Memories

### User

### Feedback

### Project
- [2026-08-05 10:47:45] Backend venv is at backend/venv/. Run Django commands with: .\venv\Scripts\python.exe manage.py <command> from the backend directory. The system shell is PowerShell — `&&` is NOT a valid separator, use `;` or separate commands.
- [2026-08-05 14:28:06] Performance optimization completed 2026-08-05: (1) reduced backend pagination (10k→100, 50k→200), (2) fixed N+1 on CooperativeListSerializer with annotate(), (3) added prefetch_related on ProducteurViewSet, (4) replaced Python loops in dashboard with DB aggregation (Case/When for age distribution, values_list for children schooling), (5) built custom axios cache — axios-cache-adapter incompatible with axios 1.x so wrote apiCache.js from scratch, (6) added useMemo/useDeferredValue/useCallback in React components, (7) refactored Leaflet map from CDN to npm imports + separated init from marker updates, (8) added fetchAllPages() helper to auto-paginate DRF responses so frontend gets all records despite small page_size, (9) added CONN_MAX_AGE=60 for DB connection pooling, (10) added 18 DB indexes across Producteur/Parcelle/BonCollecte/Dotation models, (11) reduced ProducteurListSerializer from 70+ to 35 fields. **Why:** app was too slow on page loads. **How to apply:** remaining perf items — Redis cache (currently LocMemCache), marker clustering for Leaflet, and the ProducteurListSerializer could go to ~25 fields if frontend column selector is adjusted.


### Reference

