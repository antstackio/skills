# Sub-Skill: SQL Database Review (RDS, Aurora, PostgreSQL, MySQL)

## File patterns
Applies to: `*.sql`, `*migration*`, `*schema*`, `*seed*`, `*.prisma`, `*knexfile*`, `*typeorm*`, `*drizzle*`, `*sequelize*`, files referencing RDS/Aurora resources in CloudFormation/SAM, SQL query strings in application code (e.g., `knex(`, `.query(`, `.raw(`, `sql\``, `prisma.$queryRaw`)

---

## Migration Safety

### Destructive Operations
- 🔴 Critical: `DROP TABLE` or `DROP COLUMN` without confirmation that data has been migrated or is no longer needed
- 🔴 Critical: `TRUNCATE TABLE` in a migration — this should never be in production migrations
- 🔴 Critical: Column type changes that risk data loss (e.g., `VARCHAR(255)` → `VARCHAR(50)`, `BIGINT` → `INT`, `DECIMAL` precision reduction)
- 🟡 Warning: `ALTER TABLE` on tables with >1M rows — may lock the table for extended periods. For MySQL, consider `pt-online-schema-change` or `gh-ost`. For Postgres 11+, `ADD COLUMN` with a non-volatile `DEFAULT` is non-blocking, but `ALTER COLUMN TYPE` still requires a full table rewrite
- 🟡 Warning: `NOT NULL` constraint added to existing column without a `DEFAULT` — fails for existing rows with NULL values
- 🟡 Warning: Renaming columns or tables — any code deployed before or during the migration will break. Use expand-and-contract pattern instead

### Locking Awareness
Flag operations that acquire heavy locks on production tables:
- `ALTER TABLE ... ADD COLUMN ... NOT NULL DEFAULT ...` — non-blocking in Postgres 11+, blocking in older versions and MySQL (without default)
- `CREATE INDEX` — use `CREATE INDEX CONCURRENTLY` in Postgres to avoid table lock
- `ALTER TABLE ... ADD CONSTRAINT ... FOREIGN KEY` — can lock both tables
- `ALTER TABLE ... ALTER COLUMN TYPE` — full table rewrite in Postgres

### Reversibility
- Every migration should have a corresponding rollback (down migration)
- The rollback should actually undo what the up migration does — not just be empty
- Flag migrations where the rollback would lose data (e.g., `up` adds a column with computed data, `down` drops it)
- Flag irreversible operations without a documented migration strategy

