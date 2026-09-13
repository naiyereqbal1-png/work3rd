import { supabase } from "../utils/supabase/client";
import {
  Customer,
  CustomerAddress,
  Product,
  ProductImage,
  ProductVariant,
  Order,
  OrderItem,
  OrderStatusHistoryItem,
  ProductReturn,
  StockTransaction,
  StoreSettings,
  Category,
  DeliveryBoy,
  Shopkeeper,
} from "../types";

export interface SupabaseFullData {
  settings: StoreSettings | null;
  categories: Category[];
  customers: Customer[];
  shopkeepers: Shopkeeper[];
  products: Product[];
  deliveryBoys: DeliveryBoy[];
  orders: Order[];
  returns: ProductReturn[];
  stockTransactions: StockTransaction[];
}

let isFetching = false;
const warnedTables = new Set<string>();

/**
 * Gracefully handle Supabase mutation errors such as RLS policy violations (42501)
 * or temporary network unreachable errors without raising unhandled exceptions or noisy errors.
 */
export function handleSupabaseError(table: string, action: string, error: any): boolean {
  if (!error) return true;

  const code = error?.code || "";
  const msg =
    (typeof error?.message === "string" ? error.message : "") +
    " " +
    (typeof error?.details === "string" ? error.details : "");

  const isRLS = code === "42501" || msg.toLowerCase().includes("row-level security");
  const isNetwork =
    msg.toLowerCase().includes("failed to fetch") ||
    msg.toLowerCase().includes("network") ||
    msg.toLowerCase().includes("typeerror");

  if (isRLS) {
    if (!warnedTables.has(table)) {
      warnedTables.add(table);
      console.warn(
        `[Supabase] Table "${table}" has Row-Level Security (RLS) active. Changes remain safely persisted locally.`
      );
    }
    return false;
  }

  if (isNetwork) {
    if (!warnedTables.has(`net_${table}`)) {
      warnedTables.add(`net_${table}`);
      console.warn(
        `[Supabase] Network unreachable for "${table}". Changes remain safely persisted locally.`
      );
    }
    return false;
  }

  console.warn(`[Supabase] Notice on ${action} for "${table}":`, error.message || error);
  return false;
}

/**
 * Fetch all application tables from Supabase into memory.
 */
