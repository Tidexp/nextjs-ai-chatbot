---
id: 014b862e-1b27-44de-9a2d-6b983fd69952
title: "Practice: Normalize a Schema"
type: exercise
estimatedMinutes: 35
order: 2
exercisePrompt: "Given a wide table orders(order_id, customer_name, customer_email, product_name, product_price, ...), propose a normalized design with customers, products, and order_items. Create the CREATE TABLE DDL with PK/FK constraints."
language: sql
starterCode: |
  -- Write DDL statements for customers, products, orders, order_items here
---

# Practice: Normalize a Schema

**Transform a denormalized table into a properly normalized database design.**

---

## The Problem

Given this denormalized table:

```sql
orders_wide (
    order_id,
    order_date,
    customer_name,
    customer_email,
    customer_phone,
    product_name,
    product_price,
    quantity,
    total
)
```

**Issues:**

- Data redundancy (customer info repeated)
- Update anomalies
- Insertion anomalies
- Deletion anomalies

---

## Normalized Solution

### customers table

```sql
CREATE TABLE customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT
);
```

### products table

```sql
CREATE TABLE products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    price DECIMAL(10, 2) NOT NULL
);
```

### orders table

```sql
CREATE TABLE orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    order_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id)
);
```

### order_items table

```sql
CREATE TABLE order_items (
    order_id INTEGER,
    product_id INTEGER,
    quantity INTEGER NOT NULL DEFAULT 1,
    price DECIMAL(10, 2) NOT NULL,
    PRIMARY KEY (order_id, product_id),
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);
```

---

## Benefits

- ✓ No data redundancy
- ✓ Easy updates
- ✓ Data integrity enforced
- ✓ Flexible queries

---
