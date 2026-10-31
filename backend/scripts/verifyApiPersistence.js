const API_BASE = 'http://localhost:5000/api';

const runApiVerification = async () => {
  console.log('========================================================');
  console.log(' TESTING LIVE HTTP API WITH MONGODB ATLAS PERSISTENCE');
  console.log('========================================================\n');

  try {
    // 1. Health check
    console.log('[API TEST 1] Checking /api/health...');
    const healthRes = await fetch(`${API_BASE}/health`).then((r) => r.json());
    console.log(`- Health Status: ${healthRes.status}`);
    console.log(`- DB Type: ${healthRes.database.type}`);
    console.log(`- DB Host: ${healthRes.database.host}`);
    console.log(`- Replica Set / Transactions: ${healthRes.database.transactionsEnabled}`);
    if (healthRes.database.type !== 'MongoDB Atlas') {
      throw new Error(`Expected MongoDB Atlas but got ${healthRes.database.type}`);
    }

    // 2. Login
    console.log('\n[API TEST 2] Admin Login via /api/auth/login...');
    const loginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@stockmanager.com',
        password: 'Admin@123456',
      }),
    }).then((r) => r.json());

    if (!loginRes.success) throw new Error(loginRes.message);
    const token = loginRes.token;
    console.log(`- Login successful for: ${loginRes.admin.email}`);

    const authHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    // 3. Get Categories
    const catRes = await fetch(`${API_BASE}/categories`, { headers: authHeaders }).then((r) => r.json());
    const category = catRes.data[0];
    console.log(`- Using Category: ${category.name} (${category._id})`);

    // 4. Create Test Product via HTTP API
    const testSku = Date.now().toString().slice(-5);
    const productName = `API Atlas 8MP Bullet Camera (SKU-${testSku})`;
    console.log(`\n[API TEST 3] Creating Product via POST /api/products: "${productName}"...`);
    const createProdRes = await fetch(`${API_BASE}/products`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        name: productName,
        category: category._id,
        unit: 'Piece',
        initialStock: 15,
        minStock: 3,
        description: 'Tested via live HTTP API against MongoDB Atlas',
      }),
    }).then((r) => r.json());

    if (!createProdRes.success) throw new Error(createProdRes.message);
    const createdProduct = createProdRes.data;
    console.log(`✔ Product Created. ID: ${createdProduct._id}, Stock: ${createdProduct.currentStock}`);

    // 5. Get Karigars
    const kRes = await fetch(`${API_BASE}/karigars?status=ACTIVE`, { headers: authHeaders }).then((r) => r.json());
    const karigar = kRes.data[0];
    console.log(`\n[API TEST 4] Using Karigar: ${karigar.fullName} (${karigar._id})`);

    // 6. Create Work Entry & Issue Materials via HTTP API
    console.log('[API TEST 5] Creating Work Entry via POST /api/work-entries...');
    const workRes = await fetch(`${API_BASE}/work-entries`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        workDate: new Date().toISOString().slice(0, 10),
        karigar: karigar._id,
        customerName: `Live Atlas Customer ${testSku}`,
        customerAddress: 'Surat City Mall, Shop 101',
        notes: 'Testing live issue on Atlas',
        materials: [
          {
            product: createdProduct._id,
            issuedQuantity: 5,
          },
        ],
      }),
    }).then((r) => r.json());

    if (!workRes.success) throw new Error(workRes.message);
    const workEntry = workRes.data;
    console.log(`✔ Work Order Created: ${workEntry.workOrderNumber}`);

    // Check stock after issue
    const check1 = await fetch(`${API_BASE}/products/${createdProduct._id}`, { headers: authHeaders }).then((r) => r.json());
    console.log(`- Stock after issuing 5 pieces: ${check1.data.product.currentStock} (Expected: 10)`);
    if (check1.data.product.currentStock !== 10) {
      throw new Error('Stock deduction mismatch on Atlas!');
    }

    // 7. Material Return via HTTP API
    console.log('\n[API TEST 6] Returning 2 Unused Items via POST /api/returns...');
    const returnRes = await fetch(`${API_BASE}/returns`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        workEntryId: workEntry._id,
        karigarId: karigar._id,
        returnDate: new Date().toISOString().slice(0, 10),
        notes: 'Customer needed 3 cameras, 2 returned',
        items: [
          {
            product: createdProduct._id,
            returnedQuantity: 2,
          },
        ],
      }),
    }).then((r) => r.json());

    if (!returnRes.success) throw new Error(returnRes.message);
    console.log(`✔ Return Processed: ${returnRes.data.returnNumber}`);

    // Check stock after return
    const check2 = await fetch(`${API_BASE}/products/${createdProduct._id}`, { headers: authHeaders }).then((r) => r.json());
    console.log(`- Stock after returning 2 pieces: ${check2.data.product.currentStock} (Expected: 12)`);
    if (check2.data.product.currentStock !== 12) {
      throw new Error('Stock return restoration mismatch on Atlas!');
    }

    // 8. Daily Attendance via HTTP API
    console.log('\n[API TEST 7] Saving Daily Attendance via POST /api/attendance/save...');
    const today = new Date().toISOString().slice(0, 10);
    await fetch(`${API_BASE}/attendance/save`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        date: today,
        entries: [
          {
            karigarId: karigar._id,
            status: 'PRESENT',
            notes: 'Atlas live test attendance',
          },
        ],
      }),
    }).then((r) => r.json());

    const attCheck = await fetch(`${API_BASE}/attendance/date/${today}`, { headers: authHeaders }).then((r) => r.json());
    const myAtt = attCheck.data.find((a) => a.karigarId === karigar._id);
    console.log(`✔ Attendance for ${karigar.fullName} on ${today}: ${myAtt?.status}`);

    console.log('\n--------------------------------------------------------');
    console.log(' PHASE 1 COMPLETE: All HTTP API calls succeeded on Atlas.');
    console.log(` Saved Product ID: ${createdProduct._id}`);
    console.log(` Saved Work Order Number: ${workEntry.workOrderNumber}`);
    console.log(` Saved Return Number: ${returnRes.data.returnNumber}`);
    console.log('--------------------------------------------------------\n');

    process.exit(0);
  } catch (err) {
    console.error('\n❌ API Verification Failed:', err.message);
    process.exit(1);
  }
};

runApiVerification();
