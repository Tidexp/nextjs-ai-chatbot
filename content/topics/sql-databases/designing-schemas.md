---
id: bb4da24c-3c65-429a-af10-927384efe4a8
title: Designing Schemas
type: theory
estimatedMinutes: 25
order: 1
---

# Designing Schemas

**Model entities and relationships, pick primary keys, and map cardinalities. Normalize to reduce anomalies.**

---

## Entity-Relationship Modeling

### Entities

Represent real-world objects:

- Users
- Products
- Orders

### Attributes

Properties of entities:

- User: id, name, email
- Product: id, name, price
- Order: id, date, total

### Relationships

Connections between entities:

- User places Order (1:Many)
- Order contains Products (Many:Many)

---

## Primary Keys

Unique identifier for each row:

```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    email TEXT UNIQUE NOT NULL
);
```

**Options:**

- Auto-increment integer
- UUID
- Natural key (e.g., email)

---

## Foreign Keys

Reference another table's primary key:

```sql
CREATE TABLE orders (
    id INTEGER PRIMARY KEY,
    user_id INTEGER,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

---

## Cardinality

### One-to-Many

```sql
-- One user, many orders
CREATE TABLE orders (
    id INTEGER PRIMARY KEY,
    user_id INTEGER REFERENCES users(id)
);
```

### Many-to-Many

```sql
-- Orders and Products (junction table)
CREATE TABLE order_items (
    order_id INTEGER REFERENCES orders(id),
    product_id INTEGER REFERENCES products(id),
    quantity INTEGER,
    PRIMARY KEY (order_id, product_id)
);
```

---

## Normalization

### First Normal Form (1NF)

- Atomic values (no arrays/lists)
- Each column has single value

### Second Normal Form (2NF)

- Must be in 1NF
- No partial dependencies

### Third Normal Form (3NF)

- Must be in 2NF
- No transitive dependencies

---
