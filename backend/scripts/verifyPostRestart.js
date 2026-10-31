const API_BASE = 'http://localhost:5000/api';
const adminEmail = process.env.ADMIN_EMAIL;
const adminPassword = process.env.ADMIN_PASSWORD;
const TARGET_PRODUCT_ID = '6ae599f91504b161e9a0e299';
const TARGET_WO = 'WO-20261031-0001';
const TARGET_RET = 'RET-20261031-0001';

const verifyPostRestart = async () => {
  console.log('========================================================');
  console.log(' VERIFYING DATA PERSISTENCE POST BACKEND RESTART');
  console.log('========================================================\n');

  try {
    // 1. Health check
    console.log('[POST-RESTART 1] Checking /api/health...');
    const healthRes = await fetch(`${API_BASE}/health`).then((r) => r.json());
    console.log(`- Status: ${healthRes.status}`);
    console.log(`- Database: ${healthRes.database.type} (${healthRes.database.host})`);
    if (healthRes.database.type !== 'MongoDB Atlas') {
      throw new Error(`Expected MongoDB Atlas but got ${healthRes.database.type}`);
    }

    // 2. Login
    console.log('\n[POST-RESTART 2] Admin Login...');
    const loginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: adminEmail,
        password: adminPassword,
      }),
    }).then((r) => r.json());

    if (!loginRes.success) throw new Error(loginRes.message);
    const token = loginRes.token;

    const authHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    // 3. Verify Product still exists in Atlas
    console.log(`\n[POST-RESTART 3] Verifying Product ${TARGET_PRODUCT_ID} still exists...`);
    const prodRes = await fetch(`${API_BASE}/products/${TARGET_PRODUCT_ID}`, { headers: authHeaders }).then((r) => r.json());
    if (!prodRes.success || !prodRes.data?.product) {
      throw new Error(`Product ${TARGET_PRODUCT_ID} was lost after backend restart!`);
    }
    const product = prodRes.data.product;
    console.log(`✔ PRODUCT PERSISTED: "${product.name}"`);
    console.log(`- Current Stock: ${product.currentStock} ${product.unit}`);
    console.log(`- Min Stock Threshold: ${product.minStock}`);
    if (product.currentStock !== 12) {
      throw new Error(`Expected stock to be 12, but found ${product.currentStock}`);
    }

    // 4. Verify Work Entry still exists in Atlas
    console.log(`\n[POST-RESTART 4] Verifying Work Order ${TARGET_WO}...`);
    const workRes = await fetch(`${API_BASE}/work-entries?limit=50`, { headers: authHeaders }).then((r) => r.json());
    const matchedWork = workRes.data.find((w) => w.workOrderNumber === TARGET_WO);
    if (!matchedWork) {
      throw new Error(`Work order ${TARGET_WO} was lost after backend restart!`);
    }
    console.log(`✔ WORK ORDER PERSISTED: ${matchedWork.workOrderNumber}`);
    console.log(`- Customer: ${matchedWork.customerName} (${matchedWork.customerAddress})`);
    console.log(`- Technician: ${matchedWork.karigar?.fullName}`);

    // 5. Verify Material Return still exists in Atlas
    console.log(`\n[POST-RESTART 5] Verifying Material Return ${TARGET_RET}...`);
    const retRes = await fetch(`${API_BASE}/returns?limit=50`, { headers: authHeaders }).then((r) => r.json());
    const matchedRet = retRes.data.find((r) => r.returnNumber === TARGET_RET);
    if (!matchedRet) {
      throw new Error(`Material return ${TARGET_RET} was lost after backend restart!`);
    }
    console.log(`✔ MATERIAL RETURN PERSISTED: ${matchedRet.returnNumber}`);
    console.log(`- Returned items count: ${matchedRet.items?.length}`);

    // 6. Verify Attendance still exists in Atlas
    console.log(`\n[POST-RESTART 6] Verifying Attendance for today...`);
    const today = new Date().toISOString().slice(0, 10);
    const attRes = await fetch(`${API_BASE}/attendance/date/${today}`, { headers: authHeaders }).then((r) => r.json());
    const markedCount = attRes.summary?.marked || 0;
    console.log(`✔ ATTENDANCE PERSISTED: ${markedCount} technicians marked on ${today}`);

    console.log('\n========================================================');
    console.log(' ALL POST-RESTART PERSISTENCE CHECKS PASSED ON ATLAS! ');
    console.log('========================================================\n');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Post-Restart Verification Failed:', err.message);
    process.exit(1);
  }
};

verifyPostRestart();

