<?php
/**
 * ไฟล์วินิจฉัยปัญหาระบบอัตโนมัติ (System Diagnostic)
 */
error_reporting(E_ALL);
ini_set('display_errors', 1);
?>
<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="UTF-8">
<title>วินิจฉัยระบบ</title>
<script src="https://cdn.tailwindcss.com"></script>
<link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&display=swap" rel="stylesheet">
<style>body{font-family:'Sarabun',sans-serif;}</style>
</head>
<body class="bg-gray-100 min-h-screen p-4">
<div class="max-w-3xl mx-auto">
<h1 class="text-2xl font-bold text-center text-blue-800 mb-6">🔍 ตรวจสอบระบบอัตโนมัติ</h1>

<?php
function showResult($title, $ok, $detail = "") {
    $color = $ok ? "green" : "red";
    $icon = $ok ? "✅" : "❌";
    echo "<div class='bg-white rounded-xl shadow p-4 mb-3 border-l-4 border-$color-500'>";
    echo "<div class='flex items-start gap-3'>";
    echo "<span class='text-xl'>$icon</span>";
    echo "<div><b class='text-gray-800'>$title</b>";
    if ($detail) echo "<p class='text-sm text-gray-600 mt-1'>$detail</p>";
    echo "</div></div></div>";
}

// 1. ตรวจสอบ PHP Version
showResult("PHP Version: " . phpversion(), version_compare(phpversion(), '7.0', '>='), "ต้องการ PHP 7.0 ขึ้นไป");

// 2. ตรวจสอบ PDO Extension
showResult("PDO MySQL Extension", extension_loaded('pdo_mysql'), extension_loaded('pdo_mysql') ? "โหลด PDO MySQL สำเร็จ" : "ไม่พบ PDO MySQL extension");

// 3. ตรวจสอบไฟล์ config.php
$configPath = __DIR__ . "/config.php";
$configExists = file_exists($configPath);
showResult("ไฟล์ config.php", $configExists, $configExists ? "พบไฟล์ที่ " . $configPath : "ไม่พบไฟล์ config.php!");

if ($configExists) {
    // แสดงเนื้อหาของ config.php (ซ่อนรหัสผ่านบางส่วน)
    $configContent = file_get_contents($configPath);
    echo "<div class='bg-gray-50 rounded-xl p-4 mb-3 border'>";
    echo "<b class='text-gray-700'>📄 เนื้อหา config.php:</b>";
    echo "<pre class='text-xs mt-2 bg-gray-800 text-green-400 p-3 rounded-lg overflow-x-auto'>" . htmlspecialchars($configContent) . "</pre>";
    echo "</div>";
}

// 4. ตรวจสอบไฟล์ api.php
$apiPath = __DIR__ . "/api.php";
$apiExists = file_exists($apiPath);
showResult("ไฟล์ api.php", $apiExists, $apiExists ? "ขนาด: " . number_format(filesize($apiPath)) . " bytes" : "ไม่พบไฟล์ api.php!");

// 5. ตรวจสอบไฟล์ index.php
$indexPath = __DIR__ . "/index.php";
$indexExists = file_exists($indexPath);
showResult("ไฟล์ index.php", $indexExists, $indexExists ? "ขนาด: " . number_format(filesize($indexPath)) . " bytes" : "ไม่พบไฟล์ index.php!");

// 6. ทดสอบเชื่อมต่อฐานข้อมูล
$dbOk = false;
$pdo = null;
if ($configExists) {
    try {
        require_once $configPath;
        $pdo = getDB();
        $dbOk = true;
        showResult("เชื่อมต่อฐานข้อมูลสำเร็จ", true, "DB: " . DB_NAME . " @ " . DB_HOST . " (User: " . DB_USER . ")");
    } catch (Exception $e) {
        showResult("เชื่อมต่อฐานข้อมูลล้มเหลว", false, $e->getMessage());
    }
}

