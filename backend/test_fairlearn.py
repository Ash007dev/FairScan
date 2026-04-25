import numpy as np
from fairlearn.metrics import demographic_parity_difference

y_true = np.array([0, 1, 2, 0, 1, 2])
y_pred = np.array([0, 1, 2, 0, 1, 2])
sensitive = np.array(['A', 'B', 'A', 'B', 'A', 'B'])

try:
    dp_diff = demographic_parity_difference(y_true, y_pred, sensitive_features=sensitive)
    print("DP diff:", dp_diff)
except Exception as e:
    print("Fairlearn Error:", e)

