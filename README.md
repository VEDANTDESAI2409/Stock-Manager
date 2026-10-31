# STOCK MANAGER — CCTV Stock & Karigar Management System

A simple, modern, robust full-stack management web application designed specifically for CCTV installation businesses. It allows a single administrator to maintain product inventory, issue materials to technicians (Karigars) for customer installation sites, track unused material returns, and manage daily attendance without any complex accounting or billing overhead.

---

## 🚀 Key Features & Business Modules

### 1. Admin Authentication & Security
- **Single Administrator Portal**: Dedicated secure login (`admin@stockmanager.com` / `Admin@123456`).
- **No Public Registration**: Zero unauthorized signups; technicians and customers do not have login accounts.
- **Security**: JWT authentication, bcrypt password hashing, secure HTTP-only cookies with fallback authorization headers, and brute-force rate limiting on `/api/auth/login`.

### 2. Product & Stock Inventory Management
- **Catalog Management**: Add, edit, view, and safely soft-delete CCTV equipment.
- **Categorization**: Group items under CCTV Camera, DVR, NVR, Hard Disk, Cable, Connector, Power Supply, and Accessories. Categories in active use are protected against accidental deletion.
- **Units of Measurement**: Piece, Box, Roll, Meter, Packet, Set.
- **Real-Time Stock Audit**:
  - **Stock In**: Receive newly delivered materials without financial or billing overhead.
  - **Manual Stock Out**: Deduct damaged, defective, or disposed items with mandatory reason tracking.
  - **Controlled Stock Adjustment**: Reconcile physical warehouse counts with an audit justification.
  - **Negative Stock Prevention**: Strict database-level and transaction-level safeguards prevent stock quantities from ever falling below zero.
  - **Low Stock Warnings**: Automated visual badges and dashboard alerts when `currentStock <= minStock`.

### 3. Karigar Management (Technicians)
- Register and maintain technician rosters (Full name, phone, residential address, notes).
- Activate or deactivate technicians. Deactivated technicians remain fully preserved in historical records.
- Comprehensive technician profile with:
  - Total jobs completed.
  - Material balance: total issued, total returned, and pending unreturned balance per product.
  - Work order history and attendance record.

### 4. Work Entry & Material Issue
- Issue multiple products simultaneously to a technician for a specific customer and site location.
- Automatic inventory deduction with rollback-safe transactions.
- Stock availability validation prevents issuing more units than are physically in the warehouse.
- Unique sequential Work Order numbers (e.g., `WO-20261031-0001`).
- Safeguarded order cancellation restores deducted inventory only if no materials have already been returned.

### 5. Material Return Management
- Dedicated return module linked directly to the original Work Order.
- Displays original issued quantities, previously returned quantities, and remaining returnable limits.
- Supports multiple partial returns while strictly enforcing `returnQuantity <= remainingIssuedQuantity`.
- Automatically restores returned items to the main warehouse inventory and logs a `MATERIAL_RETURN` audit transaction.

### 6. Daily Attendance Roster
- Mark daily attendance for all active technicians: **Present**, **Absent**, or **Half Day**.
- Fast "Mark All Present" shortcut and batch saving.
- Strict compound uniqueness `(karigar, date)` eliminates duplicate attendance entries.
- Monthly Attendance Matrix with month and year filters, summary counts, and CSV export.

### 7. Reports & History
- **Stock Movement Log**: Complete chronological audit trail of all Stock In, Stock Out, Work Issues, Returns, and Adjustments.
- **Karigar Material Balance**: Technician-wise issued vs. returned vs. pending return balances.
- **Customer Work History**: Site-by-site installation logs and equipment installed.
- **One-Click CSV Export**: Instant downloads for spreadsheets without financial complexity.

### 8. System Settings & Health Check
- Update administrator name and email.
- Change password with current password verification.
- Customize business name, phone, email, and address.
- Live `/api/health` connectivity check showing MongoDB status and replica set transaction support.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, Vite, Tailwind CSS, React Router DOM v6, Axios, Lucide React, Recharts |
| **Backend** | Node.js, Express.js (ES Modules), Mongoose 8 |
| **Database** | MongoDB Atlas (Cloud) with in-memory replica set fallback for offline dev/tests |
| **Auth & Security** | JWT, bcryptjs, HTTP-Only Cookies, Helmet, Express Rate Limit |

