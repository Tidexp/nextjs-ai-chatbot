---
id: 503218f4-b144-4ee9-b155-488fce55d2b4
title: Aggregation and Grouping
type: theory
estimatedMinutes: 25
order: 2
---

# Aggregation and Grouping

**Use COUNT/SUM/AVG/MIN/MAX. GROUP BY groups rows; HAVING filters groups; be mindful of non-aggregated columns.**

---

## Aggregate Functions

### COUNT

```sql
SELECT COUNT(*) FROM users;
SELECT COUNT(DISTINCT city) FROM users;
```

### SUM

```sql
SELECT SUM(amount) FROM orders;
```

### AVG

```sql
SELECT AVG(price) FROM products;
```

### MIN and MAX

```sql
SELECT MIN(age), MAX(age) FROM users;
```

---

## GROUP BY

Group rows that share a value:

```sql
SELECT city, COUNT(*) as user_count
FROM users
GROUP BY city;
```

### Multiple Columns

```sql
SELECT city, state, COUNT(*) as count
FROM users
GROUP BY city, state;
```

---

## HAVING Clause

Filter grouped results:

```sql
SELECT city, COUNT(*) as user_count
FROM users
GROUP BY city
HAVING COUNT(*) > 10;
```

**Note:** WHERE filters rows before grouping, HAVING filters after.

---

## Common Patterns

### Sales by Category

```sql
SELECT category, SUM(sales) as total_sales
FROM products
GROUP BY category
ORDER BY total_sales DESC;
```

### Average by Group

```sql
SELECT department, AVG(salary) as avg_salary
FROM employees
GROUP BY department
HAVING AVG(salary) > 50000;
```

---
