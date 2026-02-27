#!/usr/bin/env python3
"""Fetch stock data from Yahoo Finance and write to public/data/portfolio.json."""

import json
import os
import re
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

ISIN_RE = re.compile(r"^[A-Z]{2}[A-Z0-9]{9}[0-9]$")
# Standard Yahoo ticker: short, uppercase alphanum with optional . or -
TICKER_RE = re.compile(r"^[A-Z0-9][A-Z0-9.\-]{0,11}$")


def detect_class(info):
    """Auto-detect asset class from Yahoo Finance info."""
    qt = info.get("quoteType", "").upper()
    return QUOTE_TYPE_MAP.get(qt, "other")


def search_yahoo(query):
    """Search Yahoo Finance for any query (name, ISIN, partial ticker).
    Returns (symbol, name) or (None, None)."""
    try:
        results = yf.Search(query)
        quotes = results.quotes if hasattr(results, "quotes") else []
        if quotes:
            best = quotes[0]
            return best.get("symbol"), best.get("longname") or best.get("shortname")
    except Exception as e:
        print(f"  Search failed for '{query}': {e}")
    return None, None


def needs_resolution(ticker):
    """Check if a ticker needs search resolution (ISIN or product name)."""
    if ISIN_RE.match(ticker):
        return True
    if not TICKER_RE.match(ticker):
        return True  # Looks like a product name (has spaces, lowercase, etc.)
    return False


def fetch_data():
    with open(CONFIG_PATH) as f:
        config = json.load(f)

    holdings_map = {h["ticker"]: h for h in config["holdings"]}

    # Resolve ISINs and product names to Yahoo symbols before bulk download
    resolved_symbols = {}  # original input -> yahoo symbol
    resolved_names = {}    # original input -> resolved name
    yf_tickers = []        # list of Yahoo-compatible symbols for download

    for h in config["holdings"]:
        ticker = h["ticker"]
        if needs_resolution(ticker):
            symbol, name = search_yahoo(ticker)
            if symbol:
                print(f"  '{ticker}' -> {symbol} ({name})")
                resolved_symbols[ticker] = symbol
                if name:
                    resolved_names[ticker] = name
                yf_tickers.append(symbol)
            else:
                print(f"  '{ticker}': could not resolve, skipping")
        else:
            yf_tickers.append(ticker)

    # Download 1 year of history for all tickers at once
    raw = yf.download(yf_tickers, period="1y", group_by="ticker", auto_adjust=True)

    holdings = []
    for orig_ticker in holdings_map:
        try:
            # Use resolved symbol for ISINs
            yf_symbol = resolved_symbols.get(orig_ticker, orig_ticker)

            t = yf.Ticker(yf_symbol)
            info = t.info

            # Extract close prices
            if len(yf_tickers) > 1:
                closes = raw[yf_symbol]["Close"].dropna()
            else:
                closes = raw["Close"].dropna()

            if closes.empty:
                print(f"No data for {orig_ticker} ({yf_symbol}), skipping")
                continue

            current_price = float(closes.iloc[-1])
            previous_close = float(closes.iloc[-2]) if len(closes) > 1 else current_price
            day_change = current_price - previous_close
            day_change_pct = (day_change / previous_close) * 100 if previous_close else 0

            history = [
                {"date": date.strftime("%Y-%m-%d"), "close": round(float(price), 2)}
                for date, price in closes.items()
            ]

            h = holdings_map[orig_ticker]
            asset_class = detect_class(info)

            # Use resolved ISIN name if available, otherwise Yahoo name
            display_name = resolved_names.get(orig_ticker) or info.get("shortName", orig_ticker)

            holdings.append({
                "ticker": orig_ticker,  # keep original ISIN/ticker as key
                "name": display_name,
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
            print(f"  [{asset_class}] {orig_ticker}: {current_price:.2f} ({info.get('quoteType', '?')})")

        except Exception as e:
            print(f"Error fetching {orig_ticker}: {e}")
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
