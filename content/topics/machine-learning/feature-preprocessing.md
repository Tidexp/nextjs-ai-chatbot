---
id: 14e37866-5018-4824-af08-31842d984571
title: Feature Preprocessing
type: theory
estimatedMinutes: 25
order: 1
---

# Feature Preprocessing

**Impute missing values, scale numeric features, and one-hot encode categorical variables. Use ColumnTransformer and pipelines.**

---

## Why Preprocessing?

Machine learning models require clean, numeric data:

- Handle missing values
- Scale features to similar ranges
- Encode categorical variables
- Transform skewed distributions

---

## Handling Missing Values

```python
from sklearn.impute import SimpleImputer

# Numeric: fill with mean
imputer = SimpleImputer(strategy='mean')
X_imputed = imputer.fit_transform(X)

# Categorical: fill with most frequent
imputer = SimpleImputer(strategy='most_frequent')
```

---

## Scaling Features

```python
from sklearn.preprocessing import StandardScaler, MinMaxScaler

# Z-score normalization (mean=0, std=1)
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

# Min-Max scaling (0 to 1)
scaler = MinMaxScaler()
X_scaled = scaler.fit_transform(X)
```

---

## Encoding Categorical Variables

```python
from sklearn.preprocessing import OneHotEncoder, LabelEncoder

# One-hot encoding (for nominal categories)
encoder = OneHotEncoder(handle_unknown='ignore')
X_encoded = encoder.fit_transform(X[['category']])

# Label encoding (for ordinal categories)
encoder = LabelEncoder()
X['category_encoded'] = encoder.fit_transform(X['category'])
```

---

## ColumnTransformer

Process different columns differently:

```python
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.impute import SimpleImputer

numeric_features = ['age', 'income']
categorical_features = ['city', 'occupation']

preprocessor = ColumnTransformer(
    transformers=[
        ('num', StandardScaler(), numeric_features),
        ('cat', OneHotEncoder(), categorical_features)
    ])

X_transformed = preprocessor.fit_transform(X)
```

---

## Pipelines

Chain preprocessing and model training:

```python
from sklearn.pipeline import Pipeline
from sklearn.linear_model import LogisticRegression

pipeline = Pipeline([
    ('preprocessor', preprocessor),
    ('classifier', LogisticRegression())
])

# Fit pipeline
pipeline.fit(X_train, y_train)

# Predict
y_pred = pipeline.predict(X_test)
```

---