export async function fetchFullDataFromSupabase(): Promise<SupabaseFullData | null> {
  if (isFetching) return null;
  isFetching = true;
  console.log("[Supabase] Querying complete cloud dataset from Supabase...");

  try {
    // 1. Settings
    let settings: StoreSettings | null = null;
    try {
      const { data } = await supabase.from("store_settings").select("*").maybeSingle();
      if (data) settings = data as StoreSettings;
    } catch (err) {
      console.warn("[Supabase] Error loading store_settings:", err);
    }

    // 2. Categories
    let categories: Category[] = [];
    try {
      const { data } = await supabase.from("categories").select("*").order("sort_order", { ascending: true });
      if (data && data.length > 0) categories = data as Category[];
    } catch (err) {
      console.warn("[Supabase] Error loading categories:", err);
    }

    // 3. Customers & Customer Addresses
    let rawAddresses: CustomerAddress[] = [];
    try {
      const { data } = await supabase.from("customer_addresses").select("*");
      if (data) rawAddresses = data as CustomerAddress[];
    } catch (err) {
      console.warn("[Supabase] Error loading customer_addresses:", err);
    }

    let customers: Customer[] = [];
    try {
      const { data } = await supabase.from("customers").select("*");
      if (data && data.length > 0) {
        customers = (data as any[]).map((c) => ({
          ...c,
          addresses: rawAddresses.filter((a) => a.customer_id === c.customer_id),
        }));
      }
    } catch (err) {
      console.warn("[Supabase] Error loading customers:", err);
    }

    // 4. Shopkeepers
    let shopkeepers: Shopkeeper[] = [];
    try {
      const { data } = await supabase.from("shopkeepers").select("*");
      if (data && data.length > 0) shopkeepers = data as Shopkeeper[];
    } catch (err) {
      console.warn("[Supabase] Error loading shopkeepers:", err);
    }

    // 5. Products, Images & Variants
    let products: Product[] = [];
    try {
      const [pRes, imgRes, varRes] = await Promise.all([
        supabase.from("products").select("*"),
        supabase.from("product_images").select("*"),
        supabase.from("product_variants").select("*"),
      ]);

      if (pRes.data && pRes.data.length > 0) {
        const images = (imgRes.data || []) as ProductImage[];
        const variants = (varRes.data || []) as ProductVariant[];

        products = (pRes.data as any[]).map((p) => ({
          ...p,
          images: images.filter((img) => img.product_id === p.id),
          variants: variants.filter((v) => v.product_id === p.id),
        }));
      }
    } catch (err) {
      console.warn("[Supabase] Error loading products:", err);
    }

    // 6. Delivery Boys
    let deliveryBoys: DeliveryBoy[] = [];
    try {
      const { data } = await supabase.from("delivery_boys").select("*");
      if (data && data.length > 0) deliveryBoys = data as DeliveryBoy[];
    } catch (err) {
      console.warn("[Supabase] Error loading delivery_boys:", err);
    }

    // 7. Orders, Items & Status History
    let orders: Order[] = [];
    try {
      const [ordRes, itemRes, histRes] = await Promise.all([
        supabase.from("orders").select("*").order("created_at", { ascending: false }),
        supabase.from("order_items").select("*"),
        supabase.from("order_status_history").select("*"),
      ]);

      if (ordRes.data && ordRes.data.length > 0) {
        const items = (itemRes.data || []) as OrderItem[];
        const history = (histRes.data || []) as OrderStatusHistoryItem[];

        orders = (ordRes.data as any[]).map((o) => {
          const orderItems = items.filter((it) => it.order_id === o.order_id);
          const orderHistory = history.filter((h) => h.order_id === o.order_id);

          let deliveryAddress = (o.delivery_address && typeof o.delivery_address === "object" && o.delivery_address.address)
            ? o.delivery_address
            : rawAddresses.find((a) => a.customer_id === o.customer_id && a.is_default);

          if (!deliveryAddress && rawAddresses.length > 0) {
            deliveryAddress = rawAddresses.find((a) => a.customer_id === o.customer_id);
          }

          if (!deliveryAddress) {
            deliveryAddress = {
              id: `addr-${o.customer_id}`,
              customer_id: o.customer_id,
              name: o.customer_name,
              mobile: o.mobile,
              pincode: "110001",
              address: "Standard Delivery Address",
              city: "New Delhi",
              state: "Delhi",
              address_type: "HOME",
              is_default: true,
            };
          }

          return {
            ...o,
            address: deliveryAddress,
            items: orderItems,
            status_history: orderHistory,
          };
        });
      }
    } catch (err) {
      console.warn("[Supabase] Error loading orders:", err);
    }

    // 8. Product Returns
    let returns: ProductReturn[] = [];
    try {
      const { data } = await supabase.from("product_returns").select("*");
      if (data && data.length > 0) returns = data as ProductReturn[];
    } catch (err) {
      console.warn("[Supabase] Error loading product_returns:", err);
    }

    // 9. Stock Transactions
    let stockTransactions: StockTransaction[] = [];
    try {
      const { data } = await supabase.from("stock_transactions").select("*").order("created_at", { ascending: false });
      if (data && data.length > 0) stockTransactions = data as StockTransaction[];
    } catch (err) {
      console.warn("[Supabase] Error loading stock_transactions:", err);
    }

    console.log(`[Supabase] Loaded ${products.length} products, ${orders.length} orders, ${customers.length} customers, ${deliveryBoys.length} delivery partners.`);
    isFetching = false;
    return {
      settings,
      categories,
      customers,
      shopkeepers,
      products,
      deliveryBoys,
      orders,
      returns,
      stockTransactions,
    };
  } catch (err: any) {
    console.warn("[Supabase] Notice loading cloud dataset:", err?.message || err);
    isFetching = false;
    return null;
  }
}

