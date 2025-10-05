"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { supabase, createSupabaseClientWithAuth } from "@/lib/supabase-client";

interface Shop {
  id: string;
  name: string;
  description?: string;
  address?: string;
  owner_id: string;
  created_at: string;
}

export function SupabaseExample() {
  const { getToken, isSignedIn } = useAuth();
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newShopName, setNewShopName] = useState("");

  // Fetch shops (client-side example)
  const fetchShops = async () => {
    if (!isSignedIn) {
      setError("Please sign in to fetch shops");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = await getToken();
      const supabaseWithAuth = createSupabaseClientWithAuth(token);

      // Fetch user's shops
      const { data, error } = await supabaseWithAuth
        .from('shops')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setShops(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch shops');
    } finally {
      setLoading(false);
    }
  };

  // Create new shop (client-side example)
  const createShop = async () => {
    if (!isSignedIn || !newShopName.trim()) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = await getToken();
      const supabaseWithAuth = createSupabaseClientWithAuth(token);

      const { data, error } = await supabaseWithAuth
        .from('shops')
        .insert({
          name: newShopName.trim(),
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      setShops(prev => [data, ...prev]);
      setNewShopName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create shop');
    } finally {
      setLoading(false);
    }
  };

  // Fetch shops on component mount and when signed in
  useEffect(() => {
    if (isSignedIn) {
      fetchShops();
    } else {
      setShops([]);
    }
  }, [isSignedIn]);

  if (!isSignedIn) {
    return (
      <div className="p-6 border rounded-lg bg-card text-card-foreground">
        <h3 className="text-lg font-semibold mb-2">Supabase Integration Example</h3>
        <p className="text-muted-foreground">Please sign in to access this feature.</p>
      </div>
    );
  }

  return (
    <div className="p-6 border rounded-lg bg-card text-card-foreground">
      <h3 className="text-lg font-semibold mb-4">Supabase Integration Example</h3>

      {/* Create Shop Form */}
      <div className="mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={newShopName}
            onChange={(e) => setNewShopName(e.target.value)}
            placeholder="Enter shop name..."
            className="flex-1 px-3 py-2 border rounded-md bg-background text-foreground border-input"
            onKeyPress={(e) => e.key === 'Enter' && createShop()}
          />
          <button
            onClick={createShop}
            disabled={loading || !newShopName.trim()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Shop'}
          </button>
        </div>
      </div>

      {/* Fetch Shops Button */}
      <button
        onClick={fetchShops}
        disabled={loading}
        className="mb-4 px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90 disabled:opacity-50"
      >
        {loading ? 'Fetching...' : 'Refresh Shops'}
      </button>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-destructive/10 border border-destructive rounded-md">
          <p className="text-destructive text-sm">Error: {error}</p>
        </div>
      )}

      {/* Shops List */}
      <div>
        <h4 className="font-medium mb-2">Your Shops ({shops.length})</h4>
        {shops.length === 0 ? (
          <p className="text-muted-foreground text-sm">No shops found. Create your first shop above!</p>
        ) : (
          <div className="space-y-2">
            {shops.map((shop) => (
              <div key={shop.id} className="p-3 bg-muted rounded-md">
                <h5 className="font-medium">{shop.name}</h5>
                {shop.description && (
                  <p className="text-sm text-muted-foreground mt-1">{shop.description}</p>
                )}
                {shop.address && (
                  <p className="text-sm text-muted-foreground">{shop.address}</p>
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  Created: {new Date(shop.created_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}