### Transaction Safety
- Flag multi-statement migrations without transaction wrapping
- Flag DDL + DML mixed in the same transaction (some databases don't support transactional DDL)
- Flag data migrations that could fail partway through, leaving the database in an inconsistent state

---

## Index Management

### Missing Indexes
- Flag new queries with `WHERE` clauses on unindexed columns
- Flag `JOIN` operations on columns without indexes
- Flag `ORDER BY` on unindexed columns for large result sets
- Flag `FOREIGN KEY` columns without indexes (common performance pitfall)

### Index Changes
- Flag added indexes on large tables without a migration plan (`CREATE INDEX CONCURRENTLY` for Postgres)
- Flag composite indexes where column order doesn't match query patterns — the leftmost columns must match the `WHERE` clause
- Flag duplicate or redundant indexes (index on `(a, b)` already covers queries on `a` alone)
- Flag removed indexes — verify no queries or ORM-generated queries depend on them
- Flag partial indexes being used correctly (Postgres `WHERE` clause on index)

### Over-Indexing
- 🔵 Suggestion: Flag tables with >6-8 indexes — each index slows writes and uses storage
- Flag indexes on columns with very low cardinality (e.g., boolean, status enum with 3 values) — rarely useful

---

## Constraints & Integrity

### Foreign Keys
- Check foreign keys reference the correct table and column
- Check `ON DELETE` behavior is appropriate:
  - `CASCADE` — can accidentally delete large amounts of data
  - `SET NULL` — check that the column allows NULL
  - `RESTRICT` / `NO ACTION` — safest default, flag if missing
- Check `ON UPDATE` behavior — usually should be `CASCADE` for natural keys, `NO ACTION` for surrogate keys

### Other Constraints
- Flag missing `NOT NULL` on columns that should never be null based on business logic
- Flag missing `DEFAULT` values for new required columns on tables with existing data
- Flag `UNIQUE` constraints that could break on existing duplicate data
- Flag `CHECK` constraints — verify they won't reject existing valid data

---

## Query Review

### Performance
- 🟡 Warning: `SELECT *` — select only needed columns, especially with large TEXT/BLOB columns
- 🟡 Warning: Queries without `LIMIT` that could return unbounded results
- 🟡 Warning: `LIKE '%search%'` — leading wildcard prevents index usage. Suggest full-text search indexes (Postgres `tsvector`/`GIN`, MySQL `FULLTEXT`) or application-level search (Elasticsearch, Typesense)
- Flag correlated subqueries that could be rewritten as JOINs
- Flag missing `WHERE` clauses on `UPDATE` and `DELETE` — extremely dangerous
- Flag N+1 patterns: a query inside a loop. Use `JOIN`, subquery, or `WHERE IN (...)` instead
- Flag `DISTINCT` used to mask a bad join that produces duplicates
- Flag `ORDER BY RAND()` on large tables — full table scan

### Query Patterns in Application Code
- Flag string concatenation to build SQL — SQL injection risk, use parameterized queries
- Flag user input in `ORDER BY` or column names without an allowlist
- Flag dynamic table names from user input
- Flag large `IN (...)` lists (>1000 items) — consider temp tables or batching

---

## ORM-Specific Checks

### ORM-Specific (apply only to the ORM in use)
- **Prisma:** Flag missing `@@index` for `where` fields, `$queryRaw` with string concat, optional→required without migration, missing `$disconnect()` in Lambda
- **TypeORM:** Flag `synchronize: true` in production, eager relations in list queries (N+1), missing migrations
- **Knex:** Flag missing `.transacting(trx)` on multi-query ops, `.raw()` with string interpolation instead of bindings
- **Drizzle:** Flag schema changes without `drizzle-kit generate` migration

### General ORM
- Flag auto-generated migration files that haven't been reviewed
- Flag lazy-loaded relations in hot paths (N+1 risk)
- Flag ORM queries that fetch all columns when only a few are needed

---

## AWS RDS / Aurora Specifics (CloudFormation/SAM)

### Instance Configuration
- Flag missing `DeletionPolicy: Snapshot` on RDS instances — default `Delete` destroys data
- Flag `PubliclyAccessible: true` on production databases
- Flag missing `StorageEncrypted: true`
- Flag missing `MultiAZ` for production workloads
- Flag `BackupRetentionPeriod: 0` — disables automated backups
- Flag missing `EnablePerformanceInsights`

### Connectivity
- Flag RDS in a public subnet when it should be private
- Flag security group with `0.0.0.0/0` inbound on database port
- Flag missing VPC endpoints or NAT Gateway for Lambda → RDS connectivity
- Flag Lambda → RDS without RDS Proxy — Lambdas can exhaust the connection pool under load

### Aurora Specifics
- Flag Aurora Serverless v1 usage — v2 is significantly better for most use cases
- Flag missing read replicas for read-heavy workloads
- Flag `ServerlessV2ScalingConfiguration` min ACU set too low (cold start on scale-up)

---

## Connection Management

### Lambda + RDS
- 🟡 Warning: Direct RDS connections from Lambda without RDS Proxy or connection pooling — each Lambda invocation can open a new connection, exhausting `max_connections`
- Flag connection creation inside the handler (should be outside handler for reuse across warm invocations)
- Flag missing connection timeout settings

### Connection Pools
- Flag pool `max` set higher than the database's `max_connections / expected_instances`
- Flag pool `min` set to 0 in Lambda (creates overhead to re-establish)
- Flag missing idle timeout on connection pools
- Flag missing connection validation / health checks
