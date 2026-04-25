import numpy as np
import pandas as pd

y_pred = np.array([0, 1, 1, 0, 1])
mask = pd.Series([True, False, True, False, False], index=['a', 'b', 'c', 'd', 'e'])

try:
    print("Test 1:", y_pred[mask].mean())
except Exception as e:
    print("Test 1 error:", e)

try:
    # If the index is integers but different from 0..4
    mask2 = pd.Series([True, False, True, False, False], index=[10, 11, 12, 13, 14])
    print("Test 2:", y_pred[mask2].mean())
except Exception as e:
    print("Test 2 error:", e)

