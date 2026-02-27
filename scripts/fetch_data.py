#!/usr/bin/env python3
"""Fetch stock data from Yahoo Finance and write to public/data/portfolio.json."""

import json
import os
from datetime import datetime

import yfinance as yf

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(SCRIPT_DIR)
CONFIG_PATH = os.path.join(PROJECT_DIR, "portfolio.config.json")
OUTPUT_PATH = os.path.join(PROJECT_DIR, "public", "data", "portfolio.json")

# Map Yahoo Finance quoteType to our asset classes
QUOTE_TYPE_MAP = {
    "EQUITY": "stock",
    "ETF": "etf",
    "MUTUALFUND": "fund",
    "CRYPTOCURRENCY": "crypto",
    "CURRENCY": "crypto",
    "INDEX": "etf",
    "FUTURE": "commodity",
    "OPTION": "other",
}


def detect_class(info):
    """Auto-detect asset class from Yahoo Finance info."""
    qt = info.get("quoteType", "").upper()
    return QUOTE_TYPE_MAP.get(qt, "other")


def fetch_data():
    with open(CONFIG_PATH) as f:
        config = json.load(f)

    tickers = [h["ticker"] for h in config["holdings"]]
    holdings_map = {h["ticker"]: h for h in config["holdings"]}

    # Download 1 year of history for all tickers at once
    raw = yf.download(tickers, period="1y", group_by="ticker", auto_adjust=True)

    holdings = []
    for ticker in tickers:
        try:
            t = yf.Ticker(ticker)
            info = t.info

            # Extract close prices
            if len(tickers) > 1:
                closes = raw[ticker]["Close"].dropna()
            else:
                closes = raw["Close"].dropna()

            if closes.empty:
                print(f"No data for {ticker}, skipping")
                continue

            current_price = float(closes.iloc[-1])
            previous_close = float(closes.iloc[-2]) if len(closes) > 1 else current_price
            day_change = current_price - previous_close
            day_change_pct = (day_change / previous_close) * 100 if previous_close else 0

            history = [
                {"date": date.strftime("%Y-%m-%d"), "close": round(float(price), 2)}
                for date, price in closes.items()
            ]

            h = holdings_map[ticker]
            asset_class = detect_class(info)

            holdings.append({
                "ticker": ticker,
                "name": info.get("shortName", ticker),
                "shares": h["shares"],
                "avgCost": h["avgCost"],
                "currency": h.get("currency", "USD"),
                "broker": h.get("broker", ""),
                "class": asset_class,
                "currentPrice": round(current_price, 2),
                "previousClose": round(previous_close, 2),
                "dayChange": round(day_change, 2),
                "dayChangePercent": round(day_change_pct, 2),
                "history": history,
            })
            print(f"  [{asset_class}] {ticker}: {current_price:.2f} ({info.get('quoteType', '?')})")

        except Exception as e:
            print(f"Error fetching {ticker}: {e}")
            continue

    output = {
        "lastUpdated": datetime.utcnow().isoformat() + "Z",
        "holdings": holdings,
    }

    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, "w") as f:
        json.dump(output, f, indent=2)

    print(f"\nUpdated {len(holdings)} holdings at {output['lastUpdated']}")


if __name__ == "__main__":
    fetch_data()
