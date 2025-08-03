import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { rest } from 'msw';
import { setupServer } from 'msw/node';

// Import components to test
import { ExpenseForm } from '../components/financial/ExpenseForm';
import { PaymentForm } from '../components/financial/PaymentForm';
import { MeterReadingForm } from '../components/financial/MeterReadingForm';
import { FinancialDashboard } from '../components/financial/FinancialDashboard';

// Mock API responses
const server = setupServer(
  // Mock expense list endpoint
  rest.get('/api/financial/expenses/', (req, res, ctx) => {
    return res(
      ctx.json([
        {
          id: 1,
          title: 'Test Expense',
          amount: '1000.00',
          category: 'ELECTRICITY',
          distribution_type: 'EQUAL',
          date: '2024-01-15',
          description: 'Test expense'
        }
      ])
    );
  }),

  // Mock payment list endpoint
  rest.get('/api/financial/payments/', (req, res, ctx) => {
    return res(
      ctx.json([
        {
          id: 1,
          apartment: 1,
          amount: '300.00',
          payment_method: 'CASH',
          date: '2024-01-15',
          description: 'Test payment'
        }
      ])
    );
  }),

  // Mock meter readings endpoint
  rest.get('/api/financial/meter-readings/', (req, res, ctx) => {
    return res(
      ctx.json([
        {
          id: 1,
          apartment: 1,
          reading_date: '2024-01-15',
          current_value: '1000.50',
          previous_value: '950.25',
          consumption: '50.25'
        }
      ])
    );
  }),

  // Mock dashboard endpoint
  rest.get('/api/financial/dashboard/', (req, res, ctx) => {
    return res(
      ctx.json({
        total_expenses: '5000.00',
        total_payments: '3000.00',
        current_reserve: '10000.00',
        recent_transactions: []
      })
    );
  }),

  // Mock apartments endpoint
  rest.get('/api/buildings/1/apartments/', (req, res, ctx) => {
    return res(
      ctx.json([
        {
          id: 1,
          number: 'A1',
          floor: 1,
          current_balance: '500.00',
          participation_mills: '100.00'
        },
        {
          id: 2,
          number: 'A2',
          floor: 1,
          current_balance: '-200.00',
          participation_mills: '150.00'
        }
      ])
    );
  })
);

// Establish API mocking before all tests
beforeAll(() => server.listen());

// Reset any request handlers that we may add during the tests
afterEach(() => server.resetHandlers());

// Clean up after the tests are finished
afterAll(() => server.close());

// Mock context providers
const MockProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <div>
      {children}
    </div>
  );
};

