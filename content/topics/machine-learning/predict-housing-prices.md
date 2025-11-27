---
id: a4611a58-82ec-4880-a1f6-b5b1afa556d9
title: "Practice: Predict Housing Prices"
type: exercise
estimatedMinutes: 45
order: 3
exercisePrompt: "Using scikit-learn and a CSV of housing features (e.g., rooms, area, location), train a regression model and report RMSE on test data."
language: python
starterCode: |
  import pandas as pd
  from sklearn.model_selection import train_test_split
  from sklearn.linear_model import LinearRegression
  from sklearn.metrics import mean_squared_error

  # TODO: set your file path
  # df = pd.read_csv("housing.csv")
  # X = df.drop(columns=["price"]) ; y = df["price"]
  # X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
  # model = LinearRegression().fit(X_train, y_train)
  # preds = model.predict(X_test)
  # rmse = mean_squared_error(y_test, preds, squared=False)
  # print("RMSE:", rmse)
---

# Practice: Predict Housing Prices

**Build a regression model to predict house prices from features.**

---

## Dataset

Features might include:

- Number of rooms
- Square footage
- Location (zip code)
- Year built
- Number of bathrooms

Target: House price

---

## Solution

```python
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_squared_error, r2_score

# Load data
df = pd.read_csv("housing.csv")
X = df.drop(columns=["price"])
y = df["price"]

# Split data
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

# Train model
model = LinearRegression()
model.fit(X_train, y_train)

# Predict
y_pred = model.predict(X_test)

# Evaluate
rmse = mean_squared_error(y_test, y_pred, squared=False)
r2 = r2_score(y_test, y_pred)

print(f"RMSE: ${rmse:,.2f}")
print(f"R² Score: {r2:.3f}")

# Feature importance
for feature, coef in zip(X.columns, model.coef_):
    print(f"{feature}: {coef:.2f}")
```

---
