# ⚡ FATAFAT

### Celebrate. Gift. Indulge. Fatafat.

FATAFAT is a modern quick-commerce platform designed for fast delivery of cakes, flowers, gifts, chocolates, bakery items, pastries and celebration products.

The platform combines a premium shopping experience with fast local delivery and dedicated Admin and Delivery Partner systems.

---

## ✨ Features

### 🛍️ Customer Storefront

- Browse cakes, flowers, gifts, chocolates, bakery and pastries
- Search and filter products
- Product variants and quantities
- Shopping cart
- Checkout
- Order tracking
- Location-based product availability
- Wishlist
- Customer account
- Fast delivery experience

### 🎂 Cakes & Bakery

- Birthday cakes
- Chocolate cakes
- Designer cakes
- Eggless cakes
- Pastries
- Bakery products
- Celebration combos

### 🌸 Flowers & Gifts

- Roses
- Bouquets
- Flower boxes
- Birthday gifts
- Anniversary gifts
- Personalised gifts
- Gift hampers
- Chocolates

### 🔞 Wellness 18+

FATAFAT includes a separate age-restricted Wellness section.

Access flow:

Google Sign In  
→ Wellness Access Request  
→ Admin Review  
→ Approval  
→ Wellness Access

The Wellness section is completely separated from the normal storefront.

### 👨‍💼 Admin Console

Admin features include:

- Dashboard
- Order management
- Product management
- Category management
- Inventory management
- Customer management
- Coupons and offers
- Delivery management
- Delivery partner management
- Wellness access requests
- Analytics
- Activity logs
- Role-based permissions

### 🛵 Delivery Partner Portal

Dedicated FATAFAT Delivery interface for delivery partners.

Features:

- Assigned deliveries
- Order status updates
- Pickup confirmation
- Out-for-delivery workflow
- Delivery completion
- Delivery history
- Navigation
- Customer contact options
- Inventory issue reporting
- Limited stock updates

Delivery partners can only access orders assigned to them.

### 📍 Location-Based Delivery

Currently supported locations:

- Nawabganj, Unnao
- Chandigarh University, Uttar Pradesh

Orders and delivery partner assignments are location-aware.

---

## 🔐 Role-Based Access

FATAFAT supports different user roles:

| Role | Access |
|---|---|
| Customer | Storefront, cart, checkout and own orders |
| Delivery Partner | Assigned deliveries and permitted inventory actions |
| Inventory Manager | Inventory management |
| Admin | Commerce and operational management |
| Super Admin | Full platform access |

Access control is enforced on the backend and not only through the frontend UI.

---

## 🔄 Order Flow

```text
Customer
   ↓
Browse Products
   ↓
Add to Cart
   ↓
Checkout
   ↓
Order Created
   ↓
Admin Receives Order
   ↓
Order Prepared
   ↓
Delivery Partner Assigned
   ↓
Partner Receives Order
   ↓
Picked Up
   ↓
Out for Delivery
   ↓
Delivered
