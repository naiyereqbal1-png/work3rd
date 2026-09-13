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
  Shopkeeper
} from "../types";

const STORAGE_KEYS = {
  PRODUCTS: "style1_products",
  CATEGORIES: "style1_categories",
  CUSTOMERS: "style1_customers",
  ORDERS: "style1_orders",
  RETURNS: "style1_product_returns",
  DELIVERY_BOYS: "style1_delivery_boys",
  SHOPKEEPERS: "style1_shopkeepers",
  STOCK_TRANSACTIONS: "style1_stock_transactions",
  SETTINGS: "style1_settings",
};

let isSyncing = false;

// Pull all live data from Supabase and sync with local cache
export async function pullFromSupabase(): Promise<boolean> {
  if (isSyncing) return false;
  isSyncing = true;
  console.log("[Supabase Sync] Starting pull from live Supabase database...");

  try {
    // 1. Store Settings
    try {
      const { data: settingsData } = await supabase.from("store_settings").select("*").maybeSingle();
      if (settingsData) {
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settingsData));
      }
    } catch (settingsErr) {
      console.warn("[Supabase Sync] Failed to fetch settings, using local cache:", settingsErr);
    }

    // 2. Categories
    try {
      const { data: categoriesData } = await supabase.from("categories").select("*").order("sort_order", { ascending: true });
      if (categoriesData) {
        localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categoriesData));
      }
    } catch (categoriesErr) {
      console.warn("[Supabase Sync] Failed to fetch categories, using local cache:", categoriesErr);
    }

    // 3. Customers & Customer Addresses
    let rawAddresses: CustomerAddress[] = [];
    try {
      const { data: addressesData } = await supabase.from("customer_addresses").select("*");
      if (addressesData) {
        rawAddresses = addressesData as CustomerAddress[];
      }
    } catch (addrErr) {
      console.warn("[Supabase Sync] Failed to fetch customer addresses:", addrErr);
    }

    try {
      const { data: customersData } = await supabase.from("customers").select("*");
      if (customersData) {
        const customers = (customersData as any[]).map((c) => {
          const custAddresses = rawAddresses.filter((a) => a.customer_id === c.customer_id);
          return {
            ...c,
            addresses: custAddresses,
          };
        });
        localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
      }
    } catch (custErr) {
      console.warn("[Supabase Sync] Failed to fetch customers:", custErr);
    }

    // 4. Shopkeepers
    try {
      const { data: shopkeepersData } = await supabase.from("shopkeepers").select("*");
      if (shopkeepersData) {
        localStorage.setItem(STORAGE_KEYS.SHOPKEEPERS, JSON.stringify(shopkeepersData));
      }
    } catch (shopErr) {
      console.warn("[Supabase Sync] Failed to fetch shopkeepers:", shopErr);
    }

    // 5. Products, Images, & Variants
    try {
      const { data: productsData } = await supabase.from("products").select("*");
      const { data: imagesData } = await supabase.from("product_images").select("*");
      const { data: variantsData } = await supabase.from("product_variants").select("*");

      if (!productsData || productsData.length === 0) {
        console.log("[Supabase Sync] Products table is empty in Supabase, seeding local demo data up to the cloud...");
        isSyncing = false;
        await pushToSupabase();
        isSyncing = true;
      } else {
        const images = (imagesData || []) as ProductImage[];
        const variants = (variantsData || []) as ProductVariant[];
        const products = (productsData as any[]).map((p) => {
          const prodImages = images.filter((img) => img.product_id === p.id);
          const prodVariants = variants.filter((v) => v.product_id === p.id);
          return {
            ...p,
            images: prodImages,
            variants: prodVariants,
          };
        });
        localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
      }
    } catch (prodErr) {
      console.warn("[Supabase Sync] Failed to fetch products, images, or variants:", prodErr);
    }

    // 6. Delivery Boys
    try {
      const { data: deliveryBoysData } = await supabase.from("delivery_boys").select("*");
      if (deliveryBoysData) {
        localStorage.setItem(STORAGE_KEYS.DELIVERY_BOYS, JSON.stringify(deliveryBoysData));
      }
    } catch (dboyErr) {
      console.warn("[Supabase Sync] Failed to fetch delivery boys:", dboyErr);
    }

    // 7. Orders, Items, & Status History
    try {
      const { data: ordersData } = await supabase.from("orders").select("*");
      const { data: orderItemsData } = await supabase.from("order_items").select("*");
      const { data: historyData } = await supabase.from("order_status_history").select("*");

      if (ordersData) {
        const items = (orderItemsData || []) as OrderItem[];
        const history = (historyData || []) as OrderStatusHistoryItem[];

        const orders = (ordersData as any[]).map((o) => {
          const orderItems = items.filter((item) => item.order_id === o.order_id);
          const orderHistory = history.filter((h) => h.order_id === o.order_id);
          
          // Find or map the delivery address
          let deliveryAddress = rawAddresses.find((a) => a.customer_id === o.customer_id && a.is_default);
          if (!deliveryAddress && rawAddresses.length > 0) {
            deliveryAddress = rawAddresses.filter((a) => a.customer_id === o.customer_id)[0];
          }
          if (!deliveryAddress) {
            deliveryAddress = {
              id: "addr-fallback",
              customer_id: o.customer_id,
              name: o.customer_name,
              mobile: o.mobile,
              pincode: "560001",
              address: "Delivered Address",
              city: "City",
              state: "State",
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
        localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
      }
    } catch (orderErr) {
      console.warn("[Supabase Sync] Failed to fetch orders, items, or status history:", orderErr);
    }

    // 8. Product Returns
    try {
      const { data: returnsData } = await supabase.from("product_returns").select("*");
      if (returnsData) {
        localStorage.setItem(STORAGE_KEYS.RETURNS, JSON.stringify(returnsData));
      }
    } catch (returnsErr) {
      console.warn("[Supabase Sync] Failed to fetch product returns:", returnsErr);
    }

    // 9. Stock Transactions
    try {
      const { data: transactionsData } = await supabase.from("stock_transactions").select("*");
      if (transactionsData) {
        localStorage.setItem(STORAGE_KEYS.STOCK_TRANSACTIONS, JSON.stringify(transactionsData));
      }
    } catch (txErr) {
      console.warn("[Supabase Sync] Failed to fetch stock transactions:", txErr);
    }

    console.log("[Supabase Sync] Successfully synchronized all local tables from Supabase!");
    isSyncing = false;
    return true;
  } catch (err) {
    console.error("[Supabase Sync] Error during pulling from Supabase:", err);
    isSyncing = false;
    return false;
  }
}

// Push all mutated local storage data to Supabase
export async function pushToSupabase(): Promise<boolean> {
  if (isSyncing) return false;
  isSyncing = true;
  console.log("[Supabase Sync] Pushing latest changes to Supabase database...");

  try {
    // 1. Settings
    const settingsStr = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (settingsStr) {
      const settingsObj = JSON.parse(settingsStr) as StoreSettings;
      await supabase.from("store_settings").upsert({
        id: 1,
        store_name: settingsObj.store_name,
        store_tagline: settingsObj.store_tagline,
        contact_email: settingsObj.contact_email,
        contact_phone: settingsObj.contact_phone,
        delivery_charge: settingsObj.delivery_charge,
        free_delivery_threshold: settingsObj.free_delivery_threshold,
        cod_enabled: settingsObj.cod_enabled,
        online_payment_enabled: settingsObj.online_payment_enabled,
        min_order_value: settingsObj.min_order_value,
        gst_percentage: settingsObj.gst_percentage,
        currency: settingsObj.currency,
        currency_symbol: settingsObj.currency_symbol,
        try_at_home_duration_minutes: settingsObj.try_at_home_duration_minutes,
        try_at_home_auto_close_on_expiry: settingsObj.try_at_home_auto_close_on_expiry,
        try_at_home_charge: settingsObj.try_at_home_charge,
      });
    }

    // 2. Categories
    const categoriesStr = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
    if (categoriesStr) {
      const categoriesList = JSON.parse(categoriesStr) as Category[];
      if (categoriesList.length > 0) {
        const rows = categoriesList.map((c) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          image: c.image || null,
          image_url: c.image_url || null,
          parent_id: c.parent_id || null,
          status: c.status,
          sort_order: c.sort_order || 0,
          display_order: c.display_order || 0,
          description: c.description || null,
        }));
        await supabase.from("categories").upsert(rows);
      }
    }

    // 3. Customers & Customer Addresses
    const customersStr = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
    if (customersStr) {
      const customersList = JSON.parse(customersStr) as Customer[];
      if (customersList.length > 0) {
        const customerRows = customersList.map((c) => ({
          id: c.id,
          customer_id: c.customer_id,
          name: c.name,
          mobile: c.mobile,
          email: c.email || null,
          status: c.status || "ACTIVE",
          total_orders: c.total_orders || 0,
          total_spent: c.total_spent || 0.00,
          last_order_at: c.last_order_at || null,
        }));
        await supabase.from("customers").upsert(customerRows);

        // Upload Customer Addresses
        const addressRows: any[] = [];
        customersList.forEach((c) => {
          if (c.addresses && c.addresses.length > 0) {
            c.addresses.forEach((addr) => {
              addressRows.push({
                id: addr.id,
                customer_id: c.customer_id,
                name: addr.name,
                mobile: addr.mobile,
                pincode: addr.pincode,
                address: addr.address,
                locality: addr.locality || null,
                city: addr.city,
                state: addr.state,
                landmark: addr.landmark || null,
                address_type: addr.address_type,
                is_default: addr.is_default,
              });
            });
          }
        });
        if (addressRows.length > 0) {
          await supabase.from("customer_addresses").upsert(addressRows);
        }
      }
    }

    // 4. Shopkeepers
    const shopkeepersStr = localStorage.getItem(STORAGE_KEYS.SHOPKEEPERS);
    if (shopkeepersStr) {
      const shopkeepersList = JSON.parse(shopkeepersStr) as Shopkeeper[];
      if (shopkeepersList.length > 0) {
        const rows = shopkeepersList.map((s) => ({
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
        }));
        await supabase.from("shopkeepers").upsert(rows);
      }
    }

    // 5. Products, Images, & Variants
    const productsStr = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    if (productsStr) {
      const productsList = JSON.parse(productsStr) as Product[];
      if (productsList.length > 0) {
        const productRows = productsList.map((p) => ({
          id: p.id,
          sku: p.sku,
          name: p.name,
          slug: p.slug,
          category_id: p.category_id,
          category_name: p.category_name,
          category_slug: p.category_slug || null,
          subcategory_id: p.subcategory_id || null,
          subcategory_name: p.subcategory_name || null,
          gender: p.gender,
          description: p.description || null,
          brand: p.brand || null,
          mrp: p.mrp,
          selling_price: p.selling_price,
          admin_selling_price: p.admin_selling_price || null,
          shopkeeper_price: p.shopkeeper_price || null,
          discount_percentage: p.discount_percentage || 0,
          stock: p.stock || 0,
          status: p.status,
          rating: p.rating || 5.0,
          rating_count: p.rating_count || 0,
          sizes: p.sizes || [],
          colors: p.colors || [],
          tags: p.tags || [],
          specifications: p.specifications || {},
          shopkeeper_id: p.shopkeeper_id || null,
          shopkeeper_name: p.shopkeeper_name || null,
          approval_status: p.approval_status || "APPROVED",
          rejection_reason: p.rejection_reason || null,
          is_live: p.is_live !== false,
        }));
        await supabase.from("products").upsert(productRows);

        // Upload Product Images
        const imageRows: any[] = [];
        productsList.forEach((p) => {
          if (p.images && p.images.length > 0) {
            p.images.forEach((img) => {
              imageRows.push({
                id: img.id,
                product_id: p.id,
                image_url: img.image_url,
                sort_order: img.sort_order || 0,
                is_primary: img.is_primary || false,
                caption: img.caption || null,
              });
            });
          }
        });
        if (imageRows.length > 0) {
          await supabase.from("product_images").upsert(imageRows);
        }

        // Upload Product Variants
        const variantRows: any[] = [];
        productsList.forEach((p) => {
          if (p.variants && p.variants.length > 0) {
            p.variants.forEach((v) => {
              variantRows.push({
                id: v.id,
                product_id: p.id,
                size: v.size,
                color: v.color,
                sku: v.sku,
                stock: v.stock || 0,
                price: v.price,
                mrp: v.mrp,
              });
            });
          }
        });
        if (variantRows.length > 0) {
          await supabase.from("product_variants").upsert(variantRows);
        }
      }
    }

    // 6. Delivery Boys
    const deliveryBoysStr = localStorage.getItem(STORAGE_KEYS.DELIVERY_BOYS);
    if (deliveryBoysStr) {
      const deliveryBoysList = JSON.parse(deliveryBoysStr) as DeliveryBoy[];
      if (deliveryBoysList.length > 0) {
        const rows = deliveryBoysList.map((d) => ({
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
        }));
        await supabase.from("delivery_boys").upsert(rows);
      }
    }

    // 7. Orders, Items, & Status History
    const ordersStr = localStorage.getItem(STORAGE_KEYS.ORDERS);
    if (ordersStr) {
      const ordersList = JSON.parse(ordersStr) as Order[];
      if (ordersList.length > 0) {
        const orderRows = ordersList.map((o) => ({
          id: o.id,
          order_id: o.order_id,
          invoice_number: o.invoice_number || null,
          customer_id: o.customer_id,
          customer_name: o.customer_name,
          mobile: o.mobile,
          email: o.email || null,
          subtotal: o.subtotal,
          discount: o.discount || 0,
          delivery_charge: o.delivery_charge || 0,
          tax_amount: o.tax_amount || 0,
          total: o.total,
          payment_method: o.payment_method,
          payment_status: o.payment_status,
          order_status: o.order_status,
          order_type: o.order_type || "standard",
          tracking_number: o.tracking_number || null,
          courier_partner: o.courier_partner || null,
          assigned_delivery_boy_id: o.assigned_delivery_boy_id || null,
          assigned_delivery_boy_name: o.assigned_delivery_boy_name || null,
          assigned_delivery_boy_mobile: o.assigned_delivery_boy_mobile || null,
          delivery_boy_assigned_at: o.delivery_boy_assigned_at || null,
          original_delivery_boy_id: o.original_delivery_boy_id || null,
          original_delivery_boy_name: o.original_delivery_boy_name || null,
          original_delivery_boy_mobile: o.original_delivery_boy_mobile || null,
          try_at_home_status: o.try_at_home_status || null,
          try_at_home_fee: o.try_at_home_fee || 0,
          try_at_home_duration_minutes: o.try_at_home_duration_minutes || null,
          try_at_home_expires_at: o.try_at_home_expires_at || null,
          try_at_home_closed_at: o.try_at_home_closed_at || null,
          try_at_home_decision_notes: o.try_at_home_decision_notes || null,
          try_at_home_delivered_at: o.try_at_home_delivered_at || null,
          replacement_credit_applied: o.replacement_credit_applied || 0,
          replacement_credit_source_order_id: o.replacement_credit_source_order_id || null,
        }));
        await supabase.from("orders").upsert(orderRows);

        // Upload Order Items
        const itemRows: any[] = [];
        ordersList.forEach((o) => {
          if (o.items && o.items.length > 0) {
            o.items.forEach((item) => {
              itemRows.push({
                id: item.id,
                order_id: o.order_id,
                product_id: item.product_id,
                product_name: item.product_name,
                brand: item.brand || null,
                sku: item.sku,
                quantity: item.quantity,
                price: item.price,
                mrp: item.mrp,
                size: item.size,
                color: item.color,
                image_url: item.image_url,
                item_status: item.item_status || null,
                cancelled_at: item.cancelled_at || null,
                cancellation_reason: item.cancellation_reason || null,
                return_status: item.return_status || null,
                returned_quantity: item.returned_quantity || 0,
                final_quantity: item.final_quantity || null,
                return_amount: item.return_amount || 0,
                final_amount: item.final_amount || null,
                return_id: item.return_id || null,
                return_reason: item.return_reason || null,
                return_remark: item.return_remark || null,
                return_requested_at: item.return_requested_at || null,
                return_accepted_at: item.return_accepted_at || null,
                return_completed_at: item.return_completed_at || null,
                stock_restored: item.stock_restored || false,
                request_type: item.request_type || null,
                is_replaced: item.is_replaced || false,
                replacement_size: item.replacement_size || null,
                replacement_color: item.replacement_color || null,
                replacement_reason: item.replacement_reason || null,
                replacement_amount: item.replacement_amount || 0,
                shopkeeper_id: item.shopkeeper_id || null,
                shopkeeper_name: item.shopkeeper_name || null,
              });
            });
          }
        });
        if (itemRows.length > 0) {
          await supabase.from("order_items").upsert(itemRows);
        }

        // Upload Order Status History
        const historyRows: any[] = [];
        ordersList.forEach((o) => {
          if (o.status_history && o.status_history.length > 0) {
            o.status_history.forEach((h) => {
              historyRows.push({
                id: h.id,
                order_id: o.order_id,
                status: h.status,
                changed_by: h.changed_by,
                changed_at: h.changed_at,
                notes: h.notes || null,
              });
            });
          }
        });
        if (historyRows.length > 0) {
          await supabase.from("order_status_history").upsert(historyRows);
        }
      }
    }

    // 8. Returns
    const returnsStr = localStorage.getItem(STORAGE_KEYS.RETURNS);
    if (returnsStr) {
      const returnsList = JSON.parse(returnsStr) as ProductReturn[];
      if (returnsList.length > 0) {
        const rows = returnsList.map((r) => ({
          return_id: r.return_id,
          order_id: r.order_id,
          invoice_number: r.invoice_number || null,
          product_id: r.product_id,
          product_name: r.product_name,
          size: r.size,
          color: r.color,
          customer_id: r.customer_id,
          customer_name: r.customer_name,
          customer_mobile: r.customer_mobile,
          customer_address: r.customer_address || null,
          delivery_boy_id: r.delivery_boy_id || null,
          delivery_boy_name: r.delivery_boy_name || null,
          delivery_boy_mobile: r.delivery_boy_mobile || null,
          quantity: r.quantity,
          product_price: r.product_price,
          return_amount: r.return_amount,
          status: r.status,
          reason: r.reason || null,
          remark: r.remark || null,
          requested_at: r.requested_at || null,
          assigned_at: r.assigned_at || null,
          accepted_at: r.accepted_at || null,
          confirmed_at: r.confirmed_at || null,
          completed_at: r.completed_at || null,
          stock_restored: r.stock_restored || false,
          request_type: r.request_type || null,
          replacement_size: r.replacement_size || null,
          replacement_color: r.replacement_color || null,
          replacement_reason: r.replacement_reason || null,
          replacement_amount: r.replacement_amount || 0,
          is_credit_adjusted: r.is_credit_adjusted || false,
          adjusted_in_order_id: r.adjusted_in_order_id || null,
          adjusted_at: r.adjusted_at || null,
        }));
        await supabase.from("product_returns").upsert(rows);
      }
    }

    // 9. Stock Transactions
    const transactionsStr = localStorage.getItem(STORAGE_KEYS.STOCK_TRANSACTIONS);
    if (transactionsStr) {
      const transactionsList = JSON.parse(transactionsStr) as StockTransaction[];
      if (transactionsList.length > 0) {
        const rows = transactionsList.map((t) => ({
          transaction_id: t.transaction_id,
          product_id: t.product_id,
          product_name: t.product_name,
          sku: t.sku,
          category_name: t.category_name || null,
          shopkeeper_id: t.shopkeeper_id || null,
          shopkeeper_name: t.shopkeeper_name || null,
          transaction_type: t.transaction_type,
          quantity: t.quantity,
          previous_stock: t.previous_stock,
          new_stock: t.new_stock,
          reason: t.reason || null,
          reference_note: t.reference_note || null,
          performed_by: t.performed_by,
          performed_by_name: t.performed_by_name,
          performed_by_id: t.performed_by_id,
          timestamp: t.timestamp || null,
          order_id: t.order_id || null,
        }));
        await supabase.from("stock_transactions").upsert(rows);
      }
    }

    console.log("[Supabase Sync] Successfully pushed all local mutations to Supabase!");
    isSyncing = false;
    return true;
  } catch (err) {
    console.error("[Supabase Sync] Error during pushing to Supabase:", err);
    isSyncing = false;
    return false;
  }
}
