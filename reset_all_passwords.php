<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once __DIR__ . "/config.php";

try {
    $pdo = getDB();
    $stmt = $pdo->prepare("UPDATE teachers SET password = 'Password@123'");
    $stmt->execute();
    $count = $stmt->rowCount();
    echo "<h2>✅ สำเร็จ! รีเซ็ตรหัสผ่านเป็น Password@123 เรียบร้อยแล้ว ทั้งหมด $count บัญชี</h2>";
} catch (Exception $e) {
    echo "<h2>❌ เกิดข้อผิดพลาด: " . htmlspecialchars($e->getMessage()) . "</h2>";
}
?>