describe('Financial Components', () => {
  describe('ExpenseForm', () => {
    it('renders expense form correctly', () => {
      render(
        <MockProviders>
          <ExpenseForm />
        </MockProviders>
      );

      expect(screen.getByText('Νέα Δαπάνη')).toBeInTheDocument();
      expect(screen.getByLabelText('Τίτλος')).toBeInTheDocument();
      expect(screen.getByLabelText('Ποσό')).toBeInTheDocument();
      expect(screen.getByLabelText('Κατηγορία')).toBeInTheDocument();
      expect(screen.getByLabelText('Τύπος Κατανομής')).toBeInTheDocument();
    });

    it('validates required fields', async () => {
      render(
        <MockProviders>
          <ExpenseForm />
        </MockProviders>
      );

      const submitButton = screen.getByText('Αποθήκευση');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Ο τίτλος είναι υποχρεωτικός')).toBeInTheDocument();
        expect(screen.getByText('Το ποσό είναι υποχρεωτικό')).toBeInTheDocument();
      });
    });

    it('submits form with valid data', async () => {
      // Mock successful submission
      server.use(
        rest.post('/api/financial/expenses/', (req, res, ctx) => {
          return res(ctx.json({ id: 1, message: 'Expense created successfully' }));
        })
      );

      render(
        <MockProviders>
          <ExpenseForm />
        </MockProviders>
      );

      // Fill form
      fireEvent.change(screen.getByLabelText('Τίτλος'), {
        target: { value: 'Test Expense' }
      });
      fireEvent.change(screen.getByLabelText('Ποσό'), {
        target: { value: '1000.00' }
      });
      fireEvent.change(screen.getByLabelText('Κατηγορία'), {
        target: { value: 'ELECTRICITY' }
      });
      fireEvent.change(screen.getByLabelText('Τύπος Κατανομής'), {
        target: { value: 'EQUAL' }
      });

      const submitButton = screen.getByText('Αποθήκευση');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Η δαπάνη αποθηκεύτηκε επιτυχώς')).toBeInTheDocument();
      });
    });
  });

  describe('PaymentForm', () => {
    it('renders payment form correctly', () => {
      render(
        <MockProviders>
          <PaymentForm />
        </MockProviders>
      );

      expect(screen.getByText('Νέα Πληρωμή')).toBeInTheDocument();
      expect(screen.getByLabelText('Διαμέρισμα')).toBeInTheDocument();
      expect(screen.getByLabelText('Ποσό')).toBeInTheDocument();
      expect(screen.getByLabelText('Μέθοδος Πληρωμής')).toBeInTheDocument();
    });

    it('validates payment amount', async () => {
      render(
        <MockProviders>
          <PaymentForm />
        </MockProviders>
      );

      // Try to submit with negative amount
      fireEvent.change(screen.getByLabelText('Ποσό'), {
        target: { value: '-100.00' }
      });

      const submitButton = screen.getByText('Αποθήκευση');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Το ποσό πρέπει να είναι θετικό')).toBeInTheDocument();
      });
    });

    it('submits payment successfully', async () => {
      server.use(
        rest.post('/api/financial/payments/', (req, res, ctx) => {
          return res(ctx.json({ id: 1, message: 'Payment created successfully' }));
        })
      );

      render(
        <MockProviders>
          <PaymentForm />
        </MockProviders>
      );

      // Fill form
      fireEvent.change(screen.getByLabelText('Διαμέρισμα'), {
        target: { value: '1' }
      });
      fireEvent.change(screen.getByLabelText('Ποσό'), {
        target: { value: '300.00' }
      });
      fireEvent.change(screen.getByLabelText('Μέθοδος Πληρωμής'), {
        target: { value: 'CASH' }
      });

      const submitButton = screen.getByText('Αποθήκευση');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Η πληρωμή αποθηκεύτηκε επιτυχώς')).toBeInTheDocument();
      });
    });
  });

  describe('MeterReadingForm', () => {
    it('renders meter reading form correctly', () => {
      render(
        <MockProviders>
          <MeterReadingForm />
        </MockProviders>
      );

      expect(screen.getByText('Νέα Μετρήση')).toBeInTheDocument();
      expect(screen.getByLabelText('Διαμέρισμα')).toBeInTheDocument();
      expect(screen.getByLabelText('Ημερομηνία Μετρήσης')).toBeInTheDocument();
      expect(screen.getByLabelText('Τρέχουσα Τιμή')).toBeInTheDocument();
      expect(screen.getByLabelText('Προηγούμενη Τιμή')).toBeInTheDocument();
    });

    it('validates meter reading values', async () => {
      render(
        <MockProviders>
          <MeterReadingForm />
        </MockProviders>
      );

      // Try to submit with current value less than previous
      fireEvent.change(screen.getByLabelText('Τρέχουσα Τιμή'), {
        target: { value: '900.00' }
      });
      fireEvent.change(screen.getByLabelText('Προηγούμενη Τιμή'), {
        target: { value: '1000.00' }
      });

      const submitButton = screen.getByText('Αποθήκευση');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Η τρέχουσα τιμή πρέπει να είναι μεγαλύτερη από την προηγούμενη')).toBeInTheDocument();
      });
    });

    it('calculates consumption automatically', async () => {
      render(
        <MockProviders>
          <MeterReadingForm />
        </MockProviders>
      );

      fireEvent.change(screen.getByLabelText('Τρέχουσα Τιμή'), {
        target: { value: '1100.50' }
      });
      fireEvent.change(screen.getByLabelText('Προηγούμενη Τιμή'), {
        target: { value: '1000.25' }
      });

      // Check if consumption is calculated
      await waitFor(() => {
        expect(screen.getByDisplayValue('100.25')).toBeInTheDocument();
      });
    });
  });

  describe('FinancialDashboard', () => {
    it('renders dashboard with financial data', async () => {
      render(
        <MockProviders>
          <FinancialDashboard />
        </MockProviders>
      );

      await waitFor(() => {
        expect(screen.getByText('Οικονομικό Dashboard')).toBeInTheDocument();
        expect(screen.getByText('Συνολικές Δαπάνες')).toBeInTheDocument();
        expect(screen.getByText('Συνολικές Πληρωμές')).toBeInTheDocument();
        expect(screen.getByText('Τρέχον Αποθεματικό')).toBeInTheDocument();
      });
    });

    it('displays correct financial metrics', async () => {
      render(
        <MockProviders>
          <FinancialDashboard />
        </MockProviders>
      );

      await waitFor(() => {
        expect(screen.getByText('€5,000.00')).toBeInTheDocument(); // Total expenses
        expect(screen.getByText('€3,000.00')).toBeInTheDocument(); // Total payments
        expect(screen.getByText('€10,000.00')).toBeInTheDocument(); // Current reserve
      });
    });

    it('shows recent transactions', async () => {
      // Mock transactions data
      server.use(
        rest.get('/api/financial/dashboard/', (req, res, ctx) => {
          return res(
            ctx.json({
              total_expenses: '5000.00',
              total_payments: '3000.00',
              current_reserve: '10000.00',
              recent_transactions: [
                {
                  id: 1,
                  type: 'EXPENSE',
                  amount: '1000.00',
                  description: 'Electricity bill',
                  date: '2024-01-15'
                }
              ]
            })
          );
        })
      );

      render(
        <MockProviders>
          <FinancialDashboard />
        </MockProviders>
      );

      await waitFor(() => {
        expect(screen.getByText('Πρόσφατες Κινήσεις')).toBeInTheDocument();
        expect(screen.getByText('Electricity bill')).toBeInTheDocument();
        expect(screen.getByText('€1,000.00')).toBeInTheDocument();
      });
    });
  });
});