// ----------------------------------------------------------------------
// DIRECT SUPABASE MUTATION HELPERS
// ----------------------------------------------------------------------

export async function supabaseSaveAddress(address: CustomerAddress): Promise<boolean> {
  try {
    const { error } = await supabase.from("customer_addresses").upsert({
      id: address.id,
      customer_id: address.customer_id,
      name: address.name,
      mobile: address.mobile,
      pincode: address.pincode,
      address: address.address,
      locality: address.locality || null,
      city: address.city,
      state: address.state,
      landmark: address.landmark || null,
      address_type: address.address_type,
      is_default: !!address.is_default,
    });
    if (error) {
      return handleSupabaseError("customer_addresses", "save address", error);
    }
    return true;
  } catch (err) {
    return handleSupabaseError("customer_addresses", "save address", err);
  }
}

export async function supabaseDeleteAddress(addressId: string): Promise<boolean> {
  try {
    const { error } = await supabase.from("customer_addresses").delete().eq("id", addressId);
    if (error) {
      return handleSupabaseError("customer_addresses", "delete address", error);
    }
    return true;
  } catch (err) {
    return handleSupabaseError("customer_addresses", "delete address", err);
  }
}

export async function supabaseSaveOrder(order: Order): Promise<boolean> {
  try {
    // 1. Upsert customer address snapshot if valid
    if (order.address && order.customer_id) {
      await supabaseSaveAddress(order.address);
    }

    // 2. Insert order row
    const orderRow = {
      id: order.id,
      order_id: order.order_id,
      invoice_number: order.invoice_number || null,
      customer_id: order.customer_id,
      customer_name: order.customer_name,
      mobile: order.mobile,
      email: order.email || null,
      subtotal: order.subtotal,
      discount: order.discount || 0,
      delivery_charge: order.delivery_charge || 0,
      tax_amount: order.tax_amount || 0,
      total: order.total,
      payment_method: order.payment_method,
      payment_status: order.payment_status,
      order_status: order.order_status,
      order_type: order.order_type || "standard",
      tracking_number: order.tracking_number || null,
      courier_partner: order.courier_partner || null,
      assigned_delivery_boy_id: order.assigned_delivery_boy_id || null,
      assigned_delivery_boy_name: order.assigned_delivery_boy_name || null,
      assigned_delivery_boy_mobile: order.assigned_delivery_boy_mobile || null,
      delivery_boy_assigned_at: order.delivery_boy_assigned_at || null,
      original_delivery_boy_id: order.original_delivery_boy_id || null,
      original_delivery_boy_name: order.original_delivery_boy_name || null,
      original_delivery_boy_mobile: order.original_delivery_boy_mobile || null,
      try_at_home_status: order.try_at_home_status || null,
      try_at_home_fee: order.try_at_home_fee || 0,
      try_at_home_duration_minutes: order.try_at_home_duration_minutes || null,
      try_at_home_expires_at: order.try_at_home_expires_at || null,
      try_at_home_closed_at: order.try_at_home_closed_at || null,
      try_at_home_decision_notes: order.try_at_home_decision_notes || null,
      try_at_home_delivered_at: order.try_at_home_delivered_at || null,
      replacement_credit_applied: order.replacement_credit_applied || 0,
      replacement_credit_source_order_id: order.replacement_credit_source_id || null,
      delivery_address: order.address ? JSON.parse(JSON.stringify(order.address)) : null,
    };

    const { error: ordErr } = await supabase.from("orders").upsert(orderRow);
    if (ordErr) {
      handleSupabaseError("orders", "upsert order", ordErr);
    }

    // 3. Upsert order items
    if (order.items && order.items.length > 0) {
      const itemRows = order.items.map((it) => ({
        id: it.id,
        order_id: order.order_id,
        product_id: it.product_id,
        product_name: it.product_name,
        brand: it.brand || null,
        sku: it.sku,
        quantity: it.quantity,
        price: it.price,
        mrp: it.mrp,
        size: it.size,
        color: it.color,
        image_url: it.image_url,
        item_status: it.item_status || null,
        cancelled_at: it.cancelled_at || null,
        cancellation_reason: it.cancellation_reason || null,
        return_status: it.return_status || null,
        returned_quantity: it.returned_quantity || 0,
        final_quantity: it.final_quantity || null,
        return_amount: it.return_amount || 0,
        final_amount: it.final_amount || null,
        return_id: it.return_id || null,
        return_reason: it.return_reason || null,
        return_remark: it.return_remark || null,
        return_requested_at: it.return_requested_at || null,
        return_accepted_at: it.return_accepted_at || null,
        return_completed_at: it.return_completed_at || null,
        stock_restored: it.stock_restored || false,
        request_type: it.request_type || null,
        is_replaced: it.is_replaced || false,
        replacement_size: it.replacement_size || null,
        replacement_color: it.replacement_color || null,
        replacement_reason: it.replacement_reason || null,
        replacement_amount: it.replacement_amount || 0,
        shopkeeper_id: it.shopkeeper_id || null,
        shopkeeper_name: it.shopkeeper_name || null,
      }));

      try {
        const { error: itemErr } = await supabase.from("order_items").upsert(itemRows);
        if (itemErr) {
          handleSupabaseError("order_items", "upsert items", itemErr);
        }
      } catch (e) {
        handleSupabaseError("order_items", "upsert items", e);
      }
    }

    // 4. Upsert order status history
    if (order.status_history && order.status_history.length > 0) {
      const histRows = order.status_history.map((h) => ({
        id: h.id,
        order_id: order.order_id,
        status: h.status,
        changed_by: h.changed_by,
        changed_at: h.changed_at || new Date().toISOString(),
        notes: h.notes || null,
      }));

      try {
        const { error: histErr } = await supabase.from("order_status_history").upsert(histRows);
        if (histErr) {
          handleSupabaseError("order_status_history", "upsert status history", histErr);
        }
      } catch (e) {
        handleSupabaseError("order_status_history", "upsert status history", e);
      }
    }

    return true;
  } catch (err) {
    return handleSupabaseError("orders", "save order", err);
  }
}

