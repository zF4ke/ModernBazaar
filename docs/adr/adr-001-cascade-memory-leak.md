# ADR: Cascade mapping between Item and Snapshot causing memory issues

## The Problem

I initially set up the relationship between BazaarItem and BazaarProductSnapshot with full cascade on both sides. That meant whenever I saved or merged items, Hibernate would automatically load and initialize every related snapshot and its order entries. Under load this resulted in a gigantic persistence context—hundreds of thousands of entries—consuming hundreds of megabytes of heap. The core would repeatedly hit OutOfMemoryError during each poll. It felt like I’d written bullet‑proof code, but the cascade was quietly bringing everything into memory on every save.

## The Solution

The fix was surprisingly simple: remove all cascade directives on those associations and abandon merging existing items altogether. Now:

- Upserting items uses a straight insert‑ignore SQL, so existing rows are never merged.
- Saving snapshots happens in one transaction, but with explicit persist calls only on the new snapshots, never touching items.
- A small batch flush and clear ensures snapshots don’t linger in the persistence context.

This stops Hibernate from ever initializing the full snapshot collection for every item, and the memory spike went away immediately.

## Proof

In the heap dump, MAT reported a single StatefulPersistenceContext holding over 370 MB of entries, dominated by MutableEntityEntry instances—direct evidence of the cascade initializing every snapshot. After removing the cascade, the persistence context stays small and stable; no more full compactions or OOME during polls.

## Outcome

Since removing the cascade:

- memory usage per poll spikes briefly (and it's not increasing) but falls back to a low baseline,
- G1 Old Gen stays flat now.
- the service runs reliably without crashes.

It’s a reminder that defaults like cascade=ALL can have hidden costs, and explicit control over what loads in memory is crucial for scalable batch processes.

