import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchWithx402, x402PaymentError, PaymentRequirements } from '../x402Client.js';
import * as configModule from '../../config.js';

vi.mock('../../config.js', () => ({
  config: {
    procurement: {
      useLiveNetwork: false, // Force mock mode for easier testing
      hederaAccountId: '0.0.123',
      hederaPrivateKey: '302e020100300506032b657004220420mockprivatekey123456789012345678901234567890'
    }
  }
}));

describe('x402Client Interceptor', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;
  
  beforeEach(() => {
    // Suppress console logs for cleaner test output
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Interceptor Flow Verification', () => {
    it('catches 402, constructs PaymentPayload, submits to verify/settle, and retries original API', async () => {
      // Setup mock requirements
      const requirements: PaymentRequirements = {
        amount: 10,
        asset: "HBAR",
        payTo: "0.0.456",
        network: "hedera:testnet"
      };

      let callCount = 0;

      fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(async (url: any, options: any) => {
        callCount++;
        
        if (callCount === 1) {
          // 1. Initial Target API Request (Returns 402 Payment Required)
          return {
            status: 402,
            json: async () => ({ paymentRequirements: requirements })
          } as Response;
        } else if (callCount === 2) {
          // 2. Facilitator Verify Request (Returns 200 OK)
          expect(url).toContain('/verify');
          return {
            ok: true,
            status: 200,
            text: async () => 'OK'
          } as Response;
        } else if (callCount === 3) {
          // 3. Facilitator Settle Request (Returns 200 OK with success and transactionId)
          expect(url).toContain('/settle');
          return {
            ok: true,
            status: 200,
            json: async () => ({ success: true, transactionId: "0.0.456@1234.5678" })
          } as Response;
        } else if (callCount === 4) {
          // 4. Retry Original Target API Request with Authorization
          expect(url).toBe('https://api.example.com/data');
          expect(options?.headers?.['X-Payment-Receipt']).toBe("0.0.456@1234.5678");
          return {
            ok: true,
            status: 200,
            json: async () => ({ success: true, data: "success" })
          } as Response;
        }
        
        throw new Error('Unexpected fetch call');
      });

      const res = await fetchWithx402('https://api.example.com/data', { headers: { "X-Original": "Header" } });
      const data = await res.json();
      
      expect(callCount).toBe(4);
      expect(data.success).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('throws x402PaymentError when facilitator verify returns 400 Bad Signature', async () => {
      const requirements: PaymentRequirements = { amount: 10, asset: "HBAR", payTo: "0.0.456" };
      let callCount = 0;

      fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(async (url: any) => {
        callCount++;
        if (callCount === 1) {
          return {
            status: 402,
            json: async () => ({ paymentRequirements: requirements })
          } as Response;
        } else if (callCount === 2) {
          // Facilitator verify returns 400
          return {
            ok: false,
            status: 400,
            text: async () => 'Bad Signature'
          } as Response;
        }
        throw new Error('Unexpected fetch call');
      });

      try {
        await fetchWithx402('https://api.example.com/data');
        expect.fail('Expected fetchWithx402 to throw x402PaymentError');
      } catch (err: any) {
        expect(err).toBeInstanceOf(x402PaymentError);
        expect(err.statusCode).toBe(400);
        expect(err.message).toContain('Bad Signature');
      }
    });

    it('throws x402PaymentError when facilitator settle returns 402 Payment Expired', async () => {
      const requirements: PaymentRequirements = { amount: 10, asset: "HBAR", payTo: "0.0.456" };
      let callCount = 0;

      fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(async (url: any) => {
        callCount++;
        if (callCount === 1) {
          return {
            status: 402,
            json: async () => ({ paymentRequirements: requirements })
          } as Response;
        } else if (callCount === 2) {
          // verify success
          return { ok: true, status: 200, text: async () => 'OK' } as Response;
        } else if (callCount === 3) {
          // settle returns 402 Payment Expired
          return {
            ok: false,
            status: 402,
            text: async () => 'Payment Expired'
          } as Response;
        }
        throw new Error('Unexpected fetch call');
      });

      try {
        await fetchWithx402('https://api.example.com/data');
        expect.fail('Expected fetchWithx402 to throw x402PaymentError');
      } catch (err: any) {
        expect(err).toBeInstanceOf(x402PaymentError);
        expect(err.statusCode).toBe(402);
        expect(err.message).toContain('Payment Expired');
      }
    });
  });
});
