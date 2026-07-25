# Style ontology grows by scrape proposal + human approval

The scrape pipeline queues unrecognized style terms as candidate tags; a human approves, merges, or rejects each one — nothing enters the ontology unreviewed. Mapping unknowns to the nearest existing tag was rejected (silent drift by another name), as was embedding-based auto-expansion (model-generated drift, e.g. clustering deciding "fine-line" and "single-needle" should split). The merge call — "fineline" vs "fine-line" collapse, not coexist — is a human judgment every time.
