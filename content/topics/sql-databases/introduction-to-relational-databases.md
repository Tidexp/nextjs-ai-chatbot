---
id: b29ebbf8-9e08-4729-bd03-6f3a6370680c
title: Introduction to Relational Databases
type: introduction
estimatedMinutes: 12
order: 1
---

# Introduction to Relational Databases

**Relational databases store data in tables with defined relationships. SQL is the language to query and manage these structures.**

---

## What is a Relational Database?

A relational database organizes data into tables (relations) with rows and columns. Each table represents an entity, and relationships connect tables together.

### Key Concepts

- **Table**: A collection of related data organized in rows and columns
- **Row**: A single record in a table
- **Column**: A field or attribute of the data
- **Primary Key**: Unique identifier for each row
- **Foreign Key**: Reference to a primary key in another table

---

## Why Use Relational Databases?

- **Data Integrity**: Constraints ensure data accuracy
- **Relationships**: Connect related data across tables
- **Query Power**: SQL provides flexible data retrieval
- **ACID Properties**: Atomicity, Consistency, Isolation, Durability
- **Scalability**: Handle large amounts of structured data

---

## Common Database Systems

- **MySQL**: Popular open-source database
- **PostgreSQL**: Advanced open-source database
- **SQLite**: Lightweight, serverless database
- **Microsoft SQL Server**: Enterprise database
- **Oracle Database**: High-performance enterprise solution

---

## What is SQL?

SQL (Structured Query Language) is the standard language for working with relational databases. It allows you to:

- **Query data**: SELECT statements
- **Modify data**: INSERT, UPDATE, DELETE
- **Define structure**: CREATE, ALTER, DROP
- **Control access**: GRANT, REVOKE

---

## Example Table

```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    age INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---
