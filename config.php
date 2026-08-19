<?php
/**
 * การตั้งค่าเชื่อมต่อฐานข้อมูล MySQL บน HostAtom
 * โรงเรียนมกุฎเมืองราชวิทยาลัย (โดเมน: wichakar.mmvschool.ac.th)
 */

define("DB_HOST", "localhost");
define("DB_NAME", "mmvsc_wichakar");          // ชื่อฐานข้อมูล
define("DB_USER", "mmvsc_wichakar");          // ชื่อผู้ใช้ฐานข้อมูล
define("DB_PASS", "0RMYfx%kk9*ghkd1");         // รหัสผ่านฐานข้อมูล

function getDB() {
    try {
        $pdo = new PDO(
            "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4",
            DB_USER,
            DB_PASS,
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci"
            ]
        );
        return $pdo;
    } catch (PDOException $e) {
        header("Content-Type: application/json; charset=UTF-8");
        echo json_encode([
            "success" => false, 
            "message" => "เชื่อมต่อฐานข้อมูลไม่สำเร็จ: " . $e->getMessage() . " (โปรดตรวจสอบการตั้งค่าใน config.php)"
        ], JSON_UNESCAPED_UNICODE);
        exit();
    }
}
