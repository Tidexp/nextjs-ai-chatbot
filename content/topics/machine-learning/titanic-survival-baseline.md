---
id: 48088001-bea1-4ba7-a33a-8ee23e30ce21
title: "Project: Titanic Survival Baseline"
type: project
estimatedMinutes: 55
order: 2
projectBrief: "Build a baseline classifier for Titanic survival. Tasks: clean data, encode categoricals, scale numerics, train a model, and report accuracy/F1 via CV."
language: python
starterCode: |
  import pandas as pd
  from sklearn.compose import ColumnTransformer
  from sklearn.pipeline import Pipeline
  from sklearn.preprocessing import OneHotEncoder, StandardScaler
  from sklearn.impute import SimpleImputer
  from sklearn.linear_model import LogisticRegression
  from sklearn.model_selection import cross_val_score

  # df = pd.read_csv("titanic.csv")
  # X = df.drop(columns=["Survived"]) ; y = df["Survived"]
  # num_cols = X.select_dtypes(include=["int64","float64"]).columns
  # cat_cols = X.select_dtypes(include=["object","category"]).columns
  # pre = ColumnTransformer([
  #   ("num", Pipeline([("impute", SimpleImputer()), ("scale", StandardScaler())]), num_cols),
  #   ("cat", Pipeline([("impute", SimpleImputer(strategy="most_frequent")), ("oh", OneHotEncoder(handle_unknown="ignore"))]), cat_cols)
  # ])
  # clf = Pipeline([("pre", pre), ("model", LogisticRegression(max_iter=1000))])
  # scores = cross_val_score(clf, X, y, cv=5, scoring="f1")
  # print("F1 mean:", scores.mean())
---

# Project: Titanic Survival Baseline

**Build a complete machine learning pipeline for the classic Titanic dataset.**

---

## Project Overview

Predict passenger survival on the Titanic using:

- Data cleaning
- Feature engineering
- Preprocessing pipeline
- Cross-validation
- Model evaluation

---

## Complete Solution

```python
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import cross_val_score, train_test_split
from sklearn.metrics import classification_report, confusion_matrix

# Load data
df = pd.read_csv("titanic.csv")
X = df.drop(columns=["Survived"])
y = df["Survived"]

# Identify column types
num_cols = X.select_dtypes(include=["int64", "float64"]).columns.tolist()
cat_cols = X.select_dtypes(include=["object", "category"]).columns.tolist()

# Create preprocessing pipeline
numeric_transformer = Pipeline(steps=[
    ('imputer', SimpleImputer(strategy='median')),
    ('scaler', StandardScaler())
])

categorical_transformer = Pipeline(steps=[
    ('imputer', SimpleImputer(strategy='most_frequent')),
    ('onehot', OneHotEncoder(handle_unknown='ignore'))
])

preprocessor = ColumnTransformer(
    transformers=[
        ('num', numeric_transformer, num_cols),
        ('cat', categorical_transformer, cat_cols)
    ])

# Create full pipeline
clf = Pipeline(steps=[
    ('preprocessor', preprocessor),
    ('classifier', LogisticRegression(max_iter=1000))
])

# Cross-validation
f1_scores = cross_val_score(clf, X, y, cv=5, scoring='f1')
acc_scores = cross_val_score(clf, X, y, cv=5, scoring='accuracy')

print(f"F1 Score: {f1_scores.mean():.3f} (+/- {f1_scores.std():.3f})")
print(f"Accuracy: {acc_scores.mean():.3f} (+/- {acc_scores.std():.3f})")

# Train final model
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
clf.fit(X_train, y_train)
y_pred = clf.predict(X_test)

# Evaluation
print("\nClassification Report:")
print(classification_report(y_test, y_pred))

print("\nConfusion Matrix:")
print(confusion_matrix(y_test, y_pred))
```

---
