---
id: 946225b3-659d-4ebe-ba03-a48b7c940fb6
title: Linear Regression with scikit-learn
type: theory
estimatedMinutes: 25
order: 2
---

# Linear Regression with scikit-learn

**Use train_test_split, fit LinearRegression, and evaluate with R^2 and RMSE. Watch for data leakage; keep test data separate.**

---

## Linear Regression Basics

Linear regression models the relationship between features and a continuous target:

```
y = β₀ + β₁x₁ + β₂x₂ + ... + βₙxₙ
```

---

## Using scikit-learn

### Import Libraries

```python
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_squared_error, r2_score
```

### Load and Split Data

```python
# Load data
X = df[['feature1', 'feature2', 'feature3']]
y = df['target']

# Split into train/test
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)
```

### Train Model

```python
# Create and train model
model = LinearRegression()
model.fit(X_train, y_train)

# Make predictions
y_pred = model.predict(X_test)
```

### Evaluate

```python
# R-squared score
r2 = r2_score(y_test, y_pred)
print(f"R² Score: {r2:.3f}")

# RMSE
rmse = mean_squared_error(y_test, y_pred, squared=False)
print(f"RMSE: {rmse:.3f}")
```

---

## Evaluation Metrics

### R² (R-squared)

- Range: 0 to 1 (higher is better)
- 1.0 = perfect predictions
- 0.0 = model no better than mean

### RMSE (Root Mean Squared Error)

- Same units as target variable
- Lower is better
- Penalizes large errors

---

## Avoiding Data Leakage

**Never** use test data during training:

```python
# ❌ BAD: Scaling on all data
scaler.fit(X)  # Uses test data!

# ✓ GOOD: Scale only training data
scaler.fit(X_train)
X_train_scaled = scaler.transform(X_train)
X_test_scaled = scaler.transform(X_test)
```

---
