"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

export default function ProcurementDashboard() {
  const params = useParams();
  const worldId = params.id as string;
  const [plans, setPlans] = useState<any[]>([]);
  const [procurements, setProcurements] = useState<any[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/worlds/${worldId}/plans`)
      .then(res => res.json())
      .then(data => setPlans(data.plans || []));
      
    const interval = setInterval(() => {
      fetch(`/api/worlds/${worldId}/procurements`)
        .then(res => res.json())
        .then(data => setProcurements(data.procurements || []));
    }, 2000);
    
    return () => clearInterval(interval);
  }, [worldId]);

  const generatePlans = async () => {
    const res = await fetch(`/api/worlds/${worldId}/plans`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ budgetHbar: 50 })
    });
    const data = await res.json();
    setPlans(data.plans || []);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white p-8 font-sans">
      <header className="mb-12 border-b border-white/10 pb-6 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
            Director Agent: Procurement
          </h1>
          <p className="text-white/60 mt-2">Autonomous x402 AI Supply Chain</p>
        </div>
        <div className="text-right">
          <div className="text-sm text-white/50">Budget</div>
          <div className="text-2xl font-mono">50.00 ℏ</div>
        </div>
      </header>

      {plans.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 border border-dashed border-white/20 rounded-xl">
          <p className="text-white/60 mb-4">No production plans generated yet.</p>
          <button 
            onClick={generatePlans}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium transition-colors"
          >
            Generate Plans
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {plans.map(plan => (
            <motion.div 
              key={plan.id}
              whileHover={{ scale: 1.02 }}
              onClick={() => setSelectedPlan(plan.id)}
              className={`p-6 rounded-xl border cursor-pointer transition-all ${
                selectedPlan === plan.id 
                  ? "border-blue-500 bg-blue-500/10" 
                  : "border-white/10 bg-white/5 hover:border-white/30"
              }`}
            >
              <h3 className="text-xl font-semibold capitalize mb-4">{plan.plan_type} Plan</h3>
              <div className="space-y-2 font-mono text-sm">
                <div className="flex justify-between">
                  <span className="text-white/60">Cost:</span>
                  <span className="text-blue-400">{plan.estimated_cost_hbar} ℏ</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Quality:</span>
                  <span>{plan.estimated_quality_score.toFixed(1)}/10</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Latency:</span>
                  <span>{(plan.estimated_duration_ms / 1000).toFixed(1)}s</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {selectedPlan && (
        <div className="mt-12">
          <h2 className="text-2xl font-semibold mb-6">Creative Supply Chain</h2>
          <div className="space-y-4">
            <AnimatePresence>
              {procurements.map((proc, i) => (
                <motion.div 
                  key={proc.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-[#111] border border-white/10 rounded-xl p-6"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <span className="px-2 py-1 bg-white/10 rounded text-xs uppercase tracking-wider text-white/70 mr-3">
                        {proc.task_type}
                      </span>
                      <span className="font-semibold">{proc.provider_registry?.name}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-blue-400">{proc.cost_hbar} ℏ</div>
                      <div className="text-xs text-white/40 mt-1 capitalize">{proc.status}</div>
                    </div>
                  </div>
                  
                  {proc.payment_receipt && (
                    <div className="mt-4 pt-4 border-t border-white/5 font-mono text-xs text-white/50">
                      <div className="flex justify-between mb-1">
                        <span>x402 Challenge:</span>
                        <span className="text-yellow-400">Payment Required</span>
                      </div>
                      <div className="flex justify-between mb-1">
                        <span>Hedera Settlement:</span>
                        <span className="text-green-400">Confirmed</span>
                      </div>
                      <div className="flex justify-between">
                        <span>HashScan Receipt:</span>
                        <a href={proc.hashscan_url} target="_blank" className="text-blue-400 hover:underline truncate ml-4 max-w-[200px]">
                          {JSON.parse(proc.payment_receipt).tx_hash}
                        </a>
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}
