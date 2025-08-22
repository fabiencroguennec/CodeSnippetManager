import { useState, useEffect } from 'react';
import { useLocalStorage } from './useLocalStorage';

export const useTheme = () => {
  const [darkMode, setDarkMode] = useLocalStorage('darkMode', false);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const themeClasses = darkMode ? {
    bg: 'bg-gray-900',
    cardBg: 'bg-gray-800',
    text: 'text-white',
    textSecondary: 'text-gray-300',
    border: 'border-gray-700',
    input: 'bg-gray-700 text-white border-gray-600',
    button: 'bg-blue-600 hover:bg-blue-700',
    consoleBg: 'bg-black'
  } : {
    bg: 'bg-gray-50',
    cardBg: 'bg-white',
    text: 'text-gray-800',
    textSecondary: 'text-gray-600',
    border: 'border-gray-300',
    input: 'bg-white text-gray-800 border-gray-300',
    button: 'bg-blue-500 hover:bg-blue-600',
    consoleBg: 'bg-gray-900'
  };

  return {
    darkMode,
    setDarkMode,
    themeClasses
  };
};