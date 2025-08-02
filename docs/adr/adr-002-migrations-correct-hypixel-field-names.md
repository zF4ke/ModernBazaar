# ADR: Correcting Hypixel's Backwards Order-Field Naming via Flyway Migrations

## The Problem

Hypixel's Bazaar API uses names that are flipped from what they actually represent. sellVolume is really the buy volume, and activeSellOrdersCount is actually the count of active buy orders. I had originally mapped those fields directly into the JPA entities. That worked, but it made the code hard to read and reason about. The field names in the model were technically correct (they matched the raw API), but semantically wrong. Everything downstream (DTOs, queries, charts) had to mentally reverse what each column meant.

## The Solution

I created a Flyway migration (V2) that renames the columns and swaps the data where needed:

- in the hourly and point tables, I swapped the volumes and order counts
- I renamed fields like newBuyOrders to createdSellOrders so they describe what they actually are

After the migration, I reverted back to normal Hibernate mapping. No more @Column aliases or weird DTO conversions. The model fields match the DB columns, and both now reflect the real-world meaning.

## Proof

Flyway applied the baseline and V2 migration on startup. Hibernate initialized cleanly. Live endpoints returned the right data and psql showed the new column names. I spot-checked a few points and confirmed the renamed values were swapped correctly.

## Outcome

Everything is in sync now:

- the model reflects real-world semantics
- Hibernate maps cleanly without overrides
- Flyway owns the schema from here forward (but i went back to hibernate for dev convenience)

This removes the constant confusion around Hypixel's naming and sets a good foundation for future queries and analysis.