// 7. ตรวจสอบตาราง
if ($dbOk && $pdo) {
    try {
        $tables = $pdo->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);
        showResult("ตารางในฐานข้อมูล: " . count($tables) . " ตาราง", count($tables) > 0, implode(", ", $tables));
        
        // เช็คตาราง teachers
        $hasTeachers = in_array("teachers", $tables);
        showResult("ตาราง teachers", $hasTeachers, $hasTeachers ? "พบตาราง teachers" : "ไม่พบตาราง teachers!");
        
        if ($hasTeachers) {
            // แสดงบัญชีทั้งหมด
            $stmt = $pdo->query("SELECT username, name, password, role FROM teachers ORDER BY role DESC, username ASC");
            $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            showResult("จำนวนบัญชีผู้ใช้: " . count($users) . " บัญชี", count($users) > 0);
            
            echo "<div class='bg-white rounded-xl shadow p-4 mb-3'>";
            echo "<b class='text-gray-700'>👥 รายชื่อบัญชีทั้งหมด:</b>";
            echo "<table class='w-full text-sm mt-2 border'>";
            echo "<tr class='bg-gray-100'><th class='p-2 text-left border'>Username</th><th class='p-2 text-left border'>ชื่อ</th><th class='p-2 text-left border'>รหัสผ่าน</th><th class='p-2 text-center border'>สิทธิ์</th></tr>";
            foreach ($users as $u) {
                echo "<tr class='hover:bg-blue-50'>";
                echo "<td class='p-2 border font-mono font-bold'>" . htmlspecialchars($u['username']) . "</td>";
                echo "<td class='p-2 border'>" . htmlspecialchars($u['name']) . "</td>";
                echo "<td class='p-2 border font-mono text-red-600 font-bold'>" . htmlspecialchars($u['password']) . "</td>";
                echo "<td class='p-2 border text-center'>" . $u['role'] . "</td>";
                echo "</tr>";
            }
            echo "</table></div>";
            
            // ทดสอบ Login admin กับ 1234
            $stmt = $pdo->prepare("SELECT * FROM teachers WHERE UPPER(username) = UPPER(?) AND password = ?");
            $stmt->execute(['admin', '1234']);
            $adminLogin = $stmt->fetch();
            showResult("ทดสอบ Login: admin / 1234", (bool)$adminLogin, $adminLogin ? "สำเร็จ! ชื่อ: " . $adminLogin['name'] : "ล้มเหลว - ไม่ตรงกัน");
            
            // ทดสอบ Login admin กับ Password@123
            $stmt2 = $pdo->prepare("SELECT * FROM teachers WHERE UPPER(username) = UPPER(?) AND password = ?");
            $stmt2->execute(['admin', 'Password@123']);
            $adminLogin2 = $stmt2->fetch();
            showResult("ทดสอบ Login: admin / Password@123", (bool)$adminLogin2, $adminLogin2 ? "สำเร็จ!" : "ล้มเหลว - ไม่ตรงกัน");
        }
        
        // เช็คตาราง score_submissions
        $hasSub = in_array("score_submissions", $tables);
        showResult("ตาราง score_submissions (ระบบสำเนาคะแนน)", $hasSub, $hasSub ? "พบตาราง" : "ยังไม่มีตาราง - ต้องรัน install.php");
        
    } catch (Exception $e) {
        showResult("เกิดข้อผิดพลาดในการตรวจสอบตาราง", false, $e->getMessage());
    }
}

// 8. ทดสอบเรียก API checkLogin โดยตรง
echo "<div class='bg-white rounded-xl shadow p-4 mb-3'>";
echo "<b class='text-gray-700'>🔌 ทดสอบเรียก API โดยตรง:</b>";
$apiUrl = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? "https" : "http") . "://" . $_SERVER['HTTP_HOST'] . dirname($_SERVER['REQUEST_URI']) . "/api.php?action=checkLogin";
echo "<p class='text-xs text-gray-500 mt-1'>URL: $apiUrl</p>";

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $apiUrl);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(["username" => "admin", "password" => "1234"]));
curl_setopt($ch, CURLOPT_HTTPHEADER, ["Content-Type: application/json"]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

if ($curlError) {
    showResult("API cURL Error", false, $curlError);
} else {
    $isSuccess = ($httpCode == 200);
    showResult("API HTTP Status: $httpCode", $isSuccess, "Response: " . htmlspecialchars(substr($response, 0, 500)));
}
echo "</div>";

// 9. ปุ่มรีเซ็ตรหัสผ่าน admin
if ($dbOk && $pdo) {
    if (isset($_GET['reset']) && $_GET['reset'] === '1') {
        $pdo->exec("UPDATE teachers SET password = '1234' WHERE username = 'admin'");
        $affected = $pdo->query("SELECT ROW_COUNT()")->fetchColumn();
        showResult("รีเซ็ตรหัสผ่าน admin เป็น 1234", true, "ดำเนินการเรียบร้อย");
    }
    echo "<div class='text-center mt-4 space-x-3'>";
    echo "<a href='?reset=1' class='bg-orange-500 text-white font-bold py-2.5 px-6 rounded-xl hover:bg-orange-600 transition shadow-sm text-sm inline-block'>🔑 รีเซ็ตรหัสผ่าน admin เป็น 1234</a>";
    echo "<a href='index.php' class='bg-blue-600 text-white font-bold py-2.5 px-6 rounded-xl hover:bg-blue-700 transition shadow-sm text-sm inline-block'>🏠 ไปหน้าเข้าสู่ระบบ</a>";
    echo "</div>";
}

echo "<p class='text-center text-xs text-red-500 font-semibold mt-4'>⚠️ กรุณาลบไฟล์ diagnostic.php ออกจากเซิร์ฟเวอร์ทันทีหลังใช้งานเสร็จ!</p>";
?>
</div>
</body>
</html>
