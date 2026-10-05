/**
 * Cart context — mirrors src/context/cart-context.tsx on the website, line
 * for line, with AsyncStorage in place of localStorage:
 *
 * - Guests: the cart lives in AsyncStorage and survives restarts.
 * - Signed-in users: the cart lives in the SAME Supabase `carts`/`cart_items`
 *   tables the website writes to (RLS-scoped to the owner), written through
 *   on every change.
 * - On sign-in the guest cart is merged into the Supabase cart (quantities
 *   summed, capped at 99) and the local copy is cleared.
 * - On sign-out the in-memory cart is dropped.
 *
 * This is what makes TEST A / TEST B work: the website and the app read and
 * write the same rows in the same database through the same RLS rules.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { getSupabase } from "@/lib/supabase";
import type { CartLine, Product } from "@/lib/types";

const STORAGE_KEY = "cnaz-cart-v1";
const MAX_QUANTITY = 99;

type CartContextValue = {
  lines: CartLine[];
  ready: boolean;
  count: number;
  subtotal: number;
  addLine: (product: Product, quantity?: number) => void;
  setQuantity: (productId: string, quantity: number) => void;
  removeLine: (productId: string) => void;
  clear: () => void;
  /** Re-reads the signed-in customer's cart from Supabase (site + app share
   *  the same rows, so changes made on the website appear here). */
  reload: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

function clampQuantity(quantity: number): number {
  if (!Number.isFinite(quantity)) return 1;
  return Math.min(MAX_QUANTITY, Math.max(1, Math.floor(quantity)));
}

function isCartLine(value: unknown): value is CartLine {
  const line = value as Partial<CartLine> | null;
  return (
    typeof line === "object" &&
    line !== null &&
    typeof line.productId === "string" &&
    typeof line.slug === "string" &&
    typeof line.name === "string" &&
    typeof line.weightLabel === "string" &&
    typeof line.priceNaira === "number" &&
    typeof line.imageUrl === "string" &&
    typeof line.quantity === "number"
  );
}

async function readStoredCart(): Promise<CartLine[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isCartLine).map((line) => ({
      ...line,
      quantity: clampQuantity(line.quantity),
    }));
  } catch {
    return [];
  }
}

