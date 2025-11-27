---
id: 2233dacc-a60a-49fa-9968-196a61187ad9
title: Evaluation Metrics Overview
type: theory
estimatedMinutes: 25
order: 1
---

# Evaluation Metrics Overview

**Match metrics to problems: accuracy/F1 for classification; RMSE/MAE/R^2 for regression. Use confusion matrix to inspect errors.**

---

## Classification Metrics

### Accuracy

Percentage of correct predictions:

```python
from sklearn.metrics import accuracy_score
accuracy = accuracy_score(y_true, y_pred)
```

**When to use:** Balanced datasets

---

### Precision, Recall, F1-Score

```python
from sklearn.metrics import precision_score, recall_score, f1_score

precision = precision_score(y_true, y_pred)
recall = recall_score(y_true, y_pred)
f1 = f1_score(y_true, y_pred)
```

- **Precision:** Of predicted positives, how many are correct?
- **Recall:** Of actual positives, how many did we find?
- **F1-Score:** Harmonic mean of precision and recall

---

### Confusion Matrix

```python
from sklearn.metrics import confusion_matrix, ConfusionMatrixDisplay

cm = confusion_matrix(y_true, y_pred)
print(cm)

# Visualize
disp = ConfusionMatrixDisplay(confusion_matrix=cm)
disp.plot()
```

---

## Regression Metrics

### Mean Absolute Error (MAE)

```python
from sklearn.metrics import mean_absolute_error
mae = mean_absolute_error(y_true, y_pred)
```

### Root Mean Squared Error (RMSE)

```python
from sklearn.metrics import mean_squared_error
rmse = mean_squared_error(y_true, y_pred, squared=False)
```

### R² Score

```python
from sklearn.metrics import r2_score
r2 = r2_score(y_true, y_pred)
```

---
