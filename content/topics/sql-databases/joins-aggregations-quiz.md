---
id: c02d6201-5f6b-41fe-b8b1-83dde002431d
title: "Quiz: Joins & Aggregations"
type: quiz
estimatedMinutes: 10
order: 3
content: |
  Sample questions:
  1) Difference between WHERE and HAVING?
  2) Effect of LEFT JOIN when right side is missing?
  3) Purpose of GROUP BY?
---

# Quiz: Joins & Aggregations

**Test your SQL knowledge on joins and aggregate functions.**

---

## Question 1: WHERE vs HAVING

**What's the difference between WHERE and HAVING?**

<details>
<summary>Show Answer</summary>

- **WHERE**: Filters rows **before** grouping
- **HAVING**: Filters groups **after** aggregation

```sql
-- WHERE filters individual rows
SELECT city, COUNT(*)
FROM users
WHERE age >= 18
GROUP BY city;

-- HAVING filters grouped results
SELECT city, COUNT(*) as count
FROM users
GROUP BY city
HAVING COUNT(*) > 10;
```

</details>

---

## Question 2: LEFT JOIN Behavior

**What happens in a LEFT JOIN when the right table has no match?**

<details>
<summary>Show Answer</summary>

The row from the left table is still included, with NULL values for right table columns.

```sql
SELECT u.name, o.order_date
FROM users u
LEFT JOIN orders o ON u.id = o.user_id;

-- If user has no orders:
-- name: "Alice", order_date: NULL
```

</details>

---

## Question 3: GROUP BY Purpose

**What does GROUP BY do?**

<details>
<summary>Show Answer</summary>

GROUP BY combines rows that share the same value(s) in specified column(s), allowing aggregate functions to be applied to each group.

```sql
-- Without GROUP BY: one result
SELECT COUNT(*) FROM users;

-- With GROUP BY: one result per city
SELECT city, COUNT(*)
FROM users
GROUP BY city;
```

</details>

---
