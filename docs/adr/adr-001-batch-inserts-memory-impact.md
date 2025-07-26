# ADR: Batch Processing and Bulk Inserts in BazaarFetchService causing memory issues

## The Problem

When I started working on the `BazaarFetchService`, I honestly underestimated how challenging it would be to handle large amounts of data. My initial approach was to process and insert everything into the database in one go. It seemed straightforward at first, but it quickly became clear that this wasn't going to work. The system would run out of memory, database operations became painfully slow, and, on a few occasions, the core even crashed because it ran out of memory. It was frustrating, and I knew I had to find a better way.

## The Solution

After some trial and error (and a lot of Googling/ChatGPTing), I decided to try breaking the data into smaller chunks—batches—and processing them in bulk. This wasn't just about fixing the immediate issues; I wanted a solution that would make the system more reliable and scalable in the long run.

### Why Batches?

Here's how I think about it: By splitting the data into smaller batches, I could:

- Avoid overloading the system's memory.
- Speed up database operations by reducing the overhead of constant back-and-forth communication.
- Keep the system stable, even when dealing with large datasets.

In the code, I collect data into a `batch`. Once the batch reaches a certain size (`INGEST_BATCH`), I send it to the database using a method I wrote called `bulkInsert`.

### What's `bulkInsert`?

This is the core of the solution. It's a method in the `SnapshotIngestor` class that efficiently inserts data into the database. The key here is using Hibernate's `StatelessSession`. Unlike a regular session, it doesn't cache objects, which means it uses less memory and is much faster for bulk operations. Honestly, I didn't know about `StatelessSession` until I started digging into Hibernate's documentation, and it turned out to be exactly what I needed.

## How It Works

Here's the basic idea:

1. I use Spring's `TransactionTemplate` to manage transactions. This ensures that all the operations in a batch either succeed together or fail together. It's a lifesaver for maintaining data integrity.
2. Hibernate's `SessionFactory` helps me create a `StatelessSession` to interact with the database.
3. The `StatelessSession` skips the first-level cache, which keeps memory usage low and makes the whole process faster.

Here's what the `bulkInsert` method looks like:

```java
public void bulkInsert(List<BazaarProductSnapshot> snapshots) {
    txTemplate.executeWithoutResult(status -> {
        try (StatelessSession ss = sessionFactory.openStatelessSession()) {
            for (BazaarProductSnapshot snap : snapshots) {
                ss.insert(snap);
                snap.getBuyOrders().forEach(ss::insert);
                snap.getSellOrders().forEach(ss::insert);
            }
        }
    });
}
```

This method isn't perfect, but it's been working well so far. It ensures that all the data in a batch is inserted efficiently and reliably. The pool memory caps at around 1 GB, which is the limit I set on the environment, and it seems to handle the load without any issues. I'll keep monitoring the G1 Old Gen space (and the others too but this one was the most problematic before) to ensure everything stays stable.

## The Outcome

Switching to batch processing and bulk inserts has made a huge difference. The system is now:

- **Scalable**: It can handle large datasets without breaking down.
- **Faster**: Database operations are much quicker than before.
- **More Reliable**: No more crashes or memory issues (at least not so far).

I'm sure there's still room for improvement, but for now, I'm happy with how this turned out. It's been a good learning experience, and I feel more confident tackling similar challenges in the future.
