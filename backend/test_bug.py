import pandas as pd
from sklearn.datasets import fetch_openml
from agents.stat_agent import run_stat_agent
import asyncio

async def main():
    credit_data = fetch_openml("credit-g", version=1, as_frame=True)
    df = credit_data.frame
    
    # Simulate user upload - maybe Risk column is different?
    # Let's just print df.head() and classes
    print("Columns:", df.columns.tolist())
    print("Class unique:", df["class"].unique())

    # Try running stat agent
    res = await run_stat_agent(df, "class")
    print(res["results_per_group"])

asyncio.run(main())
