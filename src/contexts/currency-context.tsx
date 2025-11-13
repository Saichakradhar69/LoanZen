'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Currency = 'USD' | 'EUR' | 'GBP' | 'INR';

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  formatCurrency: (value: number) => string;
  formatCurrencyWithCode: (value: number, currencyCode: Currency) => string;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

const CURRENCY_LOCALE_MAP: Record<Currency, string> = {
  USD: 'en-US',
  EUR: 'en-US', // Using en-US locale with EUR currency code
  GBP: 'en-GB',
  INR: 'en-IN',
};

// Currency display names for better clarity
const CURRENCY_SYMBOLS: Record<Currency, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  INR: '₹',
};

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>('USD');

  // Load currency from localStorage on mount
  useEffect(() => {
    const savedCurrency = localStorage.getItem('loanzen_currency') as Currency | null;
    if (savedCurrency && ['USD', 'EUR', 'GBP', 'INR'].includes(savedCurrency)) {
      setCurrencyState(savedCurrency);
    }
  }, []);

  // Save currency to localStorage when it changes
  const setCurrency = (newCurrency: Currency) => {
    setCurrencyState(newCurrency);
    localStorage.setItem('loanzen_currency', newCurrency);
  };

  // Format currency based on selected currency
  const formatCurrency = (value: number): string => {
    return formatCurrencyWithCode(value, currency);
  };

  // Format currency with a specific currency code
  const formatCurrencyWithCode = (value: number, currencyCode: Currency): string => {
    const locale = CURRENCY_LOCALE_MAP[currencyCode];
    try {
      // Create formatter with explicit locale and currency
      const formatter = new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currencyCode,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
        numberingSystem: 'latn', // Force Latin numbering system
      });
      
      const formatted = formatter.format(value);
      
      // Double-check: if the formatted string contains unexpected currency symbols, fix it
      // This is a safety check in case browser locale interferes
      const expectedSymbol = CURRENCY_SYMBOLS[currencyCode];
      if (expectedSymbol && !formatted.includes(expectedSymbol) && !formatted.includes(currencyCode)) {
        // If the expected symbol is missing, manually format with the correct symbol
        const numberPart = value.toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
        return `${expectedSymbol}${numberPart}`;
      }
      
      return formatted;
    } catch (error) {
      // Fallback: manually format with correct symbol
      console.warn('Currency formatting error, using manual format:', error);
      const numberPart = value.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      return `${CURRENCY_SYMBOLS[currencyCode] || '$'}${numberPart}`;
    }
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, formatCurrency, formatCurrencyWithCode }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}