---

## 📂 Project Structure

```text
Stock-Manager/
├── backend/
│   ├── config/
│   │   └── db.js                 # Atlas connection + Replica Set fallback
│   ├── controllers/
│   │   ├── attendanceController.js
│   │   ├── authController.js
│   │   ├── categoryController.js
│   │   ├── karigarController.js
│   │   ├── materialReturnController.js
│   │   ├── productController.js
│   │   ├── reportController.js
│   │   └── settingsController.js
│   ├── middleware/
│   │   ├── authMiddleware.js
│   │   ├── errorHandler.js
│   │   └── rateLimiter.js
│   ├── models/
│   │   ├── Admin.js
│   │   ├── Attendance.js
│   │   ├── BusinessSetting.js
│   │   ├── Category.js
│   │   ├── Karigar.js
│   │   ├── MaterialReturn.js
│   │   ├── Product.js
│   │   ├── StockTransaction.js
│   │   └── WorkEntry.js
│   ├── routes/
│   │   ├── attendanceRoutes.js
│   │   ├── authRoutes.js
│   │   ├── categoryRoutes.js
│   │   ├── healthRoutes.js
│   │   ├── karigarRoutes.js
│   │   ├── materialReturnRoutes.js
│   │   ├── productRoutes.js
│   │   ├── reportRoutes.js
│   │   └── settingsRoutes.js
│   ├── scripts/
│   │   ├── seed.js               # Database seeder
│   │   └── testRunner.js         # Automated integration test suite
│   ├── services/
│   │   └── stockService.js       # Atomic stock deduction, issue & return logic
│   ├── server.js                 # Express server entry point
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/           # Navbar, Sidebar, Modal, StatCard, Badge, ConfirmModal
│   │   │   ├── karigar/          # KarigarModal, KarigarDetailModal
│   │   │   ├── returns/          # MaterialReturnModal, ReturnDetailModal
│   │   │   ├── stock/            # ProductForm, StockIn, StockOut, Adjust, CategoryModal
│   │   │   └── work/             # WorkEntryModal, WorkDetailModal, CancelWorkModal
│   │   ├── context/
│   │   │   ├── AuthContext.jsx
│   │   │   └── ToastContext.jsx
│   │   ├── layouts/
│   │   │   └── DashboardLayout.jsx
│   │   ├── pages/
│   │   │   ├── AttendancePage.jsx
│   │   │   ├── DashboardPage.jsx
│   │   │   ├── KarigarsPage.jsx
│   │   │   ├── LoginPage.jsx
│   │   │   ├── MaterialReturnsPage.jsx
│   │   │   ├── NotFoundPage.jsx
│   │   │   ├── ProductsPage.jsx
│   │   │   ├── ReportsPage.jsx
│   │   │   └── SettingsPage.jsx
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── utils/
│   │   │   └── csvExport.js
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── main.jsx
│   ├── index.html
│   ├── tailwind.config.js
│   ├── vite.config.js
│   └── package.json
├── .gitignore
├── README.md
└── package.json                  # Root orchestration scripts
```

---

## ⚡ Quick Start & Local Development

### Prerequisites
- **Node.js**: v18.0.0 or newer (tested on Node v24.15.0)
- **npm**: v9.0.0 or newer

### 1. Install Dependencies
In the root directory, install all root, backend, and frontend packages with:
```bash
npm run install:all
```
*(Or run `npm install` inside root, `backend/`, and `frontend/` individually).*

