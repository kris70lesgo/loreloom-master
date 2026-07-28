"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ProfileSettingsPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setName(user.user_metadata?.full_name || "");
      }
    });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.updateUser({
      data: { full_name: name }
    });
    setLoading(false);
    
    // Refresh to update server components and go back to dashboard
    router.refresh();
    router.push("/dashboard");
  };

  return (
    <div style={{ padding: "40px", maxWidth: "600px", color: "white" }}>
      <h1 style={{ fontSize: "28px", fontWeight: 600, marginBottom: "24px" }}>Edit Profile</h1>
      <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "24px", background: "rgba(255,255,255,0.02)", padding: "24px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.05)" }}>
        <div>
          <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", color: "#a1a1aa" }}>
            Full Name
          </label>
          <input 
            type="text" 
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{
              width: "100%",
              padding: "12px 16px",
              borderRadius: "8px",
              background: "#08080a",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "white",
              outline: "none",
              fontSize: "14px"
            }}
            placeholder="Enter your name"
          />
        </div>
        <button 
          type="submit" 
          disabled={loading}
          style={{
            padding: "12px 24px",
            background: loading ? "#52525b" : "#7F56D9",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: loading ? "not-allowed" : "pointer",
            fontWeight: 500,
            fontSize: "14px",
            alignSelf: "flex-start",
            transition: "background 0.2s"
          }}
        >
          {loading ? "Saving..." : "Save Changes"}
        </button>
      </form>
    </div>
  );
}
