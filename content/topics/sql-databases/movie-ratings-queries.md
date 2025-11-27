---
id: ac2107d7-89da-410c-8cbd-c26f8e6f6711
title: "Practice: Movie Ratings Queries"
type: exercise
estimatedMinutes: 30
order: 3
exercisePrompt: "Given tables movies(id, title, year) and ratings(movie_id, stars INT), write queries: (1) Top 5 highest-rated movies by average stars, (2) Movies from 2010+ with avg rating >= 4."
language: sql
starterCode: |
  -- Schema reference
  -- movies(id PK, title TEXT, year INT)
  -- ratings(movie_id FK -> movies.id, stars INT)
  -- Write your SELECT queries below
---

# Practice: Movie Ratings Queries

**Write SQL queries to analyze movie ratings data.**

---

## Database Schema

### movies table

```sql
CREATE TABLE movies (
    id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    year INTEGER
);
```

### ratings table

```sql
CREATE TABLE ratings (
    movie_id INTEGER,
    stars INTEGER CHECK(stars BETWEEN 1 AND 5),
    FOREIGN KEY (movie_id) REFERENCES movies(id)
);
```

---

## Task 1: Top 5 Highest-Rated Movies

Find the top 5 movies by average rating:

```sql
SELECT m.title, AVG(r.stars) as avg_rating
FROM movies m
JOIN ratings r ON m.id = r.movie_id
GROUP BY m.id, m.title
ORDER BY avg_rating DESC
LIMIT 5;
```

---

## Task 2: Recent Popular Movies

Find movies from 2010 or later with average rating >= 4:

```sql
SELECT m.title, m.year, AVG(r.stars) as avg_rating
FROM movies m
JOIN ratings r ON m.id = r.movie_id
WHERE m.year >= 2010
GROUP BY m.id, m.title, m.year
HAVING AVG(r.stars) >= 4
ORDER BY avg_rating DESC;
```

---
