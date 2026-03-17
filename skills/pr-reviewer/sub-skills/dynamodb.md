# Sub-Skill: AWS DynamoDB Review

## File patterns
Applies to: files referencing DynamoDB table definitions in SAM/CloudFormation (`AWS::DynamoDB::Table`, `AWS::Serverless::SimpleTable`), CDK DynamoDB constructs, DynamoDB client code (`DynamoDBClient`, `DocumentClient`, `@aws-sdk/lib-dynamodb`, `@aws-sdk/client-dynamodb`), and any file with DynamoDB operations (`PutItem`, `GetItem`, `Query`, `Scan`, `UpdateItem`, `DeleteItem`, `BatchWriteItem`, `TransactWriteItems`)

---

## Table Design

### Key Schema
- 🔴 Critical: Changing partition key (PK) or sort key (SK) on an existing table — this requires table recreation and full data migration. There is no in-place key change in DynamoDB.
- 🔴 Critical: Partition key with low cardinality (e.g., `status`, `type`, `boolean` — fewer than ~100 distinct values across millions of items) — creates hot partitions and throttling
- 🟡 Warning: Sort key not leveraging hierarchical or composite patterns when the access patterns call for it (e.g., using `SK: timestamp` when `SK: STATUS#TIMESTAMP` would support multiple query patterns)
- Flag tables without a sort key when the access patterns clearly need range queries

### Single-Table Design
- If the project uses single-table design, verify:
  - PK/SK patterns are consistent (e.g., `PK: USER#<id>`, `SK: METADATA`, `SK: ORDER#<orderId>`)
  - Entity type attribute is present for filtering/identification
  - GSI overloading is intentional and documented
  - No entity's PK pattern clashes with another entity's pattern
- If the project uses multi-table design, that's fine — but flag if a new table is introduced for data that clearly belongs in an existing table's access pattern

### Global Secondary Indexes (GSIs)
- 🟡 Warning: Adding a GSI on a large existing table — DynamoDB backfills asynchronously, consumes write capacity, and can take hours
- Flag GSIs where the projected key schema doesn't match the intended query pattern
- Flag GSI with `ProjectionType: ALL` on large items — wastes storage and write throughput; use `KEYS_ONLY` or `INCLUDE` with specific attributes
- Flag tables with >20 GSIs — this is the hard limit per table. Plan GSI usage carefully
- Flag GSI partition key with low cardinality (same hot-partition risk as the base table)
- Flag sparse GSIs — if only some items have the GSI key attributes, only those items are indexed. Check if the GSI key attribute is conditionally present by design (filtering pattern) or accidentally missing on some writes

### Local Secondary Indexes (LSIs)
- 🔴 Critical: Attempting to add an LSI to an existing table — LSIs can only be defined at table creation time
- Flag LSI usage when a GSI would be more flexible
- Flag tables with LSIs that are approaching the 10GB per partition key limit

---

## Capacity & Cost

### Billing Mode
- Flag missing `BillingMode` — defaults to `PROVISIONED` which can be expensive if auto-scaling isn't configured
- Flag `PAY_PER_REQUEST` (on-demand) for steady-state high-throughput tables — provisioned with auto-scaling is often cheaper
- Flag `PROVISIONED` without auto-scaling configuration (`AWS::ApplicationAutoScaling::ScalableTarget`)
- 🟡 Warning: Switching from `PAY_PER_REQUEST` → `PROVISIONED` requires careful capacity planning

### GSI Capacity
- Flag GSIs on provisioned tables without their own auto-scaling — GSI throttling throttles the base table too
- Flag GSI write capacity significantly lower than base table write capacity when the GSI key is present on most items

---

## DynamoDB Client Code

### Read Operations
- 🟡 Warning: `Scan` operation used when `Query` would work — Scans read every item in the table and are expensive
- Flag `Scan` without `Limit` — can consume all provisioned capacity in one call
- Flag `Scan` with `FilterExpression` as the only data-narrowing mechanism — filter happens after read, so you still pay for the full scan
- Flag `Query` without `Limit` when result set could be large — use pagination
- Flag missing `ExpressionAttributeNames` / `ExpressionAttributeValues` (using raw values in expressions)
- Flag `ConsistentRead: true` unless strong consistency is actually needed — it costs double the RCU

### Write Operations
- Flag `PutItem` used where `UpdateItem` would be more appropriate (PutItem overwrites the entire item)
- Flag `UpdateItem` without a `ConditionExpression` for optimistic locking when concurrent writes are possible
- Flag `BatchWriteItem` without retry logic for `UnprocessedItems` — DynamoDB can return unprocessed items on throttling
- Flag `TransactWriteItems` with >25 items — the hard limit is 25 items per `TransactWriteItems` call
- Flag writes that include the full item when only one attribute is changing (use UpdateExpression)

### Error Handling
- 🔴 Critical: No retry logic for `ProvisionedThroughputExceededException` — use exponential backoff or the AWS SDK's built-in retry
- Flag missing error handling for `ConditionalCheckFailedException` when using condition expressions
- Flag missing error handling for `TransactionCanceledException` with appropriate conflict resolution
- Flag `ItemCollectionSizeLimitExceededException` not handled for tables with LSIs

### Batch Operations
- Flag `BatchGetItem` without handling `UnprocessedKeys` in the response
- Flag `BatchWriteItem` without handling `UnprocessedItems` in the response
- Flag batch operations exceeding per-call limits without chunking (BatchGetItem: 100 keys, BatchWriteItem: 25 requests)

---

## Access Patterns

### Pattern Validation
- When new DynamoDB operations are added, verify the access pattern is supported by the existing key schema and indexes
- Flag operations that require a `Scan` when a GSI could be added to support the pattern as a `Query`
- Flag `Query` operations using `FilterExpression` to narrow results to a small subset — the key design likely needs improvement
- Flag access patterns that fetch a single item but use `Query` instead of `GetItem`

### Pagination
- Flag `Query` or `Scan` operations that don't handle `LastEvaluatedKey` for pagination
- Flag UI/API endpoints that return all results without pagination when the data set can grow unbounded

---

## TTL & Data Lifecycle

- Flag tables storing event/log data without a TTL attribute configured — data will grow indefinitely
- Flag TTL attribute set but not populated on new items being written
- Flag reliance on TTL for exact-time deletion — DynamoDB TTL typically deletes within 48 hours, not immediately

---

## Streams & Event Processing

- Flag DynamoDB Streams enabled without a consumer — unnecessary cost
- Flag Stream consumers without error handling for partial batch failures (`ReportBatchItemFailures`)
- Flag missing `MaximumRetryAttempts` and `BisectBatchOnFunctionError` on stream event source mappings
- Flag consumers that process `INSERT`, `MODIFY`, and `REMOVE` events identically when they should differ

---

## CloudFormation / SAM Specifics

- 🔴 Critical: Flag `DeletionPolicy` missing on DynamoDB tables — defaults to `Delete`, which destroys data on stack deletion
- 🔴 Critical: Flag any change that causes table **replacement** (key schema change, table name change, LSI change)
- Flag `PointInTimeRecoverySpecification: PointInTimeRecoveryEnabled` not set to `true`
- Flag `SSESpecification` not configured (encryption at rest)
- Flag `TableName` hardcoded instead of using `!Sub` or letting CloudFormation auto-generate — hardcoded names prevent stack updates that require replacement
