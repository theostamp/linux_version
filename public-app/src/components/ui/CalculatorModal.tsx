'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calculator, RotateCcw } from 'lucide-react';

interface CalculatorModalProps {
  children?: React.ReactNode;
}

export const CalculatorModal: React.FC<CalculatorModalProps> = ({ children }) => {
  const [display, setDisplay] = useState('0');
  const [previousValue, setPreviousValue] = useState<number | null>(null);
  const [operation, setOperation] = useState<string | null>(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);

  const clearAll = () => {
    setDisplay('0');
    setPreviousValue(null);
    setOperation(null);
    setWaitingForOperand(false);
  };

  const inputDigit = (digit: string) => {
    if (waitingForOperand) {
      setDisplay(digit);
      setWaitingForOperand(false);
    } else {
      setDisplay(display === '0' ? digit : display + digit);
    }
  };

  const inputDecimal = () => {
    if (waitingForOperand) {
      setDisplay('0.');
      setWaitingForOperand(false);
      return;
    }

    if (display.indexOf('.') === -1) {
      setDisplay(display + '.');
    }
  };

  const performOperation = (nextOperation: string) => {
    const inputValue = parseFloat(display);

    if (previousValue === null) {
      setPreviousValue(inputValue);
    } else if (operation) {
      const currentValue = previousValue || 0;
      const newValue = calculate(currentValue, inputValue, operation);

      setDisplay(String(newValue));
      setPreviousValue(newValue);
    }

    setWaitingForOperand(true);
    setOperation(nextOperation);
  };

  const calculate = (firstValue: number, secondValue: number, op: string): number => {
    switch (op) {
      case '+':
        return firstValue + secondValue;
      case '-':
        return firstValue - secondValue;
      case '×':
        return firstValue * secondValue;
      case '÷':
        return firstValue / secondValue;
      default:
        return secondValue;
    }
  };

  const handleEquals = () => {
    if (!previousValue || !operation) return;

    const inputValue = parseFloat(display);
    const newValue = calculate(previousValue, inputValue, operation);

    setDisplay(String(newValue));
    setPreviousValue(null);
    setOperation(null);
    setWaitingForOperand(true);
  };

  const handlePercentage = () => {
    const currentValue = parseFloat(display);
    const newValue = currentValue / 100;
    setDisplay(String(newValue));
  };

  const handlePlusMinus = () => {
    const currentValue = parseFloat(display);
    const newValue = -currentValue;
    setDisplay(String(newValue));
  };

  const formatDisplay = (value: string) => {
    const num = parseFloat(value);
    if (isNaN(num)) return '0';
    
    if (Number.isInteger(num)) {
      return num.toString();
    }
    
    return num.toFixed(2);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            Αριθμομηχανή
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Αριθμομηχανή
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Display */}
          <div className="bg-gray-100 p-4 rounded-lg">
            <div className="text-right text-sm text-gray-500 mb-1">
              {previousValue !== null && operation && (
                `${previousValue} ${operation}`
              )}
            </div>
            <div className="text-right text-2xl font-mono font-bold">
              {formatDisplay(display)}
            </div>
          </div>

          {/* Calculator Buttons */}
          <div className="grid grid-cols-4 gap-2">
            {/* First Row */}
            <Button
              variant="outline"
              onClick={clearAll}
              className="col-span-2 h-12 text-sm font-medium"
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              C
            </Button>
            <Button
              variant="outline"
              onClick={handlePlusMinus}
              className="h-12 text-sm font-medium"
            >
              +/-
            </Button>
            <Button
              variant="outline"
              onClick={handlePercentage}
              className="h-12 text-sm font-medium"
            >
              %
            </Button>

            {/* Second Row */}
            <Button
              variant="outline"
              onClick={() => performOperation('÷')}
              className="h-12 text-sm font-medium bg-orange-100 text-orange-700 hover:bg-orange-200"
            >
              ÷
            </Button>
            <Button
              variant="outline"
              onClick={() => inputDigit('7')}
              className="h-12 text-sm font-medium"
            >
              7
            </Button>
            <Button
              variant="outline"
              onClick={() => inputDigit('8')}
              className="h-12 text-sm font-medium"
            >
              8
            </Button>
            <Button
              variant="outline"
              onClick={() => inputDigit('9')}
              className="h-12 text-sm font-medium"
            >
              9
            </Button>

            {/* Third Row */}
            <Button
              variant="outline"
              onClick={() => performOperation('×')}
              className="h-12 text-sm font-medium bg-orange-100 text-orange-700 hover:bg-orange-200"
            >
              ×
            </Button>
            <Button
              variant="outline"
              onClick={() => inputDigit('4')}
              className="h-12 text-sm font-medium"
            >
              4
            </Button>
            <Button
              variant="outline"
              onClick={() => inputDigit('5')}
              className="h-12 text-sm font-medium"
            >
              5
            </Button>
            <Button
              variant="outline"
              onClick={() => inputDigit('6')}
              className="h-12 text-sm font-medium"
            >
              6
            </Button>

            {/* Fourth Row */}
            <Button
              variant="outline"
              onClick={() => performOperation('-')}
              className="h-12 text-sm font-medium bg-orange-100 text-orange-700 hover:bg-orange-200"
            >
              -
            </Button>
            <Button
              variant="outline"
              onClick={() => inputDigit('1')}
              className="h-12 text-sm font-medium"
            >
              1
            </Button>
            <Button
              variant="outline"
              onClick={() => inputDigit('2')}
              className="h-12 text-sm font-medium"
            >
              2
            </Button>
            <Button
              variant="outline"
              onClick={() => inputDigit('3')}
              className="h-12 text-sm font-medium"
            >
              3
            </Button>

            {/* Fifth Row */}
            <Button
              variant="outline"
              onClick={() => performOperation('+')}
              className="h-12 text-sm font-medium bg-orange-100 text-orange-700 hover:bg-orange-200"
            >
              +
            </Button>
            <Button
              variant="outline"
              onClick={() => inputDigit('0')}
              className="h-12 text-sm font-medium col-span-2"
            >
              0
            </Button>
            <Button
              variant="outline"
              onClick={inputDecimal}
              className="h-12 text-sm font-medium"
            >
              .
            </Button>

            {/* Equals Button */}
            <Button
              onClick={handleEquals}
              className="h-12 text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 col-span-4"
            >
              =
            </Button>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2 pt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const result = parseFloat(display) * 1.24;
                setDisplay(String(result));
              }}
              className="flex-1 text-xs"
            >
              +24% ΦΠΑ
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const result = parseFloat(display) / 1.24;
                setDisplay(String(result));
              }}
              className="flex-1 text-xs"
            >
              -24% ΦΠΑ
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const result = parseFloat(display) * 0.1;
                setDisplay(String(result));
              }}
              className="flex-1 text-xs"
            >
              10%
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