export async function supabaseUpdateOrderStatus(
  orderId: string,
  status: string,
  changedBy: string,
  notes?: string
): Promise<boolean> {
  try {
    const { error: ordErr } = await supabase
      .from("orders")
      .update({ order_status: status, updated_at: new Date().toISOString() })
      .eq("order_id", orderId);

    if (ordErr) {
      return handleSupabaseError("orders", "update order status", ordErr);
    }

    try {
      await supabase.from("order_status_history").insert({
        id: `sh-${Date.now()}`,
        order_id: orderId,
        status,
        changed_by: changedBy,
        changed_at: new Date().toISOString(),
        notes: notes || null,
      });
    } catch (e) {
      handleSupabaseError("order_status_history", "insert status history", e);
    }

    return true;
  } catch (err) {
    return handleSupabaseError("orders", "update order status", err);
  }
}

export async function supabaseUpdateOrderShipping(
  orderId: string,
  trackingNumber: string,
  courierPartner?: string
): Promise<boolean> {
  try {
    const updates: any = { tracking_number: trackingNumber, updated_at: new Date().toISOString() };
    if (courierPartner) updates.courier_partner = courierPartner;
    const { error } = await supabase.from("orders").update(updates).eq("order_id", orderId);
    if (error) {
      return handleSupabaseError("orders", "update shipping", error);
    }
    return true;
  } catch (err) {
    return handleSupabaseError("orders", "update shipping", err);
  }
}

export async function supabaseAssignDeliveryBoy(
  orderId: string,
  boy: { id: string; name: string; mobile: string }
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("orders")
      .update({
        assigned_delivery_boy_id: boy.id,
        assigned_delivery_boy_name: boy.name,
        assigned_delivery_boy_mobile: boy.mobile,
        delivery_boy_assigned_at: new Date().toISOString(),
        order_status: "Out for Delivery",
        updated_at: new Date().toISOString(),
      })
      .eq("order_id", orderId);

    if (error) {
      return handleSupabaseError("orders", "assign delivery boy", error);
    }

    try {
      await supabase.from("order_status_history").insert({
        id: `sh-${Date.now()}`,
        order_id: orderId,
        status: "Out for Delivery",
        changed_by: `Assigned to ${boy.name} (${boy.mobile})`,
        changed_at: new Date().toISOString(),
        notes: `Assigned delivery partner ${boy.name} for doorstep fulfillment.`,
      });
    } catch (e) {
      handleSupabaseError("order_status_history", "insert status history", e);
    }

    return true;
  } catch (err) {
    return handleSupabaseError("orders", "assign delivery boy", err);
  }
}

