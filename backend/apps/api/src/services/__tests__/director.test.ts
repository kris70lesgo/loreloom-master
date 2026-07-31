import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DirectorAgent } from '../director.js';
import { ProviderV2 } from '../procurement.js';
import * as configModule from '../../config.js';

// Mock config for offline testing
vi.mock('../../config.js', () => ({
  config: {
    procurement: {
      useLiveNetwork: false,
    },
  },
}));

// Mock fetchWithx402 to simulate success without network calls
vi.mock('../../utils/x402Client.js', () => ({
  fetchWithx402: vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ success: true })
  })
}));

describe('DirectorAgent - Decision Engine', () => {
  let agent: DirectorAgent;

  const MOCK_MARKETPLACE: ProviderV2[] = [
    // Premium wins heavily on reliability and latency (now speed)
    { name: "PremiumNarrator", category: "Story", tier: "Premium", cost: 15, speed: 99, quality: 95, reliabilityScore: 99, endpoint: "mock" },
    { name: "CheapScript", category: "Story", tier: "Standard", cost: 3, speed: 10, quality: 50, reliabilityScore: 50, endpoint: "mock" },
    
    { name: "HyperRender 8K", category: "Art", tier: "Premium", cost: 25, speed: 99, quality: 99, reliabilityScore: 99, endpoint: "mock" },
    { name: "BudgetCanvas", category: "Art", tier: "Standard", cost: 5, speed: 10, quality: 40, reliabilityScore: 50, endpoint: "mock" },
    
    { name: "HansZimmerBot", category: "Music", tier: "Premium", cost: 20, speed: 99, quality: 95, reliabilityScore: 99, endpoint: "mock" },
    { name: "LoFiGenerator", category: "Music", tier: "Standard", cost: 4, speed: 10, quality: 50, reliabilityScore: 50, endpoint: "mock" }
  ];

  beforeEach(() => {
    agent = new DirectorAgent();
    // Spy on console to prevent clutter and check logs if needed
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('Budget Constraints', () => {
    it('Scenario A: Tight Budget (15 HBAR) - selects lower-cost providers', async () => {
      // Minimum possible cost is 3 (Story) + 5 (Art) + 4 (Music) = 12 HBAR
      const plan = await agent.planProduction("Test prompt", 15, MOCK_MARKETPLACE);
      
      const totalCost = plan.plan.reduce((sum: number, p: ProviderV2) => sum + p.cost, 0);
      expect(totalCost).toBeLessThanOrEqual(15);
      
      const names = plan.plan.map((p: ProviderV2) => p.name);
      expect(names).toContain("CheapScript");
      expect(names).toContain("BudgetCanvas");
      expect(names).toContain("LoFiGenerator");
    });

    it('Scenario B: Generous Budget (100 HBAR) - prioritizes premium providers', async () => {
      // 100 HBAR is enough for all premiums: 15 + 25 + 20 = 60 HBAR
      const plan = await agent.planProduction("Test prompt", 100, MOCK_MARKETPLACE);
      
      const totalCost = plan.plan.reduce((sum: number, p: ProviderV2) => sum + p.cost, 0);
      expect(totalCost).toBe(60);
      
      const names = plan.plan.map((p: ProviderV2) => p.name);
      expect(names).toContain("PremiumNarrator");
      expect(names).toContain("HyperRender 8K");
      expect(names).toContain("HansZimmerBot");
    });

    it('Scenario C: Insufficient Budget (1 HBAR) - throws a clean error', async () => {
      await expect(agent.planProduction("Test prompt", 1, MOCK_MARKETPLACE))
        .rejects
        .toThrow("Budget insufficient for minimal production requirements");
    });
  });

  describe('Mathematical Optimization', () => {
    it('correctly calculates utility weights', () => {
      const provider: ProviderV2 = { 
        name: "Test", category: "Story", tier: "Standard", 
        cost: 15, speed: 20, quality: 80, reliabilityScore: 90, endpoint: "mock" 
      };

      const utility = agent.calculateProviderV2Utility(provider);
      
      // Expected logic:
      // Cost score: Math.max(0, 1 - (15/30)) = 0.5
      // Reliability score: 90/100 = 0.9
      // Latency score: Math.max(0, 1 - (2000/10000)) = 0.8
      
      // Utility = (0.5 * 0.4) + (0.9 * 0.4) + (0.8 * 0.2)
      //         = 0.2 + 0.36 + 0.16 = 0.72

      expect(utility).toBeCloseTo(0.72, 4);
    });
    
    it('selects optimal combination when budget allows mid-tier mixing', async () => {
      // Add a mid-tier Art provider that is very reliable and fast but costs 15
      const customMarketplace = [
        ...MOCK_MARKETPLACE,
        { name: "MidTierArt", category: "Art", tier: "Standard", cost: 12, speed: 80, quality: 85, reliabilityScore: 98, endpoint: "mock" } as ProviderV2
      ];

      // Total cheapest = 3 + 5 + 4 = 12
      // Using MidTierArt instead of BudgetCanvas adds +7 cost (total 19)
      // Budget = 20 (can afford MidTierArt but not Premium)
      const plan = await agent.planProduction("Test prompt", 20, customMarketplace);
      const names = plan.plan.map((p: ProviderV2) => p.name);
      
      expect(names).toContain("MidTierArt"); // High utility, fits in budget
      expect(names).toContain("CheapScript");
      expect(names).toContain("LoFiGenerator");
      
      const totalCost = plan.plan.reduce((sum: number, p: ProviderV2) => sum + p.cost, 0);
      expect(totalCost).toBe(19);
    });
  });
  
  describe('Budget Tracking in Execution', () => {
    it('tracks remaining unspent budget accurately down to 4 decimal places', async () => {
      const plan: ProviderV2[] = [
        { name: "CheapScript", category: "Story", tier: "Standard", cost: 3.1234, speed: 90, quality: 80, reliabilityScore: 100, endpoint: "mock" },
        { name: "BudgetCanvas", category: "Art", tier: "Standard", cost: 5.4321, speed: 90, quality: 80, reliabilityScore: 100, endpoint: "mock" },
      ];
      
      const maxBudget = 10;
      
      const consoleLogSpy = vi.spyOn(console, 'log');

      await agent.executeProduction(plan, "Test", maxBudget);

      // Verify the log contains the accurately tracked budget
      // Initial: 10.0000
      // After Story (3.1234): 10 - 3.1234 = 6.8766
      // After Art (5.4321): 6.8766 - 5.4321 = 1.4445

      const logCalls = consoleLogSpy.mock.calls.map(c => c.join(' '));
      expect(logCalls.some(call => call.includes('Remaining unspent budget: 6.8766 ℏ'))).toBe(true);
      expect(logCalls.some(call => call.includes('Remaining unspent budget: 1.4445 ℏ'))).toBe(true);
    });
  });
});
