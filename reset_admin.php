<?php
/**
 * รีเซ็ตรหัสผ่าน admin กลับเป็น 1234
 */
require_once __DIR__ . "/config.php";
$pdo = getDB();

// รีเซ็ตรหัสผ่าน admin เป็น 1234
$stmt = $pdo->prepare("UPDATE teachers SET password = '1234' WHERE username = 'admin'");
$stmt->execute();

// ถ้าไม่มี admin ให้สร้างใหม่
if ($stmt->rowCount() === 0) {
    $stmt = $pdo->prepare("INSERT INTO teachers (username, password, name, role) VALUES ('admin', '1234', 'ผู้ดูแลระบบวิชาการ', 'Admin') ON DUPLICATE KEY UPDATE password = '1234'");
    $stmt->execute();
}

// แสดงบัญชีทั้งหมดในระบบเพื่อตรวจสอบ
$stmt2 = $pdo->query("SELECT username, name, password, role FROM teachers ORDER BY role DESC, username ASC");
$users = $stmt2->fetchAll(PDO::FETCH_ASSOC);
?>
<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="UTF-8">
<title>รีเซ็ตรหัสผ่าน</title>
<script src="https://cdn.tailwindcss.com"></script>
<link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&display=swap" rel="stylesheet">
<style>body{font-family:'Sarabun',sans-serif;}</style>
</head>
<body class="bg-gray-100 min-h-screen flex items-center justify-center p-4">
<div class="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden">
    <div class="bg-green-600 p-5 text-white text-center">
        <h1 class="text-xl font-bold">✅ รีเซ็ตรหัสผ่านสำเร็จ!</h1>
    </div>
    <div class="p-6">
        <div class="bg-green-50 border border-green-200 rounded-xl p-4 mb-4 text-center">
            <p class="text-green-800 font-bold text-lg">รหัสผ่าน admin ถูกรีเซ็ตเป็น: <span class="text-2xl text-green-600">1234</span></p>
            <p class="text-sm text-green-700 mt-1">สามารถเข้าสู่ระบบด้วย Username: <b>admin</b> / Password: <b>1234</b></p>
        </div>

        <h3 class="font-bold text-gray-700 mb-2">📋 บัญชีผู้ใช้ทั้งหมดในระบบ (<?= count($users) ?> บัญชี):</h3>
        <div class="overflow-x-auto border rounded-xl">
            <table class="w-full text-sm">
                <thead><tr class="bg-gray-100 text-gray-600">
                    <th class="p-3 text-left">Username</th>
                    <th class="p-3 text-left">ชื่อ</th>
                    <th class="p-3 text-left">รหัสผ่าน</th>
                    <th class="p-3 text-center">สิทธิ์</th>
                </tr></thead>
                <tbody>
                <?php foreach ($users as $u): ?>
                <tr class="border-t hover:bg-blue-50">
                    <td class="p-3 font-mono font-bold"><?= htmlspecialchars($u['username']) ?></td>
                    <td class="p-3"><?= htmlspecialchars($u['name']) ?></td>
                    <td class="p-3 font-mono text-red-600"><?= htmlspecialchars($u['password']) ?></td>
                    <td class="p-3 text-center"><span class="px-2 py-1 rounded-full text-xs font-bold <?= $u['role']==='Admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700' ?>"><?= $u['role'] ?></span></td>
                </tr>
                <?php endforeach; ?>
                </tbody>
            </table>
        </div>

        <div class="mt-6 text-center">
            <a href="index.php" class="bg-blue-600 text-white font-bold py-2.5 px-8 rounded-xl hover:bg-blue-700 transition shadow-sm text-sm inline-block">
                ไปหน้าเข้าสู่ระบบ →
            </a>
            <p class="text-xs text-red-500 font-semibold mt-3">⚠️ กรุณาลบไฟล์ reset_admin.php ออกจากเซิร์ฟเวอร์ทันทีหลังใช้งานเสร็จ!</p>
        </div>
    </div>
</div>
</body>
</html>