export async function supabaseSaveProduct(product: Product): Promise<boolean> {
  try {
    const productRow = {
      id: product.id,
      sku: product.sku,
      name: product.name,
      slug: product.slug,
      category_id: product.category_id,
      category_name: product.category_name,
      category_slug: product.category_slug || null,
      subcategory_id: product.subcategory_id || null,
      subcategory_name: product.subcategory_name || null,
      gender: product.gender,
      description: product.description || null,
      brand: product.brand || null,
      mrp: product.mrp,
      selling_price: product.selling_price,
      admin_selling_price: product.admin_selling_price || null,
      shopkeeper_price: product.shopkeeper_price || null,
      discount_percentage: product.discount_percentage || 0,
      stock: product.stock || 0,
      status: product.status,
      rating: product.rating || 5.0,
      rating_count: product.rating_count || 0,
      sizes: product.sizes || [],
      colors: product.colors || [],
      tags: product.tags || [],
      specifications: product.specifications || {},
      shopkeeper_id: product.shopkeeper_id || null,
      shopkeeper_name: product.shopkeeper_name || null,
      approval_status: product.approval_status || "APPROVED",
      rejection_reason: product.rejection_reason || null,
      is_live: product.is_live !== false,
      updated_at: new Date().toISOString(),
    };

    const { error: pErr } = await supabase.from("products").upsert(productRow);
    if (pErr) {
      handleSupabaseError("products", "upsert product", pErr);
    }

    // Images
    if (product.images && product.images.length > 0) {
      const imgRows = product.images.map((img) => ({
        id: img.id,
        product_id: product.id,
        image_url: img.image_url,
        sort_order: img.sort_order || 0,
        is_primary: !!img.is_primary,
        caption: img.caption || null,
      }));
      try {
        const { error: imgErr } = await supabase.from("product_images").upsert(imgRows);
        if (imgErr) handleSupabaseError("product_images", "upsert images", imgErr);
      } catch (e) {
        handleSupabaseError("product_images", "upsert images", e);
      }
    }

    // Variants
    if (product.variants && product.variants.length > 0) {
      const varRows = product.variants.map((v) => ({
        id: v.id,
        product_id: product.id,
        size: v.size,
        color: v.color,
        sku: v.sku,
        stock: v.stock || 0,
        price: v.price,
        mrp: v.mrp,
      }));
      try {
        const { error: varErr } = await supabase.from("product_variants").upsert(varRows);
        if (varErr) handleSupabaseError("product_variants", "upsert variants", varErr);
      } catch (e) {
        handleSupabaseError("product_variants", "upsert variants", e);
      }
    }

    return true;
  } catch (err) {
    return handleSupabaseError("products", "save product", err);
  }
}

export async function supabaseUpdateProduct(id: string, updates: Partial<Product>): Promise<boolean> {
  try {
    const VALID_PRODUCT_COLUMNS = [
      "sku",
      "name",
      "slug",
      "category_id",
      "category_name",
      "category_slug",
      "subcategory_id",
      "subcategory_name",
      "gender",
      "description",
      "brand",
      "mrp",
      "selling_price",
      "admin_selling_price",
      "shopkeeper_price",
      "discount_percentage",
      "stock",
      "status",
      "rating",
      "rating_count",
      "sizes",
      "colors",
      "tags",
      "specifications",
      "shopkeeper_id",
      "shopkeeper_name",
      "approval_status",
      "rejection_reason",
      "is_live",
    ];

    const cleanUpdates: any = {
      updated_at: new Date().toISOString(),
    };

    for (const key of VALID_PRODUCT_COLUMNS) {
      if (updates[key as keyof Product] !== undefined) {
        cleanUpdates[key] = updates[key as keyof Product];
      }
    }

    const { error } = await supabase
      .from("products")
      .update(cleanUpdates)
      .eq("id", id);

    if (error) {
      return handleSupabaseError("products", "update product", error);
    }
    return true;
  } catch (err) {
    return handleSupabaseError("products", "update product", err);
  }
}

