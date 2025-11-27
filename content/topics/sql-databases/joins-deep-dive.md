---
id: 69075f7e-25bf-46fc-bfc9-5a5235be4635
title: Joins Deep Dive
type: theory
estimatedMinutes: 25
order: 1
---

# Joins Deep Dive

**INNER JOIN returns matches in both tables; LEFT JOIN preserves left rows. Practice join conditions on keys and understand duplicate rows.**

---

## Types of Joins

### INNER JOIN

Returns only matching rows from both tables:

```sql
SELECT users.name, orders.order_date
FROM users
INNER JOIN orders ON users.id = orders.user_id;
```

### LEFT JOIN

Returns all rows from left table, matching rows from right:

```sql
SELECT users.name, orders.order_date
FROM users
LEFT JOIN orders ON users.id = orders.user_id;
```

### RIGHT JOIN

Returns all rows from right table, matching rows from left:

```sql
SELECT users.name, orders.order_date
FROM users
RIGHT JOIN orders ON users.id = orders.user_id;
```

### FULL OUTER JOIN

Returns all rows when there's a match in either table:

```sql
SELECT users.name, orders.order_date
FROM users
FULL OUTER JOIN orders ON users.id = orders.user_id;
```

---

## Join Conditions

Always specify the join condition:

```sql
-- Good
SELECT * FROM users u
JOIN orders o ON u.id = o.user_id;

-- Bad (Cartesian product!)
SELECT * FROM users u, orders o;
```

---

## Multiple Joins

Chain multiple joins together:

```sql
SELECT
    u.name,
    o.order_date,
    p.product_name
FROM users u
JOIN orders o ON u.id = o.user_id
JOIN products p ON o.product_id = p.id;
```

---
