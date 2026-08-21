<?php
/**
 * ตัวช่วยติดตั้งและตั้งค่าฐานข้อมูลอัตโนมัติ (Database Setup Wizard)
 * โรงเรียนมกุฎเมืองราชวิทยาลัย
 */

$message = "";
$message_type = "";
$status = "form";

if ($_SERVER["REQUEST_METHOD"] === "POST") {
    $host = trim($_POST["db_host"] ?? "localhost");
    $dbname = trim($_POST["db_name"] ?? "");
    $dbuser = trim($_POST["db_user"] ?? "");
    $dbpass = trim($_POST["db_pass"] ?? "");

    if (empty($dbname) || empty($dbuser)) {
        $message = "กรุณากรอกชื่อฐานข้อมูลและชื่อผู้ใช้ให้ครบถ้วน";
        $message_type = "danger";
    } else {
        try {
            // 1. ทดสอบการเชื่อมต่อ PDO
            $dsn = "mysql:host=$host;dbname=$dbname;charset=utf8mb4";
            $pdo = new PDO($dsn, $dbuser, $dbpass, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci"
            ]);

            // 2. สร้าง/อัปเดตไฟล์ config.php
            $config_content = "<?php\n"
                . "/**\n"
                . " * การตั้งค่าเชื่อมต่อฐานข้อมูล MySQL บน HostAtom\n"
                . " * โรงเรียนมกุฎเมืองราชวิทยาลัย\n"
                . " * สร้างโดย Database Setup Wizard เมื่อ: " . date("Y-m-d H:i:s") . "\n"
                . " */\n\n"
                . "define(\"DB_HOST\", " . var_export($host, true) . ");\n"
                . "define(\"DB_NAME\", " . var_export($dbname, true) . ");\n"
                . "define(\"DB_USER\", " . var_export($dbuser, true) . ");\n"
                . "define(\"DB_PASS\", " . var_export($dbpass, true) . ");\n\n"
                . "function getDB() {\n"
                . "    try {\n"
                . "        \$pdo = new PDO(\n"
                . "            \"mysql:host=\" . DB_HOST . \";dbname=\" . DB_NAME . \";charset=utf8mb4\",\n"
                . "            DB_USER,\n"
                . "            DB_PASS,\n"
                . "            [\n"
                . "                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,\n"
                . "                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,\n"
                . "                PDO::MYSQL_ATTR_INIT_COMMAND => \"SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci\"\n"
                . "            ]\n"
                . "        );\n"
                . "        return \$pdo;\n"
                . "    } catch (PDOException \$e) {\n"
                . "        header(\"Content-Type: application/json; charset=UTF-8\");\n"
                . "        echo json_encode([\n"
                . "            \"success\" => false, \n"
                . "            \"message\" => \"เชื่อมต่อฐานข้อมูลไม่สำเร็จ: \" . \$e->getMessage() . \" (โปรดตรวจสอบการตั้งค่าใน config.php หรือเข้าหน้า install.php)\"\n"
                . "        ], JSON_UNESCAPED_UNICODE);\n"
                . "        exit();\n"
                . "    }\n"
                . "}\n";

            file_put_contents(__DIR__ . "/config.php", $config_content);

            // 3. สร้างตารางฐานข้อมูลอัตโนมัติหากยังไม่มี
            $sql = <<<'SQL'
CREATE TABLE IF NOT EXISTS settings (
  setting_key varchar(50) NOT NULL PRIMARY KEY,
  setting_value varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO settings (setting_key, setting_value) VALUES
('term', '2'),
('year', '2567'),
('period', 'ก่อนกลางภาค'),
('status', 'OPEN')
ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value);

CREATE TABLE IF NOT EXISTS teachers (
  id int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  username varchar(50) NOT NULL UNIQUE,
  password varchar(255) NOT NULL,
  name varchar(100) NOT NULL,
  advisor_room varchar(50) DEFAULT NULL,
  role enum('Teacher','Admin') NOT NULL DEFAULT 'Teacher',
  created_at timestamp DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO teachers (username, password, name, role) VALUES
('admin', '1234', 'ผู้ดูแลระบบวิชาการ', 'Admin')
ON DUPLICATE KEY UPDATE name = VALUES(name);

CREATE TABLE IF NOT EXISTS students (
  id int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  student_no int(11) DEFAULT NULL,
  student_id varchar(20) NOT NULL,
  name varchar(100) NOT NULL,
  class_level varchar(10) NOT NULL,
  room varchar(10) NOT NULL,
  created_at timestamp DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_room (class_level, room),
  INDEX idx_student_id (student_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS teaching_load (
  id int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  teacher_name varchar(100) NOT NULL,
  subject_code varchar(20) NOT NULL,
  subject_name varchar(150) NOT NULL,
  class_level varchar(10) NOT NULL,
  room varchar(10) NOT NULL,
  term varchar(10) NOT NULL,
  year varchar(10) NOT NULL,
  created_at timestamp DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_teacher (teacher_name),
  INDEX idx_term_year (term, year)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS club_teachers (
  id int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  teacher_name varchar(100) NOT NULL,
  club_name varchar(100) NOT NULL,
  term varchar(10) NOT NULL,
  year varchar(10) NOT NULL,
  created_at timestamp DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS club_students (
  id int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  club_name varchar(100) NOT NULL,
  student_id varchar(20) NOT NULL,
  student_name varchar(100) NOT NULL,
  class_level varchar(10) DEFAULT NULL,
  room varchar(10) DEFAULT NULL,
  created_at timestamp DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_club (club_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS grades (
  id int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  term varchar(10) NOT NULL,
  year varchar(10) NOT NULL,
  period varchar(20) NOT NULL,
  subject_code varchar(20) NOT NULL,
  subject_name varchar(150) DEFAULT NULL,
  class_level varchar(10) NOT NULL,
  room varchar(10) NOT NULL,
  student_id varchar(20) NOT NULL,
  student_name varchar(100) NOT NULL,
  s1 varchar(10) DEFAULT NULL,
  s2 varchar(10) DEFAULT NULL,
  s3 varchar(10) DEFAULT NULL,
  s4 varchar(10) DEFAULT NULL,
  s5 varchar(10) DEFAULT NULL,
  s6 varchar(10) DEFAULT NULL,
  s7 varchar(10) DEFAULT NULL,
  s8 varchar(10) DEFAULT NULL,
  s9 varchar(10) DEFAULT NULL,
  s10 varchar(10) DEFAULT NULL,
  status varchar(20) DEFAULT 'ปกติ',
  teacher_name varchar(100) DEFAULT NULL,
  updated_at timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_query (term, year, period, subject_code, room),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS score_submissions (
  id int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  term varchar(10) NOT NULL,
  year varchar(10) NOT NULL,
  period varchar(50) NOT NULL,
  subject_code varchar(50) NOT NULL,
  subject_name varchar(255) NOT NULL,
  class_level varchar(50) NOT NULL,
  room varchar(50) NOT NULL,
  teacher_name varchar(255) NOT NULL,
  status enum('Submitted','Approved','Rejected') NOT NULL DEFAULT 'Submitted',
  submitted_at datetime DEFAULT NULL,
  approved_at datetime DEFAULT NULL,
  reject_reason text DEFAULT NULL,
  snapshot_grades longtext DEFAULT NULL,
  UNIQUE KEY unique_submission (term, year, period, subject_code, room)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
SQL;

            $pdo->exec($sql);

            $message = "เชื่อมต่อฐานข้อมูลและอัปเดตระบบสำเร็จเรียบร้อยแล้ว!";
            $message_type = "success";
            $status = "success";
        } catch (Exception $e) {
            $message = "เชื่อมต่อไม่สำเร็จ: " . $e->getMessage();
            $message_type = "danger";
        }
    }
} else {
    $host = "localhost";
    $dbname = "mmvsc_wichakar";
    $dbuser = "mmvsc_wichakar";
    $dbpass = "";
    if (file_exists(__DIR__ . "/config.php")) {
        $config_file = file_get_contents(__DIR__ . "/config.php");
        if (preg_match('/define\("DB_HOST",\s*"([^"]*)"\)/', $config_file, $matches)) $host = $matches[1];
        if (preg_match('/define\("DB_NAME",\s*"([^"]*)"\)/', $config_file, $matches)) $dbname = $matches[1];
        if (preg_match('/define\("DB_USER",\s*"([^"]*)"\)/', $config_file, $matches)) $dbuser = $matches[1];
        if (preg_match('/define\("DB_PASS",\s*"([^"]*)"\)/', $config_file, $matches)) $dbpass = $matches[1];
    }
}
?>
<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ตัวช่วยตั้งค่าฐานข้อมูลอัตโนมัติ (Database Setup Wizard)</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;600;700&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Sarabun', sans-serif; }
    </style>
</head>
<body class="bg-gray-100 min-h-screen flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-gray-200">
        <div class="bg-gradient-to-r from-blue-700 to-indigo-800 p-6 text-white text-center">
            <h1 class="text-xl font-bold">ตัวช่วยติดตั้งฐานข้อมูลอัตโนมัติ</h1>
            <p class="text-xs text-blue-100 mt-1">โรงเรียนมกุฎเมืองราชวิทยาลัย</p>
        </div>
        
        <div class="p-6">
            <?php if (!empty($message)): ?>
                <div class="mb-4 p-4 rounded-xl text-sm font-semibold border bg-<?= $message_type === 'success' ? 'green-50 text-green-700 border-green-200' : 'red-50 text-red-700 border-red-200' ?>">
                    <?= htmlspecialchars($message) ?>
                </div>
            <?php endif; ?>

            <?php if ($status === "success"): ?>
                <div class="text-center py-6">
                    <div class="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
                        ✓
                    </div>
                    <h3 class="text-lg font-bold text-gray-800">อัปเดตระบบเสร็จเรียบร้อย!</h3>
                    <p class="text-sm text-gray-500 mt-2">ขณะนี้ระบบฐานข้อมูลและไฟล์คอนฟิกได้รับการอัปเดตสำเร็จแล้ว</p>
                    <div class="mt-6 flex flex-col gap-3">
                        <a href="index.php" class="bg-blue-600 text-white font-bold py-2.5 px-6 rounded-xl hover:bg-blue-700 transition shadow-sm text-sm">
                            เข้าสู่หน้าล็อกอินระบบ
                        </a>
                        <p class="text-xs text-red-500 font-semibold">*กรุณาลบไฟล์ install.php ออกจากเซิร์ฟเวอร์เพื่อความปลอดภัย</p>
                    </div>
                </div>
            <?php else: ?>
                <form action="install.php" method="POST" class="space-y-4">
                    <div>
                        <label class="block text-sm font-semibold text-gray-700 mb-1">Host (โฮสต์ฐานข้อมูล):</label>
                        <input type="text" name="db_host" value="<?= htmlspecialchars($host) ?>" required class="w-full border border-gray-300 rounded-xl p-2.5 outline-none focus:border-blue-500 text-sm">
                    </div>
                    <div>
                        <label class="block text-sm font-semibold text-gray-700 mb-1">Database Name (ชื่อฐานข้อมูล):</label>
                        <input type="text" name="db_name" value="<?= htmlspecialchars($dbname) ?>" required class="w-full border border-gray-300 rounded-xl p-2.5 outline-none focus:border-blue-500 text-sm">
                    </div>
                    <div>
                        <label class="block text-sm font-semibold text-gray-700 mb-1">Database User (ชื่อผู้ใช้):</label>
                        <input type="text" name="db_user" value="<?= htmlspecialchars($dbuser) ?>" required class="w-full border border-gray-300 rounded-xl p-2.5 outline-none focus:border-blue-500 text-sm">
                    </div>
                    <div>
                        <label class="block text-sm font-semibold text-gray-700 mb-1">Database Password (รหัสผ่าน):</label>
                        <div class="relative">
                            <input type="password" id="dbPassInput" name="db_pass" value="<?= htmlspecialchars($dbpass) ?>" class="w-full border border-gray-300 rounded-xl p-2.5 pr-10 outline-none focus:border-blue-500 text-sm" placeholder="ไม่มีรหัสผ่าน (หากไม่ได้ตั้งค่า)">
                            <button type="button" onclick="togglePass()" class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                <span id="eyeIcon">👁️</span>
                            </button>
                        </div>
                    </div>
                    <script>
                    function togglePass() {
                        var inp = document.getElementById('dbPassInput');
                        var icon = document.getElementById('eyeIcon');
                        if (inp.type === 'password') {
                            inp.type = 'text';
                            icon.textContent = '🔒';
                        } else {
                            inp.type = 'password';
                            icon.textContent = '👁️';
                        }
                    }
                    </script>
                    <div class="pt-4">
                        <button type="submit" class="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition shadow-md text-sm">
                            เริ่มติดตั้งระบบ/อัปเดตตารางฐานข้อมูล
                        </button>
                    </div>
                </form>
            <?php endif; ?>
        </div>
    </div>
</body>
</html>