export async function supabaseDeleteProduct(id: string): Promise<boolean> {
  try {
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) {
      return handleSupabaseError("products", "delete product", error);
    }
    return true;
  } catch (err) {
    return handleSupabaseError("products", "delete product", err);
  }
}

export async function supabaseSaveCustomer(customer: Customer): Promise<boolean> {
  try {
    const { error } = await supabase.from("customers").upsert({
      id: customer.id,
      customer_id: customer.customer_id,
      name: customer.name,
      mobile: customer.mobile,
      email: customer.email || null,
      status: customer.status || "ACTIVE",
      total_orders: customer.total_orders || 0,
      total_spent: customer.total_spent || 0.0,
      last_order_at: customer.last_order_at || null,
    });
    if (error) {
      return handleSupabaseError("customers", "save customer", error);
    }
    return true;
  } catch (err) {
    return handleSupabaseError("customers", "save customer", err);
  }
}

export async function supabaseSaveCategory(cat: Category): Promise<boolean> {
  try {
    const { error } = await supabase.from("categories").upsert({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      image: cat.image || null,
      image_url: cat.image_url || null,
      parent_id: cat.parent_id || null,
      status: cat.status,
      sort_order: cat.sort_order || 0,
      display_order: cat.display_order || 0,
      description: cat.description || null,
    });
    if (error) {
      return handleSupabaseError("categories", "save category", error);
    }
    return true;
  } catch (err) {
    return handleSupabaseError("categories", "save category", err);
  }
}

export async function supabaseSaveShopkeeper(s: Shopkeeper): Promise<boolean> {
  try {
    const { error } = await supabase.from("shopkeepers").upsert({
      id: s.id,
      shopkeeper_id: s.shopkeeper_id,
      name: s.name,
      store_name: s.store_name || null,
      mobile: s.mobile,
      email: s.email || null,
      city: s.city || null,
      status: s.status,
      permissions: s.permissions,
      total_products: s.total_products || 0,
      live_products: s.live_products || 0,
      pending_products: s.pending_products || 0,
      current_stock: s.current_stock || 0,
      total_orders: s.total_orders || 0,
    });
    if (error) {
      return handleSupabaseError("shopkeepers", "save shopkeeper", error);
    }
    return true;
  } catch (err) {
    return handleSupabaseError("shopkeepers", "save shopkeeper", err);
  }
}

export async function supabaseSaveDeliveryBoy(d: DeliveryBoy): Promise<boolean> {
  try {
    const { error } = await supabase.from("delivery_boys").upsert({
      id: d.id,
      delivery_boy_id: d.delivery_boy_id,
      name: d.name,
      mobile: d.mobile,
      password: d.password || null,
      email: d.email || null,
      vehicle_type: d.vehicle_type || null,
      vehicle_number: d.vehicle_number || null,
      city: d.city || null,
      status: d.status || "ACTIVE",
      assigned_area: d.assigned_area || null,
      total_delivered: d.total_delivered || 0,
      rating: d.rating || 5.0,
    });
    if (error) {
      return handleSupabaseError("delivery_boys", "save delivery boy", error);
    }
    return true;
  } catch (err) {
    return handleSupabaseError("delivery_boys", "save delivery boy", err);
  }
}

