import pandas as pd
from sklearn.datasets import fetch_openml
from agents.stat_agent import run_stat_agent
import asyncio

async def main():
    credit_data = fetch_openml("credit-g", version=1, as_frame=True)
    df = credit_data.frame
    # convert categories to object to simulate read_csv
    for col in df.select_dtypes(include=['category']).columns:
        df[col] = df[col].astype('object')
    
    res = await run_stat_agent(df, "class")
    print(res["results_per_group"].get("personal_status", {}))

asyncio.run(main())
