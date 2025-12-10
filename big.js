export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    const ADMIN_PASS = "abab111";      // كلمة مرور لوحة الإدارة
    const INTEGRITY_KEY = "alabod";

    const json = (obj) =>
      new Response(JSON.stringify(obj, null, 2), {
        headers: { "Content-Type": "application/json; charset=UTF-8" },
      });

    // ===== لوحة الإدارة /admin =====
    if (path === "/admin") {
      const pass = url.searchParams.get("pass");

      // إذا لم تُرسل كلمة المرور أو فارغة، عرض النموذج
      if (!pass || pass === "") {
        return new Response(`
          <html>
          <head>
            <meta charset="utf-8"/>
            <title>تسجيل الدخول</title>
            <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
          </head>
          <body class="bg-light">
            <div class="container mt-5">
              <div class="row justify-content-center">
                <div class="col-md-6">
                  <div class="card">
                    <div class="card-body">
                      <h2 class="text-center">🔐 ادخل كلمة المرور للوصول للوحة المفاتيح</h2>
                      <form method="GET" action="/admin">
                        <div class="mb-3">
                          <input name="pass" class="form-control" placeholder="كلمة المرور" required>
                        </div>
                        <button type="submit" class="btn btn-primary w-100">دخول</button>
                      </form>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </body>
          </html>
        `, { headers: { "Content-Type": "text/html; charset=UTF-8" } });
      }

      if (pass !== ADMIN_PASS) {
        return new Response("🚫 كلمة مرور خاطئة", { status: 403 });
      }

      // عرض لوحة الإدارة بعد إدخال كلمة المرور الصحيحة
      const keysList = await env.KEYS.list();
      let tableRows = "";
      for (const entry of keysList.keys) {
        const value = await env.KEYS.get(entry.name);
        const keyObj = JSON.parse(value);
        const currentUsers = keyObj.devices ? keyObj.devices.length : 0;
        let devicesInfo = "";
        if (keyObj.devices && keyObj.devices.length > 0) {
          keyObj.devices.forEach((d, index) => {
            const identifier = d.id ? `Device ID: ${d.id}` : `IP: ${d.ip}`;
            devicesInfo += `${identifier} (مرتبط في: ${d.boundAt}) <button class="btn btn-warning btn-xs delete-device" data-key="${entry.name}" data-index="${index}">🗑️</button><br>`;
          });
        } else {
          devicesInfo = "لا أجهزة مرتبطة";
        }
        tableRows += `
          <tr data-key="${entry.name}">
            <td>${entry.name}</td>
            <td>${keyObj.expire}</td>
            <td>${currentUsers} / ${keyObj.max_devices}</td>
            <td>${devicesInfo}</td>
            <td>
              <a href="/edit?key=${entry.name}&pass=${pass}" class="btn btn-primary btn-sm">✏️ تحرير</a>
              <button class="btn btn-danger btn-sm delete-key" data-key="${entry.name}">❌ حذف</button>
            </td>
          </tr>`;
      }

      const html = `
        <html>
        <head>
          <meta charset="UTF-8"/>
          <title>لوحة إدارة المفاتيح</title>
          <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
          <style>
            body { direction: rtl; }
          </style>
        </head>
        <body class="bg-light">
          <div class="container mt-4">
            <h2 class="text-center mb-4">🔑 لوحة إدارة المفاتيح المتقدمة</h2>

            <div class="card mb-4">
              <div class="card-body">
                <h5 class="card-title">إضافة مفتاح جديد</h5>
                <form id="add-form" method="POST" action="/add?pass=${pass}">
                  <div class="row">
                    <div class="col-md-4">
                      <input name="key" class="form-control" placeholder="اسم المفتاح" required>
                    </div>
                    <div class="col-md-4">
                      <input name="expire" type="date" class="form-control" placeholder="تاريخ الانتهاء (YYYY-MM-DD)">
                    </div>
                    <div class="col-md-3">
                      <input name="max_devices" type="number" min="1" class="form-control" placeholder="عدد الأجهزة (افتراضي 1)" value="1">
                    </div>
                    <div class="col-md-1">
                      <button type="submit" class="btn btn-success">➕ إضافة</button>
                    </div>
                  </div>
                </form>
              </div>
            </div>

            <h3 class="mb-3">📜 قائمة المفاتيح:</h3>
            <div class="table-responsive">
              <table class="table table-striped table-bordered">
                <thead class="table-dark">
                  <tr>
                    <th>اسم المفتاح</th>
                    <th>تاريخ الانتهاء</th>
                    <th>عدد المستخدمين / الحد الأقصى</th>
                    <th>الأجهزة المرتبطة (Device IDs or IPs)</th>
                    <th>إجراءات</th>
                  </tr>
                </thead>
                <tbody id="keys-table">
                  ${tableRows}
                </tbody>
              </table>
            </div>
          </div>
          <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
          <script>
            document.addEventListener('DOMContentLoaded', () => {
              const tableBody = document.getElementById('keys-table');

              // حذف مفتاح
              tableBody.addEventListener('click', async (e) => {
                if (e.target.classList.contains('delete-key')) {
                  if (!confirm('هل أنت متأكد من حذف هذا المفتاح؟')) return;
                  const key = e.target.dataset.key;
                  const response = await fetch('/delete?pass=${pass}', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams({ key: key })
                  });
                  if (response.ok) {
                    e.target.closest('tr').remove();
                  } else {
                    alert('فشل في حذف المفتاح');
                  }
                }

                // حذف جهاز
                if (e.target.classList.contains('delete-device')) {
                  if (!confirm('هل أنت متأكد من حذف هذا الجهاز؟')) return;
                  const key = e.target.dataset.key;
                  const index = e.target.dataset.index;
                  const response = await fetch('/delete_device?pass=${pass}', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams({ key: key, device_index: index })
                  });
                  if (response.ok) {
                    e.target.previousSibling.remove(); // إزالة الـbr
                    e.target.remove();
                  } else {
                    alert('فشل في حذف الجهاز');
                  }
                }
              });

              // إضافة مفتاح جديد دون تحديث الصفحة
              const addForm = document.getElementById('add-form');
              addForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = new FormData(addForm);
                const response = await fetch(addForm.action, {
                  method: 'POST',
                  body: formData
                });
                if (response.ok) {
                  location.reload(); // لإعادة تحميل الجدول بعد الإضافة (يمكن تحسينه لاحقاً)
                } else {
                  alert('فشل في إضافة المفتاح');
                }
              });
            });
          </script>
        </body>
        </html>
      `;
      return new Response(html, { headers: { "Content-Type": "text/html; charset=UTF-8" } });
    }

    // ===== إضافة مفتاح =====
    if (path === "/add") {
      const pass = url.searchParams.get("pass");
      if (pass !== ADMIN_PASS) return new Response("🚫 غير مصرح لك", { status: 403 });

      const form = await request.formData();
      const key = form.get("key");
      let expireInput = form.get("expire") || "2025-12-31";
      const maxDevices = parseInt(form.get("max_devices")) || 1;

      // تصحيح تنسيق التاريخ: إضافة أصفار إذا لزم الأمر
      let [year, month, day] = expireInput.split('-');
      if (month && month.length === 1) month = '0' + month;
      if (day && day.length === 1) day = '0' + day;
      let expire = `${year}-${month}-${day}T23:59:59Z`;

      // التحقق من صلاحية التاريخ
      const expireDate = new Date(expire);
      if (isNaN(expireDate.getTime())) {
        return new Response("❌ تنسيق التاريخ غير صالح. استخدم YYYY-MM-DD", { status: 400 });
      }

      const keyData = {
        expire: expire,
        max_devices: maxDevices,
        devices: []  // مصفوفة لتخزين الأجهزة المرتبطة (Device IDs or IPs)
      };

      await env.KEYS.put(key, JSON.stringify(keyData));
      return new Response(`✅ تم حفظ المفتاح ${key} بعدد أجهزة مسموحة: ${maxDevices}`, {
        headers: { "Location": `/admin?pass=${pass}` },
        status: 302
      });
    }

    // ===== تحرير مفتاح /edit =====
    if (path === "/edit") {
      const pass = url.searchParams.get("pass");
      if (pass !== ADMIN_PASS) return new Response("🚫 غير مصرح لك", { status: 403 });

      const key = url.searchParams.get("key");
      if (!key) return new Response("❌ المفتاح غير محدد", { status: 400 });

      const raw = await env.KEYS.get(key);
      if (!raw) return new Response("❌ المفتاح غير موجود", { status: 404 });

      const keyObj = JSON.parse(raw);
      const expireDate = keyObj.expire.split('T')[0]; // لعرض في input type=date

      if (request.method === "GET") {
        const html = `
          <html>
          <head>
            <meta charset="UTF-8"/>
            <title>تحرير المفتاح</title>
            <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
            <style>
              body { direction: rtl; }
            </style>
          </head>
          <body class="bg-light">
            <div class="container mt-4">
              <h2 class="text-center mb-4">✏️ تحرير المفتاح: ${key}</h2>
              <div class="card">
                <div class="card-body">
                  <form method="POST" action="/edit?pass=${pass}&key=${key}">
                    <div class="mb-3">
                      <label>تاريخ الانتهاء:</label>
                      <input name="expire" type="date" class="form-control" value="${expireDate}" required>
                    </div>
                    <div class="mb-3">
                      <label>عدد الأجهزة المسموحة:</label>
                      <input name="max_devices" type="number" min="1" class="form-control" value="${keyObj.max_devices}" required>
                    </div>
                    <button type="submit" class="btn btn-primary">💾 حفظ التغييرات</button>
                    <a href="/admin?pass=${pass}" class="btn btn-secondary">🔙 عودة</a>
                  </form>
                </div>
              </div>
            </div>
            <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
          </body>
          </html>
        `;
        return new Response(html, { headers: { "Content-Type": "text/html; charset=UTF-8" } });
      } else if (request.method === "POST") {
        const form = await request.formData();
        let expireInput = form.get("expire");
        const maxDevices = parseInt(form.get("max_devices")) || keyObj.max_devices;

        // تصحيح تنسيق التاريخ: إضافة أصفار إذا لزم الأمر
        let [year, month, day] = expireInput.split('-');
        if (month && month.length === 1) month = '0' + month;
        if (day && day.length === 1) day = '0' + day;
        let expire = `${year}-${month}-${day}:23:59:59Z`;

        const expireDate = new Date(expire);
        if (isNaN(expireDate.getTime())) {
          return new Response("❌ تنسيق التاريخ غير صالح. استخدم YYYY-MM-DD", { status: 400 });
        }

        keyObj.expire = expire;
        keyObj.max_devices = maxDevices;

        await env.KEYS.put(key, JSON.stringify(keyObj));
        return new Response(`✅ تم تحديث المفتاح ${key}`, {
          headers: { "Location": `/admin?pass=${pass}` },
          status: 302
        });
      }
    }

    // ===== حذف جهاز /delete_device =====
    if (path === "/delete_device") {
      const pass = url.searchParams.get("pass");
      if (pass !== ADMIN_PASS) return new Response("🚫 غير مصرح لك", { status: 403 });

      const form = await request.formData();
      const key = form.get("key");
      const deviceIndex = parseInt(form.get("device_index"));

      const raw = await env.KEYS.get(key);
      if (!raw) return json({ error: "المفتاح غير موجود" });

      let keyObj = JSON.parse(raw);
      if (keyObj.devices && keyObj.devices[deviceIndex]) {
        keyObj.devices.splice(deviceIndex, 1);
        await env.KEYS.put(key, JSON.stringify(keyObj));
      }

      return json({ success: true });
    }

    // ===== حذف مفتاح =====
    if (path === "/delete") {
      const pass = url.searchParams.get("pass");
      if (pass !== ADMIN_PASS) return new Response("🚫 غير مصرح لك", { status: 403 });

      const form = await request.formData();
      const key = form.get("key");
      await env.KEYS.delete(key);
      return json({ success: true });
    }

    // ===== التحقق من المفتاح للتطبيق =====
    try {
      let key = url.searchParams.get("key")?.trim(); // trim المسافات من key
      const integrity = url.searchParams.get("integrityKey");
      const deviceID = url.searchParams.get("dev") || null; // دعم لـ device ID

      // الحصول على IP الفعلي للعميل
      const clientIP = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || null;

      if (!key || !integrity)
        return json({ Status: "Failed", Toast: "Missing parameters", Code: 400 });

      if (integrity !== INTEGRITY_KEY)
        return json({ Status: "Failed", Toast: "Integrity Failed", Code: 403 });

      const raw = await env.KEYS.get(key);
      if (!raw) return json({ Status: "Failed", Toast: "Wrong User Key", Code: 401 });

      let keyObj = JSON.parse(raw);

      // تحقق من انتهاء الصلاحية
      const now = new Date().getTime();
      const expireTime = new Date(keyObj.expire).getTime();
      if (isNaN(expireTime)) {
        return json({ Status: "Failed", Toast: "Invalid Expiration Date", Code: 400 });
      }
      if (now > expireTime) return json({ Status: "Failed", Toast: "Key Expired!", Code: 403 });

      let identifier = deviceID || clientIP;
      let isDeviceID = !!deviceID;
      let isIP = !deviceID && !!clientIP;

      if (!identifier) {
        return json({ Status: "Failed", Toast: "Unable to detect Device ID or IP", Code: 400 });
      }

      // تحقق إذا كان الـ identifier مرتبطًا بالفعل
      const deviceExists = keyObj.devices.some(d => (isDeviceID && d.id === identifier) || (isIP && d.ip === identifier));

      if (!deviceExists) {
        // تحقق من عدد الأجهزة المرتبطة
        if (keyObj.devices.length >= keyObj.max_devices) {
          return json({ Status: "Failed", Toast: "Maximum devices reached for this key", Code: 401 });
        }

        // إضافة الـ identifier الجديد
        const newDevice = {
          boundAt: new Date().toISOString()
        };
        if (isDeviceID) {
          newDevice.id = identifier;
        } else {
          newDevice.ip = identifier;
        }
        keyObj.devices.push(newDevice);
        await env.KEYS.put(key, JSON.stringify(keyObj));
      }

      return json({ Status: "Success", Toast: "Login Successful", Username: key, Expire: keyObj.expire, Code: 200 });
    } catch (err) {
      return json({ Status: "Error", Toast: "Server Error", Code: 500, Error: err.message });
    }
  },
};