describe('Financial Hooks', () => {
  describe('useExpenses', () => {
    it('fetches expenses successfully', async () => {
      // This would test the useExpenses hook
      // Implementation depends on your hook structure
    });
  });

  describe('usePayments', () => {
    it('fetches payments successfully', async () => {
      // This would test the usePayments hook
      // Implementation depends on your hook structure
    });
  });

  describe('useMeterReadings', () => {
    it('fetches meter readings successfully', async () => {
      // This would test the useMeterReadings hook
      // Implementation depends on your hook structure
    });
  });
});

describe('Financial Integration', () => {
  it('expense creation updates dashboard', async () => {
    // Test that creating an expense updates the dashboard
    // This would test the integration between components
  });

  it('payment creation updates apartment balance', async () => {
    // Test that creating a payment updates apartment balance
    // This would test the integration between components
  });

  it('meter reading affects expense calculation', async () => {
    // Test that meter readings affect expense calculations
    // This would test the integration between components
  });
});

// Utility functions for testing
export const createMockExpense = (overrides = {}) => ({
  id: 1,
  title: 'Test Expense',
  amount: '1000.00',
  category: 'ELECTRICITY',
  distribution_type: 'EQUAL',
  date: '2024-01-15',
  description: 'Test expense',
  ...overrides
});

export const createMockPayment = (overrides = {}) => ({
  id: 1,
  apartment: 1,
  amount: '300.00',
  payment_method: 'CASH',
  date: '2024-01-15',
  description: 'Test payment',
  ...overrides
});

export const createMockMeterReading = (overrides = {}) => ({
  id: 1,
  apartment: 1,
  reading_date: '2024-01-15',
  current_value: '1000.50',
  previous_value: '950.25',
  consumption: '50.25',
  ...overrides
}); 