### 2. Configure Environment Variables
Copy `backend/.env.example` to `backend/.env`:
```bash
cp backend/.env.example backend/.env
```
Default `.env` settings:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=
JWT_SECRET=stock_manager_jwt_secret_key_secure_2026_cctv
ADMIN_NAME=System Admin
ADMIN_EMAIL=admin@stockmanager.com
ADMIN_PASSWORD=Admin@123456
CLIENT_URL=http://localhost:5173
```

> **Note on MongoDB**: If `MONGODB_URI` is left blank, the application automatically boots an internal in-memory replica set for instant local testing and development. To connect your cloud MongoDB Atlas database, see the instructions below.

### 3. Run the Application
Run both backend and frontend concurrently from the root directory:
```bash
npm run dev
```

Or start each service separately:
- **Backend API**:
  ```bash
  cd backend
  npm run dev
  # Running at http://localhost:5000 (Health Check: http://localhost:5000/api/health)
  ```
- **Frontend App**:
  ```bash
  cd frontend
  npm run dev
  # Running at http://localhost:5173
  ```

### 4. Admin Sign In
Open [http://localhost:5173](http://localhost:5173) in your browser:
- **Email**: `admin@stockmanager.com`
- **Password**: `Admin@123456`

---

## ☁️ MongoDB Atlas Cloud Setup Instructions

To connect your MongoDB Atlas cloud database:
1. Log in to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Create a free cluster (e.g., M0 Free Tier).
3. Under **Security → Database Access**, create a database user (e.g., `stockadmin`) with a secure password and `Read and write to any database` privileges.
4. Under **Security → Network Access**, add IP address `0.0.0.0/0` (or your specific server IP) to the whitelist.
5. In your cluster dashboard, click **Connect → Drivers → Node.js** and copy your connection string.
6. Open `backend/.env` and paste your URI into `MONGODB_URI`:
   ```env
   MONGODB_URI=mongodb+srv://stockadmin:<your_password>@cluster0.xxxx.mongodb.net/stock_manager?retryWrites=true&w=majority
   ```
7. Restart the backend service. It will automatically connect to MongoDB Atlas and seed the initial categories, products, and admin account!

---

## 🧪 Automated Testing Report

Run the built-in integration test suite:
```bash
npm run test
```
Or inside `backend/`:
```bash
cd backend && npm test
```

### Test Suite Execution Output:
```text
====================================================
 STARTING STOCK MANAGER AUTOMATED INTEGRATION TESTS
====================================================

--- TEST GROUP 1: AUTHENTICATION & SECURITY ---
  PASSED: Admin account exists in database
  PASSED: Admin password matches bcrypt hash
  PASSED: Invalid password correctly rejected

--- TEST GROUP 2: INVENTORY & STOCK OPERATIONS ---
  PASSED: Found target test product
  PASSED: Stock In adds exact quantity to currentStock
  PASSED: StockTransaction properly records STOCK_IN with audit trail
  PASSED: Manual Stock Out deducts exact quantity
  PASSED: STRICT RULE: Negative stock is strictly prevented on Stock Out
  PASSED: Controlled Stock Adjustment correctly updates stock

--- TEST GROUP 3: WORK ENTRY & MATERIAL ISSUE ---
  PASSED: Found active technician for test
  PASSED: Work Order created successfully
  PASSED: Stock automatically deducted on material issue
  PASSED: Insufficient stock prevents creating work entry

--- TEST GROUP 4: MATERIAL RETURN & SAFEGUARDS ---
  PASSED: Cannot return quantity greater than remaining issued quantity
  PASSED: Material Return logged successfully
  PASSED: Stock automatically incremented on material return
  PASSED: Work entry returnedQuantity updated to 2

--- TEST GROUP 5: ATTENDANCE RULES ---
  PASSED: Attendance successfully marked as PRESENT
  PASSED: Only one attendance record allowed per Karigar per date (no duplicates)
  PASSED: Attendance successfully updated without duplication

====================================================
 ALL TESTS PASSED: 20/20 tests succeeded.
====================================================
```

---

## 🛡️ Production Deployment Checklist

Before deploying this application to production:
1. Provide your production **MongoDB Atlas Connection String** in `backend/.env`.
2. Generate a long, random **JWT Secret** for `JWT_SECRET`.
3. Change the initial admin credentials in `ADMIN_EMAIL` and `ADMIN_PASSWORD` (or update through the Settings page after login).
4. Set `NODE_ENV=production` in `backend/.env`.
5. Set `CLIENT_URL` to your production frontend domain to ensure CORS and HTTP-only cookie security.
6. Run `npm run build` to generate optimized production static assets in `frontend/dist`.

---

## 📄 License
ISC License — Specifically crafted for CCTV stock and technician management.