async function clearStoredCart(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

async function writeStoredCart(lines: CartLine[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  } catch {
    // storage full/blocked — the in-memory cart still works
  }
}

type CartItemProduct = {
  id: string;
  slug: string;
  name: string;
  weight_label: string;
  price_naira: number;
  image_url: string;
  is_active: boolean;
};

type CartItemRow = {
  product_id: string;
  quantity: number;
  products: CartItemProduct | CartItemProduct[] | null;
};

function firstOf<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  // Depend on the user's ID (not the object) so auth-state refreshes don't
  // re-trigger the merge effect unnecessarily.
  const userId = user?.id ?? null;
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);
  const cartIdRef = useRef<string | null>(null);
  const syncTokenRef = useRef(0);
  const linesRef = useRef<CartLine[]>([]);

  useEffect(() => {
    linesRef.current = lines;
  }, [lines]);

  // Initial load of the guest cart.
  useEffect(() => {
    void (async () => {
      setLines(await readStoredCart());
      setReady(true);
    })();
  }, []);

  // Guests: mirror the cart to AsyncStorage on every change.
  useEffect(() => {
    if (!ready || userId) return;
    void writeStoredCart(lines);
  }, [lines, ready, userId]);

  /**
   * Pull the signed-in customer's cart rows from Supabase, replacing the
   * in-memory lines. Called when the cart screen regains focus so items
   * added on the website show up without a restart. Every write from this
   * app goes through immediately, so the server is always the safe truth.
   */
  const reload = useCallback(() => {
    if (!ready || authLoading) return;
    const currentUserId = userId;
    if (!currentUserId) return;
    const supabase = getSupabase();

    const token = ++syncTokenRef.current;
    void (async () => {
      try {
        // Find the user's cart row (create one only if the user has items).
        let cartId = cartIdRef.current;
        if (!cartId) {
          const { data: existing } = await supabase
            .from("carts")
            .select("id")
            .eq("user_id", currentUserId)
            .maybeSingle();
          cartId = existing?.id ?? null;
          if (cartId) cartIdRef.current = cartId;
        }
        if (!cartId) return; // no cart row yet: nothing to pull

        const { data: rows, error: rowsError } = await supabase
          .from("cart_items")
          .select(
            "product_id, quantity, products ( id, slug, name, weight_label, price_naira, image_url, is_active )",
          )
          .eq("cart_id", cartId);
        if (rowsError) throw rowsError;

        const serverLines: CartLine[] = [];
        for (const row of (rows ?? []) as CartItemRow[]) {
          const product = firstOf(row.products);
          if (!product || !product.is_active) continue;
          serverLines.push({
            productId: product.id,
            slug: product.slug,
            name: product.name,
            weightLabel: product.weight_label,
            priceNaira: product.price_naira,
            imageUrl: product.image_url,
            quantity: clampQuantity(row.quantity),
          });
        }

        if (token !== syncTokenRef.current) return;
        setLines(serverLines);
      } catch (error) {
        console.warn("[cnaz] Could not refresh your cart; keeping what is on screen.", error);
      }
    })();
  }, [ready, authLoading, userId]);

  // Signed-in: merge the guest cart into the Supabase cart, then use it as the
  // source of truth. (Same algorithm as the website's CartProvider.)
  useEffect(() => {
    if (!ready || authLoading) return;
    if (!userId) return;
    const supabase = getSupabase();

    const token = ++syncTokenRef.current;
    void (async () => {
      try {
        const localLines = await readStoredCart();

        // Find or create the user's cart row.
        let cartId = cartIdRef.current;
        if (!cartId) {
          const { data: existing } = await supabase
            .from("carts")
            .select("id")
            .eq("user_id", userId)
            .maybeSingle();
          cartId = existing?.id ?? null;
          if (!cartId) {
            const { data: created, error } = await supabase
              .from("carts")
              .insert({ user_id: userId })
              .select("id")
              .single();
            if (error || !created) throw error ?? new Error("Could not create cart");
            cartId = created.id;
          }
          cartIdRef.current = cartId;
        }

        // Load saved items with their product data.
        const { data: rows, error: rowsError } = await supabase
          .from("cart_items")
          .select(
            "product_id, quantity, products ( id, slug, name, weight_label, price_naira, image_url, is_active )",
          )
          .eq("cart_id", cartId);
        if (rowsError) throw rowsError;

        const merged = new Map<string, CartLine>();
        for (const row of (rows ?? []) as CartItemRow[]) {
          const product = firstOf(row.products);
          if (!product || !product.is_active) continue;
          merged.set(row.product_id, {
            productId: product.id,
            slug: product.slug,
            name: product.name,
            weightLabel: product.weight_label,
            priceNaira: product.price_naira,
            imageUrl: product.image_url,
            quantity: clampQuantity(row.quantity),
          });
        }

        // Merge in the guest cart (sum quantities, cap at 99).
        for (const line of localLines) {
          const existing = merged.get(line.productId);
          if (existing) {
            existing.quantity = clampQuantity(existing.quantity + line.quantity);
          } else {
            merged.set(line.productId, line);
          }
        }
        const mergedLines = [...merged.values()];

        // Persist the merged cart.
        if (mergedLines.length > 0) {
          const { error: upsertError } = await supabase
            .from("cart_items")
            .upsert(
              mergedLines.map((line) => ({
                cart_id: cartId,
                product_id: line.productId,
                quantity: line.quantity,
              })),
              { onConflict: "cart_id,product_id" },
            );
          if (upsertError) throw upsertError;

          const keepIds = mergedLines.map((line) => line.productId).join(",");
          const { error: pruneError } = await supabase
            .from("cart_items")
            .delete()
            .eq("cart_id", cartId)
            .not("product_id", "in", `(${keepIds})`);
          if (pruneError) throw pruneError;
        } else {
          await supabase.from("cart_items").delete().eq("cart_id", cartId);
        }

        if (token !== syncTokenRef.current) return;
        await clearStoredCart();
        setLines(mergedLines);
      } catch (error) {
        console.warn("[cnaz] Cart sync with your account failed; keeping the local cart.", error);
        if (token === syncTokenRef.current) setLines(await readStoredCart());
      }
    })();
  }, [userId, ready, authLoading]);

  // Signed-out: drop the account cart so the next guest starts fresh.
  useEffect(() => {
    if (!ready || authLoading) return;
    if (!userId && cartIdRef.current) {
      cartIdRef.current = null;
      syncTokenRef.current += 1;
      setLines([]);
      void clearStoredCart();
    }
  }, [userId, ready, authLoading]);

  const persistLine = useCallback(async (productId: string, quantity: number) => {
    const supabase: SupabaseClient = getSupabase();
    const cartId = cartIdRef.current;
    if (!supabase || !cartId) return;
    try {
      if (quantity < 1) {
        await supabase
          .from("cart_items")
          .delete()
          .eq("cart_id", cartId)
          .eq("product_id", productId);
      } else {
        await supabase
          .from("cart_items")
          .upsert({ cart_id: cartId, product_id: productId, quantity }, {
            onConflict: "cart_id,product_id",
          });
      }
    } catch (error) {
      console.warn("[cnaz] Could not save the cart item to your account.", error);
    }
  }, []);

  const addLine = useCallback(
    (product: Product, quantity = 1) => {
      const qty = clampQuantity(quantity);
      const current = linesRef.current.find((line) => line.productId === product.id);
      setLines((prev) => {
        const existing = prev.find((line) => line.productId === product.id);
        if (existing) {
          return prev.map((line) =>
            line.productId === product.id
              ? { ...line, quantity: clampQuantity(line.quantity + qty) }
              : line,
          );
        }
        return [
          ...prev,
          {
            productId: product.id,
            slug: product.slug,
            name: product.name,
            weightLabel: product.weightLabel,
            priceNaira: product.priceNaira,
            imageUrl: product.imageUrl,
            quantity: qty,
          },
        ];
      });
      void persistLine(product.id, clampQuantity((current?.quantity ?? 0) + qty));
    },
    [persistLine],
  );

  const removeLine = useCallback(
    (productId: string) => {
      setLines((prev) => prev.filter((line) => line.productId !== productId));
      void persistLine(productId, 0);
    },
    [persistLine],
  );

  const setQuantity = useCallback(
    (productId: string, quantity: number) => {
      if (quantity < 1) {
        removeLine(productId);
        return;
      }
      const qty = clampQuantity(quantity);
      setLines((prev) =>
        prev.map((line) => (line.productId === productId ? { ...line, quantity: qty } : line)),
      );
      void persistLine(productId, qty);
    },
    [persistLine, removeLine],
  );

  const clear = useCallback(() => {
    setLines([]);
    const supabase = getSupabase();
    const cartId = cartIdRef.current;
    if (supabase && cartId) {
      void supabase.from("cart_items").delete().eq("cart_id", cartId);
    }
  }, []);

  const { count, subtotal } = useMemo(() => {
    return {
      count: lines.reduce((sum, line) => sum + line.quantity, 0),
      subtotal: lines.reduce((sum, line) => sum + line.priceNaira * line.quantity, 0),
    };
  }, [lines]);

  const value = useMemo(
    () => ({ lines, ready, count, subtotal, addLine, setQuantity, removeLine, clear, reload }),
    [lines, ready, count, subtotal, addLine, setQuantity, removeLine, clear, reload],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within CartProvider");
  return context;
}