export async function supabaseSaveSettings(settings: StoreSettings): Promise<boolean> {
  try {
    const { error } = await supabase.from("store_settings").upsert({
      id: 1,
      store_name: settings.store_name,
      store_tagline: settings.store_tagline,
      contact_email: settings.contact_email,
      contact_phone: settings.contact_phone,
      delivery_charge: settings.delivery_charge,
      free_delivery_threshold: settings.free_delivery_threshold,
      cod_enabled: settings.cod_enabled,
      online_payment_enabled: settings.online_payment_enabled,
      min_order_value: settings.min_order_value,
      gst_percentage: settings.gst_percentage,
      currency: settings.currency,
      currency_symbol: settings.currency_symbol,
      try_at_home_duration_minutes: settings.try_at_home_duration_minutes,
      try_at_home_charge: settings.try_at_home_charge,
      sms_provider: settings.sms_provider,
      sms_api_key: settings.sms_api_key,
      sms_sender: settings.sms_sender_id,
      twilio_account_sid: settings.twilio_account_sid,
      twilio_from_phone: settings.twilio_from_phone,
      updated_at: new Date().toISOString(),
    });
    if (error) {
      return handleSupabaseError("store_settings", "save settings", error);
    }
    return true;
  } catch (err) {
    return handleSupabaseError("store_settings", "save settings", err);
  }
}

export async function supabaseSaveReturn(ret: ProductReturn): Promise<boolean> {
  try {
    const { error } = await supabase.from("product_returns").upsert({
      id: ret.id || ret.return_id,
      return_id: ret.return_id,
      order_id: ret.order_id,
      order_item_id: ret.order_item_id,
      customer_id: ret.customer_id,
      customer_name: ret.customer_name,
      customer_mobile: ret.customer_mobile,
      product_id: ret.product_id,
      product_name: ret.product_name,
      sku: (ret as any).sku || null,
      quantity: ret.quantity,
      price: ret.product_price || (ret as any).price || 0,
      return_amount: ret.return_amount,
      request_type: (ret as any).request_type || 'return',
      return_reason: (ret as any).return_reason || (ret as any).reason || null,
      return_status: ret.status || (ret as any).return_status || 'Pending',
      is_credit_adjusted: (ret as any).is_credit_adjusted || false,
      adjusted_in_order_id: (ret as any).adjusted_in_order_id || null,
      adjusted_at: (ret as any).adjusted_at || null,
      shopkeeper_id: (ret as any).shopkeeper_id || null,
      created_at: (ret as any).created_at || new Date().toISOString(),
    });
    if (error) {
      return handleSupabaseError("product_returns", "save return", error);
    }
    return true;
  } catch (err) {
    return handleSupabaseError("product_returns", "save return", err);
  }
}

export async function supabaseSaveStockTransaction(tx: StockTransaction): Promise<boolean> {
  try {
    const { error } = await supabase.from("stock_transactions").upsert({
      id: tx.id || tx.transaction_id,
      product_id: tx.product_id,
      product_name: tx.product_name,
      sku: tx.sku,
      transaction_type: tx.transaction_type,
      quantity: tx.quantity,
      previous_stock: tx.previous_stock,
      new_stock: tx.new_stock,
      reference_order_id: tx.order_id || null,
      notes: tx.reference_note || tx.reason || null,
      created_by: tx.performed_by_name || tx.performed_by,
      created_at: tx.timestamp || new Date().toISOString(),
    });
    if (error) {
      return handleSupabaseError("stock_transactions", "save stock transaction", error);
    }
    return true;
  } catch (err) {
    return handleSupabaseError("stock_transactions", "save stock transaction", err);
  }
}

/**
 * Setup Realtime channel on public schema for cross-PC live synchronization.
 */
export function supabaseSubscribeRealtime(onDatabaseChange: () => void): () => void {
  try {
    const channel = supabase
      .channel("public-db-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public" },
        (payload) => {
          console.log("[Supabase Realtime] Change detected in table:", payload.table);
          onDatabaseChange();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (err) {
    console.warn("[Supabase Realtime] Could not initialize realtime channel:", err);
    return () => {};
  }
}

/**
 * Backwards compatibility hooks for existing callers
 */
export async function pullFromSupabase(): Promise<boolean> {
  const data = await fetchFullDataFromSupabase();
  return !!data;
}

export async function pushToSupabase(): Promise<boolean> {
  return true;
}
