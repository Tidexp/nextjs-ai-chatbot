---
id: b4170a68-570a-4310-a0d5-b5b4fc8f6e32
title: SELECT Basics
type: theory
estimatedMinutes: 25
order: 2
---

# SELECT Basics

**SELECT chooses columns; FROM chooses tables; WHERE filters rows; ORDER BY sorts; LIMIT trims result size.**

---

## The SELECT Statement

The SELECT statement retrieves data from a database:

```sql
SELECT column1, column2
FROM table_name;
```

---

## Select All Columns

Use `*` to select all columns:

```sql
SELECT * FROM users;
```

---

## Select Specific Columns

```sql
SELECT name, email FROM users;
```

---

## WHERE Clause

Filter results with WHERE:

```sql
SELECT * FROM users
WHERE age >= 18;
```

### Comparison Operators

| Operator     | Description           |
| ------------ | --------------------- |
| `=`          | Equal                 |
| `!=` or `<>` | Not equal             |
| `>`          | Greater than          |
| `<`          | Less than             |
| `>=`         | Greater than or equal |
| `<=`         | Less than or equal    |

---

## ORDER BY

Sort results:

```sql
SELECT * FROM users
ORDER BY age DESC;
```

- `ASC`: Ascending (default)
- `DESC`: Descending

---

## LIMIT

Restrict number of results:

```sql
SELECT * FROM users
LIMIT 10;
```

---

## Aliases

Rename columns or tables:

```sql
SELECT name AS full_name, age AS years_old
FROM users AS u;
```

---
