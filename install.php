<?php
/**
 * ตัวช่วยติดตั้งและตั้งค่าฐานข้อมูลอัตโนมัติ (Database Setup Wizard)
 * โรงเรียนมกุฎเมืองราชวิทยาลัย
 */

 = "";
 = "";
 = "form";

if (["REQUEST_METHOD"] === "POST") {
     = trim(["db_host"] ?? "localhost");
     = trim(["db_name"] ?? "");
     = trim(["db_user"] ?? "");
     = trim(["db_pass"] ?? "");

    if (empty() || empty()) {
         = "กรุณากรอกชื่อฐานข้อมูลและชื่อผู้ใช้ให้ครบถ้วน";
         = "danger";
    } else {
        try {
            // 1. ทดสอบการเชื่อมต่อ PDO
             = "mysql:host=;dbname=;charset=utf8mb4";
             = new PDO(, , , [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci"
            ]);

            // 2. สร้าง/อัปเดตไฟล์ config.php
             = "<?php\n"
                . "/**\n"
                . " * การตั้งค่าเชื่อมต่อฐานข้อมูล MySQL บน HostAtom\n"
                . " * โรงเรียนมกุฎเมืองราชวิทยาลัย\n"
                . " * สร้างโดย Database Setup Wizard เมื่อ: " . date("Y-m-d H:i:s") . "\n"
                . " */\n\n"
                . "define(\"DB_HOST\", " . var_export(, true) . ");\n"
                . "define(\"DB_NAME\", " . var_export(, true) . ");\n"
                . "define(\"DB_USER\", " . var_export(, true) . ");\n"
                . "define(\"DB_PASS\", " . var_export(, true) . ");\n\n"
                . "function getDB() {\n"
                . "    try {\n"
                . "        \ = new PDO(\n"
                . "            \"mysql:host=\" . DB_HOST . \";dbname=\" . DB_NAME . \";charset=utf8mb4\",\n"
                . "            DB_USER,\n"
                . "            DB_PASS,\n"
                . "            [\n"
                . "                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,\n"
                . "                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,\n"
                . "                PDO::MYSQL_ATTR_INIT_COMMAND => \"SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci\"\n"
                . "            ]\n"
                . "        );\n"
                . "        return \;\n"
                . "    } catch (PDOException \) {\n"
                . "        header(\"Content-Type: application/json; charset=UTF-8\");\n"
                . "        echo json_encode([\n"
                . "            \"success\" => false, \n"
                . "            \"message\" => \"เชื่อมต่อฐานข้อมูลไม่สำเร็จ: \" . \->getMessage() . \" (โปรดตรวจสอบการตั้งค่าใน config.php หรือเข้าหน้า install.php)\"\n"
                . "        ], JSON_UNESCAPED_UNICODE);\n"
                . "        exit();\n"
                . "    }\n"
                . "}\n";

            file_put_contents(__DIR__ . "/config.php", );

            // 3. สร้างตารางฐานข้อมูลอัตโนมัติหากยังไม่มี
             = <<<SQL
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

CREATE TABLE IF NOT EXISTS 	eachers (
  id int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  username varchar(50) NOT NULL UNIQUE,
  password varchar(255) NOT NULL,
  
ame varchar(100) NOT NULL,
  dvisor_room varchar(50) DEFAULT NULL,
  ole enum('Teacher','Admin') NOT NULL DEFAULT 'Teacher',
  created_at timestamp DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO 	eachers (username, password, 
ame, ole) VALUES
('admin', '1234', 'ผู้ดูแลระบบวิชาการ', 'Admin')
ON DUPLICATE KEY UPDATE 
ame = VALUES(
ame);

CREATE TABLE IF NOT EXISTS students (
  id int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  student_no int(11) DEFAULT NULL,
  student_id varchar(20) NOT NULL,
  
ame varchar(100) NOT NULL,
  class_level varchar(10) NOT NULL,
  oom varchar(10) NOT NULL,
  created_at timestamp DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_room (class_level, oom),
  INDEX idx_student_id (student_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS 	eaching_load (
  id int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  	eacher_name varchar(100) NOT NULL,
  subject_code varchar(20) NOT NULL,
  subject_name varchar(150) NOT NULL,
  class_level varchar(10) NOT NULL,
  oom varchar(10) NOT NULL,
  	erm varchar(10) NOT NULL,
  year varchar(10) NOT NULL,
  created_at timestamp DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_teacher (	eacher_name),
  INDEX idx_term_year (	erm, year)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS club_teachers (
  id int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  	eacher_name varchar(100) NOT NULL,
  club_name varchar(100) NOT NULL,
  	erm varchar(10) NOT NULL,
  year varchar(10) NOT NULL,
  created_at timestamp DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS club_students (
  id int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  club_name varchar(100) NOT NULL,
  student_id varchar(20) NOT NULL,
  student_name varchar(100) NOT NULL,
  class_level varchar(10) DEFAULT NULL,
  oom varchar(10) DEFAULT NULL,
  created_at timestamp DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_club (club_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS grades (
  id int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  	erm varchar(10) NOT NULL,
  year varchar(10) NOT NULL,
  period varchar(20) NOT NULL,
  subject_code varchar(20) NOT NULL,
  subject_name varchar(150) DEFAULT NULL,
  class_level varchar(10) NOT NULL,
  oom varchar(10) NOT NULL,
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
  	eacher_name varchar(100) DEFAULT NULL,
  updated_at timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_query (	erm, year, period, subject_code, oom),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
SQL;
            ->exec();

             = "เชื่อมต่อฐานข้อมูลและตั้งค่าระบบสำเร็จเรียบร้อยแล้ว!";
             = "success";
             = "success";
        } catch (Exception ) {
             = "เชื่อมต่อไม่สำเร็จ: " . ->getMessage();
             = "danger";
        }
    }
} else {
     = "localhost";
     = "mmvsc_wichakar";
     = "mmvsc_wichakar";
     = "";
    if (file_exists(__DIR__ . "/config.php")) {
         = file_get_contents(__DIR__ . "/config.php");
        if (preg_match('/define\("DB_HOST",\s*"([^"]*)"\)/', , ))  = [1];
        if (preg_match('/define\("DB_NAME",\s*"([^"]*)"\)/', , ))  = [1];
        if (preg_match('/define\("DB_USER",\s*"([^"]*)"\)/', , ))  = [1];
        if (preg_match('/define\("DB_PASS",\s*"([^"]*)"\)/', , ))  = [1];
    }
}
?>
<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ตั้งค่าเชื่อมต่อฐานข้อมูล - โรงเรียนมกุฎเมืองราชวิทยาลัย</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        body { font-family: 'Sarabun', sans-serif; background-color: #f0f4f8; }
    </style>
</head>
<body class="min-h-screen flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-gray-100">
        <div class="bg-gradient-to-r from-blue-700 to-indigo-800 text-white p-6 text-center">
            <div class="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-md text-blue-700 text-2xl">
                <i class="fa-solid fa-database"></i>
            </div>
            <h1 class="text-xl font-bold">ตั้งค่าเชื่อมต่อฐานข้อมูล MySQL</h1>
            <p class="text-blue-100 text-sm mt-1">ระบบผลการเรียน โรงเรียนมกุฎเมืองราชวิทยาลัย</p>
        </div>

        <div class="p-6">
            <?php if (!empty()): ?>
                <div class="mb-6 p-4 rounded-xl text-sm flex items-start gap-3 <?php echo  === 'success' ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'; ?>">
                    <i class="fa-solid <?php echo  === 'success' ? 'fa-circle-check text-green-500' : 'fa-circle-exclamation text-red-500'; ?> text-lg mt-0.5"></i>
                    <div><?php echo htmlspecialchars(); ?></div>
                </div>
            <?php endif; ?>

            <?php if ( === "success"): ?>
                <div class="text-center py-4">
                    <div class="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
                        <i class="fa-solid fa-check"></i>
                    </div>
                    <h3 class="text-lg font-bold text-gray-800 mb-2">ติดตั้งและเชื่อมต่อสำเร็จ!</h3>
                    <p class="text-gray-600 text-sm mb-6">ระบบได้บันทึกไฟล์ config.php และสร้างโครงสร้างตารางพร้อมใช้งานแล้ว</p>
                    <a href="index.php" class="inline-flex items-center justify-center gap-2 w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition shadow-md">
                        <i class="fa-solid fa-arrow-right-to-bracket"></i> ไปที่หน้าเข้าสู่ระบบ (index.php)
                    </a>
                </div>
            <?php else: ?>
                <form method="POST" action="install.php" class="space-y-4">
                    <div>
                        <label class="block text-sm font-semibold text-gray-700 mb-1">
                            <i class="fa-solid fa-server text-blue-600 mr-1"></i> Database Host
                        </label>
                        <input type="text" name="db_host" value="<?php echo htmlspecialchars(['db_host'] ??  ?? 'localhost'); ?>" class="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm" required>
                        <p class="text-xs text-gray-400 mt-1">ส่วนใหญ่บน HostAtom ใช้เป็น <code class="text-blue-600">localhost</code></p>
                    </div>

                    <div>
                        <label class="block text-sm font-semibold text-gray-700 mb-1">
                            <i class="fa-solid fa-database text-blue-600 mr-1"></i> ชื่อฐานข้อมูล (Database Name)
                        </label>
                        <input type="text" name="db_name" value="<?php echo htmlspecialchars(['db_name'] ??  ?? 'mmvsc_wichakar'); ?>" placeholder="เช่น mmvsc_wichakar" class="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm" required>
                    </div>

                    <div>
                        <label class="block text-sm font-semibold text-gray-700 mb-1">
                            <i class="fa-solid fa-user text-blue-600 mr-1"></i> ผู้ใช้ฐานข้อมูล (Database User)
                        </label>
                        <input type="text" name="db_user" value="<?php echo htmlspecialchars(['db_user'] ??  ?? 'mmvsc_wichakar'); ?>" placeholder="เช่น mmvsc_wichakar" class="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm" required>
                    </div>

                    <div>
                        <label class="block text-sm font-semibold text-gray-700 mb-1">
                            <i class="fa-solid fa-key text-blue-600 mr-1"></i> รหัสผ่านฐานข้อมูล (Database Password)
                        </label>
                        <input type="password" name="db_pass" value="<?php echo htmlspecialchars(['db_pass'] ??  ?? ''); ?>" placeholder="กรอกรหัสผ่าน MySQL ที่สร้างใน cPanel" class="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm" required>
                    </div>

                    <div class="pt-2">
                        <button type="submit" class="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition shadow-md flex items-center justify-center gap-2">
                            <i class="fa-solid fa-bolt"></i> ทดสอบการเชื่อมต่อ & บันทึก
                        </button>
                    </div>
                </form>

                <div class="mt-6 pt-4 border-t border-gray-100 text-xs text-gray-500 leading-relaxed">
                    <p class="font-semibold text-gray-700 mb-1"><i class="fa-solid fa-circle-info text-blue-500 mr-1"></i> ข้อแนะนำสำหรับ HostAtom:</p>
                    <ol class="list-decimal pl-4 space-y-1">
                        <li>ตรวจสอบให้แน่ใจว่าได้กด <strong>Add User to Database</strong> ในหน้า MySQL Databases ของ cPanel แล้ว</li>
                        <li>ต้องติ๊กถูกเลือกสิทธิ์ <strong>ALL PRIVILEGES</strong> ให้กับ User นั้นด้วยครับ</li>
                    </ol>
                </div>
            <?php endif; ?>
        </div>
    </div>
</body>
</html>
