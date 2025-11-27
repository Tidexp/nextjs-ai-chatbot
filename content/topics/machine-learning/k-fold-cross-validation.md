---
id: 98378953-322c-4966-aef5-a5491a5b8590
title: "Practice: K-Fold Cross-Validation"
type: exercise
estimatedMinutes: 40
order: 2
exercisePrompt: "Implement K-fold CV to compare two models (e.g., LogisticRegression vs. RandomForestClassifier) on a classification dataset; report mean accuracy and std."
language: python
starterCode: |
  import numpy as np
  from sklearn.model_selection import cross_val_score
  from sklearn.datasets import load_breast_cancer
  from sklearn.linear_model import LogisticRegression
  from sklearn.ensemble import RandomForestClassifier

  X, y = load_breast_cancer(return_X_y=True)
  models = {
      "logreg": LogisticRegression(max_iter=1000),
      "rf": RandomForestClassifier(n_estimators=200, random_state=42)
  }
  for name, clf in models.items():
      scores = cross_val_score(clf, X, y, cv=5, scoring="accuracy")
      print(name, f"mean={scores.mean():.3f}", f"std={scores.std():.3f}")
---

# Practice: K-Fold Cross-Validation

**Compare multiple models using cross-validation.**

---

## Cross-Validation

K-Fold CV splits data into K folds:

1. Train on K-1 folds
2. Test on remaining fold
3. Repeat K times
4. Average results

---

## Solution

```python
import numpy as np
from sklearn.model_selection import cross_val_score
from sklearn.datasets import load_breast_cancer
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier

# Load data
X, y = load_breast_cancer(return_X_y=True)

# Define models
models = {
    "Logistic Regression": LogisticRegression(max_iter=1000),
    "Random Forest": RandomForestClassifier(n_estimators=200, random_state=42)
}

# Compare models
for name, clf in models.items():
    scores = cross_val_score(clf, X, y, cv=5, scoring="accuracy")
    print(f"{name}:")
    print(f"  Mean Accuracy: {scores.mean():.3f}")
    print(f"  Std Dev: {scores.std():.3f}")
    print()
```

---

## Expected Output

```
Logistic Regression:
  Mean Accuracy: 0.953
  Std Dev: 0.019

Random Forest:
  Mean Accuracy: 0.965
  Std Dev: 0.012
```

---
