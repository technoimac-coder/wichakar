<?php
/**
 * Backend REST API สำหรับระบบผลการเรียน โรงเรียนมกุฎเมืองราชวิทยาลัย
 * รองรับ MySQL บน HostAtom
 */

require_once __DIR__ . "/config.php";

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(200);
    exit();
}


$pdo = getDB();

// ตรวจสอบและสร้างตารางอัตโนมัติหากยังไม่มี
try {
    $check = $pdo->query("SHOW TABLES LIKE 'settings'");
    if ($check->rowCount() === 0) {
        $pdo->exec(<<<SQL

CREATE TABLE IF NOT EXISTS `settings` (
  `setting_key` varchar(50) NOT NULL PRIMARY KEY,
  `setting_value` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `settings` (`setting_key`, `setting_value`) VALUES
('term', '2'),
('year', '2567'),
('period', 'ก่อนกลางภาค'),
('status', 'OPEN')
ON DUPLICATE KEY UPDATE `setting_value` = VALUES(`setting_value`);

CREATE TABLE IF NOT EXISTS `teachers` (
  `id` int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `username` varchar(50) NOT NULL UNIQUE,
  `password` varchar(255) NOT NULL,
  `name` varchar(100) NOT NULL,
  `advisor_room` varchar(50) DEFAULT NULL,
  `role` enum('Teacher','Admin') NOT NULL DEFAULT 'Teacher',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `teachers` (`username`, `password`, `name`, `role`) VALUES
('admin', '1234', 'ผู้ดูแลระบบวิชาการ', 'Admin')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

CREATE TABLE IF NOT EXISTS `students` (
  `id` int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `student_no` int(11) DEFAULT NULL,
  `student_id` varchar(20) NOT NULL,
  `name` varchar(100) NOT NULL,
  `class_level` varchar(10) NOT NULL,
  `room` varchar(10) NOT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_room` (`class_level`, `room`),
  INDEX `idx_student_id` (`student_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `teaching_load` (
  `id` int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `teacher_name` varchar(100) NOT NULL,
  `subject_code` varchar(20) NOT NULL,
  `subject_name` varchar(150) NOT NULL,
  `class_level` varchar(10) NOT NULL,
  `room` varchar(10) NOT NULL,
  `term` varchar(10) NOT NULL,
  `year` varchar(10) NOT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_teacher` (`teacher_name`),
  INDEX `idx_term_year` (`term`, `year`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `club_teachers` (
  `id` int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `teacher_name` varchar(100) NOT NULL,
  `club_name` varchar(100) NOT NULL,
  `term` varchar(10) NOT NULL,
  `year` varchar(10) NOT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `club_students` (
  `id` int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `club_name` varchar(100) NOT NULL,
  `student_id` varchar(20) NOT NULL,
  `student_name` varchar(100) NOT NULL,
  `class_level` varchar(10) DEFAULT NULL,
  `room` varchar(10) DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_club` (`club_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE IF NOT EXISTS `is_students` (
  `id` int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `teacher_name` varchar(100) NOT NULL,
  `class_level` varchar(10) NOT NULL,
  `subject_code` varchar(20) DEFAULT 'I 20201',
  `student_id` varchar(20) NOT NULL,
  `term` varchar(10) NOT NULL DEFAULT '1',
  `year` varchar(10) NOT NULL DEFAULT '2569',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_teacher_is` (`teacher_name`, `class_level`, `term`, `year`),
  INDEX `idx_student_is` (`student_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `grades` (
  `id` int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `term` varchar(10) NOT NULL,
  `year` varchar(10) NOT NULL,
  `period` varchar(20) NOT NULL,
  `subject_code` varchar(20) NOT NULL,
  `subject_name` varchar(150) DEFAULT NULL,
  `class_level` varchar(10) NOT NULL,
  `room` varchar(10) NOT NULL,
  `student_id` varchar(20) NOT NULL,
  `student_name` varchar(100) NOT NULL,
  `s1` varchar(10) DEFAULT NULL,
  `s2` varchar(10) DEFAULT NULL,
  `s3` varchar(10) DEFAULT NULL,
  `s4` varchar(10) DEFAULT NULL,
  `s5` varchar(10) DEFAULT NULL,
  `s6` varchar(10) DEFAULT NULL,
  `s7` varchar(10) DEFAULT NULL,
  `s8` varchar(10) DEFAULT NULL,
  `s9` varchar(10) DEFAULT NULL,
  `s10` varchar(10) DEFAULT NULL,
  `status` varchar(20) DEFAULT 'ปกติ',
  `teacher_name` varchar(100) DEFAULT NULL,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_query` (`term`, `year`, `period`, `subject_code`, `room`),
  INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SQL
        );
    }
} catch (Exception $e) {
    // ignore
}

// ตรวจสอบและสร้างตาราง score_submissions
try {
    $pdo->exec("CREATE TABLE IF NOT EXISTS `score_submissions` (
      `id` int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
      `term` varchar(10) NOT NULL,
      `year` varchar(10) NOT NULL,
      `period` varchar(20) NOT NULL,
      `subject_code` varchar(20) NOT NULL,
      `subject_name` varchar(150) NOT NULL,
      `class_level` varchar(10) NOT NULL,
      `room` varchar(10) NOT NULL,
      `teacher_name` varchar(100) NOT NULL,
      `status` varchar(20) NOT NULL DEFAULT 'Draft',
      `submitted_at` timestamp NULL DEFAULT NULL,
      `approved_at` timestamp NULL DEFAULT NULL,
      `reject_reason` varchar(255) DEFAULT NULL,
      `snapshot_grades` longtext DEFAULT NULL,
      UNIQUE KEY `idx_submission` (`term`, `year`, `period`, `subject_code`, `room`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");
} catch (Exception $e) {
    // ignore
}


$action = $_GET["action"] ?? "";
$inputJSON = file_get_contents("php://input");
$input = json_decode($inputJSON, true) ?? $_POST;

switch ($action) {

    // 1. ดึงการตั้งค่าระบบปัจจุบัน
    case "getSystemSettings":
        $stmt = $pdo->query("SELECT setting_key, setting_value FROM settings");
        $rows = $stmt->fetchAll();
        $settings = ["term" => "2", "year" => "2567", "period" => "ก่อนกลางภาค", "status" => "OPEN"];
        foreach ($rows as $r) {
            $k = strtolower(trim($r["setting_key"]));
            if (isset($settings[$k])) $settings[$k] = $r["setting_value"];
        }
        echo json_encode($settings, JSON_UNESCAPED_UNICODE);
        break;

    // 2. เปลี่ยนสถานะ เปิด/ปิด ระบบ
    case "setSystemStatus":
        $status = $input["status"] ?? "OPEN";
        $stmt = $pdo->prepare("REPLACE INTO settings (setting_key, setting_value) VALUES ('status', ?)");
        $stmt->execute([$status]);
        echo json_encode(["success" => true, "status" => $status], JSON_UNESCAPED_UNICODE);
        break;

    // 3. ตั้งค่าเทอม / ปีการศึกษา / ช่วงเวลา
    case "updateSystemTermYear":
        $t = $input["term"] ?? "1";
        $y = $input["year"] ?? "2567";
        $p = $input["period"] ?? "ก่อนกลางภาค";
        $pdo->prepare("REPLACE INTO settings (setting_key, setting_value) VALUES ('term', ?)")->execute([$t]);
        $pdo->prepare("REPLACE INTO settings (setting_key, setting_value) VALUES ('year', ?)")->execute([$y]);
        $pdo->prepare("REPLACE INTO settings (setting_key, setting_value) VALUES ('period', ?)")->execute([$p]);
        echo json_encode([
            "success" => true, 
            "term" => $t, 
            "year" => $y, 
            "period" => $p, 
            "message" => "บันทึกการตั้งค่าภาคเรียนเรียบร้อยแล้ว"
        ], JSON_UNESCAPED_UNICODE);
        break;

    // 4. เข้าสู่ระบบ (Login)
        case "getTeacherAccounts":
        $stmt = $pdo->query("SELECT username, name, advisor_room as advisorRoom, role, 
                             (CASE WHEN password IN ('Password@123', '1234') THEN 1 ELSE 0 END) as isDefaultPassword 
                             FROM teachers 
                             ORDER BY role DESC, username ASC");
        $teachers = $stmt->fetchAll();
        echo json_encode($teachers, JSON_UNESCAPED_UNICODE);
        break;

    case "resetTeacherPassword":
        $u = trim($input["username"] ?? "");
        if (empty($u)) {
            echo json_encode(["success" => false, "message" => "กรุณาระบุ Username ที่ต้องการรีเซ็ต"], JSON_UNESCAPED_UNICODE);
            break;
        }
        $defaultPass = "Password@123";
        $stmt = $pdo->prepare("UPDATE teachers SET password = ? WHERE UPPER(username) = UPPER(?)");
        $stmt->execute([$defaultPass, $u]);
        if ($stmt->rowCount() > 0) {
            echo json_encode(["success" => true, "message" => "รีเซ็ตรหัสผ่านของ Username: $u กลับเป็น Password@123 เรียบร้อยแล้ว"], JSON_UNESCAPED_UNICODE);
        } else {
            echo json_encode(["success" => false, "message" => "ไม่พบผู้ใช้หรือรหัสผ่านเป็น Password@123 อยู่แล้ว"], JSON_UNESCAPED_UNICODE);
        }
        break;

    case "checkLogin":
        $u = trim($input["username"] ?? "");
        $p = trim($input["password"] ?? "");
        $stmt = $pdo->prepare("SELECT * FROM teachers WHERE UPPER(username) = UPPER(?) AND password = ?");
        $stmt->execute([$u, $p]);
        $user = $stmt->fetch();
        if ($user) {
            $mustChange = ($p === "Password@123" || $p === "1234");
            echo json_encode([
                "success" => true,
                "name" => $user["name"],
                "role" => $user["role"],
                "advisorRoom" => $user["advisor_room"],
                "mustChangePassword" => $mustChange
            ], JSON_UNESCAPED_UNICODE);
        } else {
            echo json_encode(["success" => false, "message" => "รหัสประจำตัวหรือรหัสผ่านไม่ถูกต้อง"], JSON_UNESCAPED_UNICODE);
        }
        break;

    // 4.1 เปลี่ยนรหัสผ่าน (Change Password)
    case "changePassword":
        $u = trim($input["username"] ?? "");
        $oldP = trim($input["oldPassword"] ?? "");
        $newP = trim($input["newPassword"] ?? "");
        
        if (empty($u) || empty($newP)) {
            echo json_encode(["success" => false, "message" => "กรุณากรอกรหัสผ่านใหม่"], JSON_UNESCAPED_UNICODE);
            break;
        }
        if (strlen($newP) < 6) {
            echo json_encode(["success" => false, "message" => "รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร"], JSON_UNESCAPED_UNICODE);
            break;
        }
        if ($newP === "Password@123" || $newP === "1234") {
            echo json_encode(["success" => false, "message" => "กรุณาตั้งรหัสผ่านใหม่ที่ไม่ใช่รหัสผ่านเริ่มต้น (Password@123)"], JSON_UNESCAPED_UNICODE);
            break;
        }
        
        // ตรวจสอบ user
        $stmt = $pdo->prepare("SELECT id FROM teachers WHERE UPPER(username) = UPPER(?)");
        $stmt->execute([$u]);
        if (!$stmt->fetch()) {
            echo json_encode(["success" => false, "message" => "ไม่พบผู้ใช้นี้ในระบบ"], JSON_UNESCAPED_UNICODE);
            break;
        }

        $upd = $pdo->prepare("UPDATE teachers SET password = ? WHERE UPPER(username) = UPPER(?)");
        $upd->execute([$newP, $u]);
        echo json_encode(["success" => true, "message" => "เปลี่ยนรหัสผ่านสำเร็จเรียบร้อยแล้ว"], JSON_UNESCAPED_UNICODE);
        break;

    // 5. ดึงรายชื่อวิชาที่ครูท่านนี้สอน
    case "getTeacherSubjects":
        $rawName = trim($input["teacherName"] ?? "");
        
        $stmtS = $pdo->query("SELECT setting_key, setting_value FROM settings");
        $stRows = $stmtS->fetchAll(PDO::FETCH_KEY_PAIR);
        $curT = $stRows["term"] ?? "1";
        $curY = $stRows["year"] ?? "2569";

        // ตัดคำนำหน้าชื่อเพื่อค้นหาให้แม่นยำ
        $cleanName = preg_replace("/^(นาย|นางสาว|นาง|ว่าที่ร้อยตรี|ว่าที่ ร.ต.|ดร.|ผอ.|Mr\\.|Ms\\.|Miss|Teacher)\\s*/ui", "", $rawName);
        $cleanName = trim($cleanName);

        // ดึงชื่อต้น (First name)
        $nameParts = preg_split('/\\s+/', $cleanName);
        $firstName = !empty($nameParts[0]) ? $nameParts[0] : $cleanName;

        // รองรับกรณีครูสอนร่วม 2 คน (เช่น นาริน เทวบาล, Jamile หรือ Jam)
        $stmt = $pdo->prepare("SELECT subject_code as subjectCode, subject_name as subjectName, class_level as classLevel, room, teacher_name as teacher 
                               FROM teaching_load 
                               WHERE (
                                   teacher_name LIKE ? 
                                   OR teacher_name LIKE ? 
                                   OR teacher_name LIKE ? 
                                   OR ? LIKE CONCAT('%', REPLACE(REPLACE(REPLACE(teacher_name, 'นางสาว', ''), 'นาง', ''), 'นาย', ''), '%')
                               ) 
                               AND term = ? AND year = ?
                               ORDER BY class_level ASC, CAST(room AS UNSIGNED) ASC");
        $stmt->execute(["%$rawName%", "%$cleanName%", "%$firstName%", "%$cleanName%", $curT, $curY]);
        $subjects = $stmt->fetchAll();

        // รวมรายวิชาชุมนุม
        $stmtClub = $pdo->prepare("SELECT club_name as subjectName, teacher_name as teacher FROM club_teachers WHERE teacher_name LIKE ? AND term = ? AND year = ?");
        $stmtClub->execute(["%$cleanName%", $curT, $curY]);
        $clubs = $stmtClub->fetchAll();
        foreach ($clubs as $c) {
            $subjects[] = [
                "subjectCode" => "CLUB",
                "subjectName" => $c["subjectName"],
                "classLevel" => "รวม",
                "room" => $c["subjectName"],
                "teacher" => $c["teacher"]
            ];
        }

        // รวมรายวิชา "จิตอาสา (กิจกรรมเพื่อสังคมและสาธารณประโยชน์)" สำหรับครูที่ปรึกษาประจำห้อง
        $tId = trim($input["teacherId"] ?? "");
        $stmtAdv = $pdo->prepare("SELECT advisor_room, name FROM teachers WHERE (UPPER(username) = UPPER(?) OR name LIKE ? OR name LIKE ?)");
        $stmtAdv->execute([$tId, "%$cleanName%", "%$rawName%"]);
        $advRows = $stmtAdv->fetchAll();
        foreach ($advRows as $ar) {
            $advRoomsStr = trim($ar["advisor_room"] ?? "");
            if (!empty($advRoomsStr)) {
                $roomTokens = preg_split('/[,]+/', $advRoomsStr);
                foreach ($roomTokens as $rt) {
                    $rt = trim($rt);
                    if (empty($rt)) continue;
                    if (strpos($rt, '/') !== false) {
                        list($advLvl, $advR) = explode('/', $rt);
                        $advLvl = trim($advLvl);
                        $advR = trim($advR);
                    } else {
                        $advLvl = "ม.1";
                        $advR = $rt;
                    }
                    if (!empty($advLvl) && !empty($advR)) {
                        $subjects[] = [
                            "subjectCode" => "VOLUNTEER",
                            "subjectName" => "จิตอาสา (กิจกรรมเพื่อสังคมและสาธารณประโยชน์)",
                            "classLevel" => $advLvl,
                            "room" => $advR,
                            "teacher" => $ar["name"]
                        ];
                    }
                }
            }
        }

        echo json_encode($subjects, JSON_UNESCAPED_UNICODE);
        break;

    // 6. ดึงรายชื่อนักเรียนในห้องพร้อมคะแนน
    case "getStudentsByRoom":
        $lvl = trim($input["classLevel"] ?? "");
        $room = trim($input["room"] ?? "");
        $term = trim($input["term"] ?? "");
        $year = trim($input["year"] ?? "");
        $code = trim($input["subjectCode"] ?? "");
        $period = trim($input["period"] ?? "");

        $students = [];
        if ($code === "CLUB") {
            $stmt = $pdo->prepare("SELECT student_id as id, student_name as name, class_level as level, room FROM club_students WHERE club_name = ? ORDER BY student_id ASC");
            $stmt->execute([$room]);
            $rows = $stmt->fetchAll();
            $no = 1;
            foreach ($rows as $r) {
                $r["no"] = $no++;
                $r["status"] = "ปกติ";
                $students[] = $r;
            }
        } else {
            $cleanLvl = preg_replace("/[ม.]/u", "", $lvl);
            $stmt = $pdo->prepare("SELECT student_no as no, student_id as id, name, class_level as level, room FROM students WHERE REPLACE(REPLACE(class_level, 'ม.', ''), '.', '') = ? AND room = ? ORDER BY student_no ASC");
            $stmt->execute([$cleanLvl, $room]);
            $students = $stmt->fetchAll();
        }

        // ดึงคะแนนเดิมจากฐานข้อมูล
        $stmtG = $pdo->prepare("SELECT student_id, s1, s2, s3, s4, s5, s6, s7, s8, s9, s10, status FROM grades WHERE term = ? AND year = ? AND period = ? AND subject_code = ? AND room = ?");
        $stmtG->execute([$term, $year, $period, $code, $room]);
        $gRows = $stmtG->fetchAll();
        $gMap = [];
        foreach ($gRows as $g) {
            $gMap[$g["student_id"]] = $g;
        }

        foreach ($students as &$st) {
            if (isset($gMap[$st["id"]])) {
                $g = $gMap[$st["id"]];
                for ($i = 1; $i <= 10; $i++) $st["s$i"] = $g["s$i"];
                $st["status"] = $g["status"] ?: "ปกติ";
            }
        }

        // ดึงสถานะการส่งสำเนาคะแนน (Submission Status)
        $subStmt = $pdo->prepare("SELECT status, submitted_at, approved_at, reject_reason FROM score_submissions WHERE term = ? AND year = ? AND period = ? AND subject_code = ? AND room = ?");
        $subStmt->execute([$term, $year, $period, $code, $room]);
        $subRow = $subStmt->fetch();
        $submission = $subRow ? $subRow : [
            "status" => "Draft",
            "submitted_at" => null,
            "approved_at" => null,
            "reject_reason" => null
        ];

        echo json_encode([
            "students" => $students,
            "submission" => $submission
        ], JSON_UNESCAPED_UNICODE);
        break;

    // 7. บันทึกคะแนนลงตาราง grades
    case "saveGradesToSheet":
    case "saveGrades":
        $t = $input["term"];
        $y = $input["year"];
        $p = $input["period"];
        $code = $input["subjectCode"];
        $name = $input["subjectName"];
        $lvl = $input["classLevel"];
        $room = $input["room"];
        $teacher = $input["teacher"] ?? "";
        $students = $input["students"] ?? [];

        // ตรวจสอบว่าวิชานี้ ห้องนี้ ในเทอมและช่วงเวลานี้ ถูกล็อกหรือยัง
        $checkSub = $pdo->prepare("SELECT status FROM score_submissions WHERE term = ? AND year = ? AND period = ? AND subject_code = ? AND room = ?");
        $checkSub->execute([$t, $y, $p, $code, $room]);
        $subRow = $checkSub->fetch();
        if ($subRow && in_array($subRow["status"], ["Submitted", "Approved"])) {
            echo json_encode(["success" => false, "message" => "ไม่สามารถบันทึกคะแนนได้ เนื่องจากวิชานี้อยู่ในสถานะล็อกแล้ว (" . $subRow["status"] . ")"], JSON_UNESCAPED_UNICODE);
            break;
        }

        // ลบข้อมูลเก่าของวิชานี้ ห้องนี้ ในเทอมและช่วงเวลานี้
        $del = $pdo->prepare("DELETE FROM grades WHERE term = ? AND year = ? AND period = ? AND subject_code = ? AND room = ?");
        $del->execute([$t, $y, $p, $code, $room]);

        $ins = $pdo->prepare("INSERT INTO grades (term, year, period, subject_code, subject_name, class_level, room, student_id, student_name, s1, s2, s3, s4, s5, s6, s7, s8, s9, s10, status, teacher_name) 
                              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");

        foreach ($students as $st) {
            $ins->execute([
                $t, $y, $p, $code, $name, $lvl, $room,
                $st["id"], $st["name"],
                $st["s1"] ?? "", $st["s2"] ?? "", $st["s3"] ?? "", $st["s4"] ?? "", $st["s5"] ?? "",
                $st["s6"] ?? "", $st["s7"] ?? "", $st["s8"] ?? "", $st["s9"] ?? "", $st["s10"] ?? "",
                $st["status"] ?? "ปกติ", $teacher
            ]);
        }
        echo json_encode(["success" => true, "message" => "บันทึกผลการประเมิน $code (ห้อง $room) เรียบร้อยแล้ว"], JSON_UNESCAPED_UNICODE);
        break;

    // 8. ดึงตัวกรองสำหรับรายงาน (Filters)
    case "getReportFilters":
        $termsStmt = $pdo->query("SELECT DISTINCT CONCAT(term, '/', year) as ty FROM teaching_load WHERE term != '' AND year != '' ORDER BY year DESC, term DESC");
        $terms = $termsStmt->fetchAll(PDO::FETCH_COLUMN);

        $levelsStmt = $pdo->query("SELECT DISTINCT class_level, room FROM teaching_load ORDER BY class_level ASC, CAST(room AS UNSIGNED) ASC");
        $rows = $levelsStmt->fetchAll();
        $levels = [];
        $roomsByLevel = [];
        foreach ($rows as $r) {
            $l = $r["class_level"];
            $room = $r["room"];
            if (!in_array($l, $levels) && $l !== "") $levels[] = $l;
            if (!isset($roomsByLevel[$l])) $roomsByLevel[$l] = [];
            if (!in_array($room, $roomsByLevel[$l]) && $room !== "") $roomsByLevel[$l][] = $room;
        }

        echo json_encode([
            "terms" => $terms,
            "levels" => $levels,
            "roomsByLevel" => $roomsByLevel
        ], JSON_UNESCAPED_UNICODE);
        break;

    // 9. ดึงรายงานผลการเรียน Matrix
    case "getMatrixReport":
        $period = $input["period"] ?? "ก่อนกลางภาค";
        $termYear = $input["term"] ?? $input["termYear"] ?? "2/2567";
        $level = $input["level"] ?? "ม.1";
        $room = $input["room"] ?? "all";
        
        list($term, $year) = explode("/", $termYear);
        $cleanLevel = preg_replace("/[ม.]/u", "", $level);

        $targetRooms = [];
        if ($room === "all") {
            $rStmt = $pdo->prepare("SELECT DISTINCT room FROM teaching_load WHERE REPLACE(REPLACE(class_level, 'ม.', ''), '.', '') = ? AND term = ? AND year = ? ORDER BY CAST(room AS UNSIGNED) ASC");
            $rStmt->execute([$cleanLevel, $term, $year]);
            $targetRooms = $rStmt->fetchAll(PDO::FETCH_COLUMN);
        } else {
            $targetRooms = [$room];
        }

        $reports = [];
        foreach ($targetRooms as $curRoom) {
            // ดึงวิชา
            $subStmt = $pdo->prepare("SELECT DISTINCT subject_code as code, subject_name as name, teacher_name as teacher 
                                      FROM teaching_load 
                                      WHERE REPLACE(REPLACE(class_level, 'ม.', ''), '.', '') = ? AND room = ? AND term = ? AND year = ?");
            $subStmt->execute([$cleanLevel, $curRoom, $term, $year]);
            $subjects = $subStmt->fetchAll();

            // ดึงนักเรียน
            $stStmt = $pdo->prepare("SELECT student_no as no, student_id as id, name 
                                     FROM students 
                                     WHERE REPLACE(REPLACE(class_level, 'ม.', ''), '.', '') = ? AND room = ? 
                                     ORDER BY student_no ASC");
            $stStmt->execute([$cleanLevel, $curRoom]);
            $students = $stStmt->fetchAll();

            // ดึงคะแนน
            $gStmt = $pdo->prepare("SELECT subject_code, student_id, s1, s2, s3, s4, status 
                                    FROM grades 
                                    WHERE term = ? AND year = ? AND period = ? AND room = ?");
            $gStmt->execute([$term, $year, $period, $curRoom]);
            $gRows = $gStmt->fetchAll();

            $grades = [];
            $activities = [];
            foreach ($gRows as $g) {
                if ($g["subject_code"] === "ACT99") {
                    $activities[$g["student_id"]] = [
                        "s1" => $g["s1"], "s2" => $g["s2"], "s3" => $g["s3"], "s4" => $g["s4"]
                    ];
                } else if ($g["subject_code"] === "VOLUNTEER" || $g["subject_code"] === "จิตอาสา") {
                    if (!isset($activities[$g["student_id"]])) {
                        $activities[$g["student_id"]] = ["s1" => "", "s2" => "", "s3" => "", "s4" => ""];
                    }
                    // คอลัมน์ที่ 2 ของกิจกรรมพัฒนาผู้เรียน: กิจกรรมเพื่อสังคม (จิตอาสา)
                    $activities[$g["student_id"]]["s2"] = $g["status"];
                    $grades[$g["student_id"] . "_" . $g["subject_code"]] = $g["status"];
                } else {
                    $grades[$g["student_id"] . "_" . $g["subject_code"]] = $g["status"];
                }
            }

            $reports[] = [
                "room" => $curRoom,
                "subjects" => $subjects,
                "students" => $students,
                "grades" => $grades,
                "activities" => $activities
            ];
        }

        echo json_encode(["success" => true, "reports" => $reports], JSON_UNESCAPED_UNICODE);
        break;

    // 10. ดึงรายงานนักเรียนที่ติด "ซ" แยกตามครูผู้สอนและรายวิชา
    case "getTeacherRemedialReport":
        $p = $input["period"] ?? "ก่อนกลางภาค";
        $ty = $input["termYear"] ?? $input["term"] ?? "2/2567";
        $tFilter = $input["teacherFilter"] ?? $input["teacherName"] ?? "ALL";
        list($t, $y) = explode("/", $ty);

        $sql = "SELECT teacher_name as teacher, subject_code as subjectCode, subject_name as subjectName, class_level as level, room, student_id as studentId, student_name as studentName, status 
                FROM grades WHERE term = ? AND year = ? AND period = ? AND status IN ('ซ', '0', 'ร', 'มส.', 'มผ.')";
        $params = [$t, $y, $p];

        if ($tFilter !== "ALL" && !empty($tFilter)) {
            $sql .= " AND teacher_name LIKE ?";
            $params[] = "%$tFilter%";
        }
        $sql .= " ORDER BY teacher_name ASC, subject_code ASC, CAST(room AS UNSIGNED) ASC, student_id ASC";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $remedial = $stmt->fetchAll();

        $stats = [];
        foreach ($remedial as $r) {
            $tn = $r["teacher"] ?: "ไม่ระบุครูผู้สอน";
            if (!isset($stats[$tn])) $stats[$tn] = ["teacherName" => $tn, "totalFail" => 0];
            $stats[$tn]["totalFail"]++;
        }

        echo json_encode([
            "success" => true,
            "data" => $remedial,
            "stats" => array_values($stats),
            "totalCount" => count($remedial)
        ], JSON_UNESCAPED_UNICODE);
        break;

    // 11. ดึงรายชื่อครูทั้งหมด
    case "getTeacherNames":
        $stmt = $pdo->query("SELECT DISTINCT name FROM teachers WHERE name != '' ORDER BY name ASC");
        echo json_encode($stmt->fetchAll(PDO::FETCH_COLUMN), JSON_UNESCAPED_UNICODE);
        break;

    // 12. ติดตามรายวิชาที่ยังไม่ส่งคะแนน
    case "getMissingGradesReport":
        $p = $input["period"] ?? "ก่อนกลางภาค";
        $t = $input["term"] ?? "2";
        $y = $input["year"] ?? "2567";

        // ดึงรายการที่ส่งแล้ว
        $submStmt = $pdo->prepare("SELECT DISTINCT subject_code, room FROM grades WHERE term = ? AND year = ? AND period = ?");
        $submStmt->execute([$t, $y, $p]);
        $submRows = $submStmt->fetchAll();
        $submitted = [];
        foreach ($submRows as $s) {
            $submitted[$s["subject_code"] . "_" . $s["room"]] = true;
        }

        // ดึงตารางสอนทั้งหมด
        $loadStmt = $pdo->prepare("SELECT teacher_name, subject_code, subject_name, class_level, room FROM teaching_load WHERE term = ? AND year = ?");
        $loadStmt->execute([$t, $y]);
        $loads = $loadStmt->fetchAll();

        $missingByTeacher = [];
        $totalMissing = 0;
        foreach ($loads as $ld) {
            $key = $ld["subject_code"] . "_" . $ld["room"];
            if (!isset($submitted[$key])) {
                $tn = $ld["teacher_name"];
                if (!isset($missingByTeacher[$tn])) {
                    $missingByTeacher[$tn] = [
                        "teacherName" => $tn,
                        "subjects" => []
                    ];
                }
                $missingByTeacher[$tn]["subjects"][] = [
                    "subjectCode" => $ld["subject_code"],
                    "subjectName" => $ld["subject_name"],
                    "classLevel" => $ld["class_level"],
                    "room" => $ld["room"]
                ];
                $totalMissing++;
            }
        }

        echo json_encode([
            "data" => array_values($missingByTeacher),
            "totalMissing" => $totalMissing
        ], JSON_UNESCAPED_UNICODE);
        break;

    // 13. ตรวจสอบภาระงานสอนในระบบ
    case "getExistingTeachingLoad":
        $t = $input["term"] ?? "2";
        $y = $input["year"] ?? "2567";
        $stmt = $pdo->prepare("SELECT teacher_name as teacher, subject_code as code, subject_name as name, class_level as level, room 
                               FROM teaching_load WHERE term = ? AND year = ? ORDER BY teacher_name ASC, subject_code ASC, CAST(room AS UNSIGNED) ASC");
        $stmt->execute([$t, $y]);
        echo json_encode($stmt->fetchAll(), JSON_UNESCAPED_UNICODE);
        break;

    // 14. บันทึกข้อมูลตารางต่างๆ จากฟอร์ม / Excel
    case "saveDatabaseWeb":
        $type = $input["type"] ?? "teachingLoad";
        $data = $input["data"] ?? [];
        $overwrite = $input["overwrite"] ?? false;

        if ($type === "teachingLoad") {
            if ($overwrite) $pdo->exec("TRUNCATE TABLE teaching_load");
            $ins = $pdo->prepare("INSERT INTO teaching_load (teacher_name, subject_code, subject_name, class_level, room, term, year) VALUES (?, ?, ?, ?, ?, ?, ?)");
            foreach ($data as $row) {
                $ins->execute([$row[0], $row[1], $row[2], $row[3], $row[4], $row[5], $row[6]]);
            }
            echo json_encode(["success" => true, "message" => "บันทึกภาระงานสอนเรียบร้อยแล้ว (" . count($data) . " รายการ)"], JSON_UNESCAPED_UNICODE);
        } elseif ($type === "teachers") {
            if ($overwrite) $pdo->exec("TRUNCATE TABLE teachers");
            $ins = $pdo->prepare("INSERT INTO teachers (username, password, name, advisor_room, role) VALUES (?, ?, ?, ?, ?)");
            foreach ($data as $row) {
                $ins->execute([$row[0], $row[1], $row[2], $row[3] ?? "", $row[4] ?? "Teacher"]);
            }
            echo json_encode(["success" => true, "message" => "บันทึกข้อมูลครู/สิทธิ์เรียบร้อยแล้ว (" . count($data) . " รายการ)"], JSON_UNESCAPED_UNICODE);
        } elseif ($type === "clubTeachers") {
            if ($overwrite) $pdo->exec("TRUNCATE TABLE club_teachers");
            $ins = $pdo->prepare("INSERT INTO club_teachers (teacher_name, club_name, term, year) VALUES (?, ?, ?, ?)");
            foreach ($data as $row) {
                $ins->execute([$row[0], $row[1], $row[2], $row[3]]);
            }
            echo json_encode(["success" => true, "message" => "บันทึกครูประจำชุมนุมเรียบร้อยแล้ว (" . count($data) . " รายการ)"], JSON_UNESCAPED_UNICODE);
        }
        break;

    // 15. อัปโหลดรายชื่อนักเรียนชุมนุม
    case "uploadClubStudents":
        $data = $input["data"] ?? [];
        $overwrite = $input["overwrite"] ?? false;
        if ($overwrite) $pdo->exec("TRUNCATE TABLE club_students");
        
        $ins = $pdo->prepare("INSERT INTO club_students (club_name, student_id, student_name, class_level, room) VALUES (?, ?, ?, ?, ?)");
        foreach ($data as $row) {
            $ins->execute([$row[0], $row[1], $row[2], $row[3] ?? "", $row[4] ?? ""]);
        }
        echo json_encode(["success" => true, "message" => "อัปโหลดรายชื่อนักเรียนชุมนุมเรียบร้อยแล้ว (" . count($data) . " รายการ)"], JSON_UNESCAPED_UNICODE);
        break;

    // 16. อัปโหลดรายชื่อนักเรียนทั่วไป (Students)
    case "uploadStudents":
        $data = $input["data"] ?? [];
        $overwrite = $input["overwrite"] ?? false;
        if ($overwrite) $pdo->exec("TRUNCATE TABLE students");

        $ins = $pdo->prepare("INSERT INTO students (student_no, student_id, name, class_level, room) VALUES (?, ?, ?, ?, ?)");
        foreach ($data as $row) {
            $ins->execute([$row[0] ?? null, $row[1], $row[2], $row[3], $row[4]]);
        }
        echo json_encode(["success" => true, "message" => "อัปโหลดรายชื่อนักเรียนเรียบร้อยแล้ว (" . count($data) . " รายการ)"], JSON_UNESCAPED_UNICODE);
        break;

    // 17. ส่งสำเนาคะแนน (บันทึก Snapshot และเปลี่ยนสถานะล็อกรายวิชา)
    case "submitScoreCopy":
        $t = $input["term"];
        $y = $input["year"];
        $p = $input["period"];
        $code = $input["subjectCode"];
        $name = $input["subjectName"];
        $lvl = $input["classLevel"];
        $room = $input["room"];
        $teacher = $input["teacher"] ?? "";
        $students = $input["students"] ?? [];
        $headers = $input["headers"] ?? []; // ป้ายกำกับหัวข้อคะแนน เช่น s1..s10

        // บันทึกคะแนนปัจจุบันลงฐานข้อมูล grades ก่อน
        $del = $pdo->prepare("DELETE FROM grades WHERE term = ? AND year = ? AND period = ? AND subject_code = ? AND room = ?");
        $del->execute([$t, $y, $p, $code, $room]);

        $ins = $pdo->prepare("INSERT INTO grades (term, year, period, subject_code, subject_name, class_level, room, student_id, student_name, s1, s2, s3, s4, s5, s6, s7, s8, s9, s10, status, teacher_name) 
                              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");

        foreach ($students as $st) {
            $ins->execute([
                $t, $y, $p, $code, $name, $lvl, $room,
                $st["id"], $st["name"],
                $st["s1"] ?? "", $st["s2"] ?? "", $st["s3"] ?? "", $st["s4"] ?? "", $st["s5"] ?? "",
                $st["s6"] ?? "", $st["s7"] ?? "", $st["s8"] ?? "", $st["s9"] ?? "", $st["s10"] ?? "",
                $st["status"] ?? "ปกติ", $teacher
            ]);
        }

        // บันทึก/อัปเดตประวัติการส่งสำเนา
        $snapshot = json_encode([
            "headers" => $headers,
            "students" => $students
        ], JSON_UNESCAPED_UNICODE);

        $stmt = $pdo->prepare("INSERT INTO score_submissions (term, year, period, subject_code, subject_name, class_level, room, teacher_name, status, submitted_at, snapshot_grades)
                               VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Submitted', CURRENT_TIMESTAMP, ?)
                               ON DUPLICATE KEY UPDATE status = 'Submitted', submitted_at = CURRENT_TIMESTAMP, teacher_name = ?, snapshot_grades = ?, reject_reason = NULL");
        $stmt->execute([$t, $y, $p, $code, $name, $lvl, $room, $teacher, $snapshot, $teacher, $snapshot]);

        echo json_encode(["success" => true, "message" => "ส่งสำเนาคะแนนและล็อกข้อมูลรายวิชาเรียบร้อยแล้ว"], JSON_UNESCAPED_UNICODE);
        break;

    // 18. แอดมินดึงรายการส่งสำเนาคะแนนทั้งหมด
    case "adminGetSubmissions":
        $t = $input["term"] ?? "2";
        $y = $input["year"] ?? "2567";
        $p = $input["period"] ?? "ก่อนกลางภาค";

        // ดึงภาระงานสอนทั้งหมด
        $loadStmt = $pdo->prepare("SELECT teacher_name as teacher, subject_code as code, subject_name as name, class_level as level, room FROM teaching_load WHERE term = ? AND year = ? ORDER BY teacher_name ASC, subject_code ASC, CAST(room AS UNSIGNED) ASC");
        $loadStmt->execute([$t, $y]);
        $loads = $loadStmt->fetchAll();

        // ดึงสถานะการส่งทั้งหมด
        $subStmt = $pdo->prepare("SELECT subject_code, room, status, submitted_at, approved_at, reject_reason, snapshot_grades FROM score_submissions WHERE term = ? AND year = ? AND period = ?");
        $subStmt->execute([$t, $y, $p]);
        $subRows = $subStmt->fetchAll();

        $subMap = [];
        foreach ($subRows as $sub) {
            $subMap[$sub["subject_code"] . "_" . $sub["room"]] = $sub;
        }

        $result = [];
        foreach ($loads as $ld) {
            $key = $ld["code"] . "_" . $ld["room"];
            $status = "Draft";
            $submitted_at = null;
            $approved_at = null;
            $reject_reason = null;
            $snapshot_grades = null;

            if (isset($subMap[$key])) {
                $status = $subMap[$key]["status"];
                $submitted_at = $subMap[$key]["submitted_at"];
                $approved_at = $subMap[$key]["approved_at"];
                $reject_reason = $subMap[$key]["reject_reason"];
                $snapshot_grades = $subMap[$key]["snapshot_grades"];
            }

            $result[] = [
                "teacher" => $ld["teacher"],
                "subjectCode" => $ld["code"],
                "subjectName" => $ld["name"],
                "classLevel" => $ld["level"],
                "room" => $ld["room"],
                "status" => $status,
                "submittedAt" => $submitted_at,
                "approvedAt" => $approved_at,
                "rejectReason" => $reject_reason,
                "snapshot" => $snapshot_grades ? json_decode($snapshot_grades, true) : null
            ];
        }

        echo json_encode(["success" => true, "submissions" => $result], JSON_UNESCAPED_UNICODE);
        break;

    // 19. อัปเดตสถานะสำเนาคะแนน (อนุมัติ / ตีกลับแก้ไข)
    case "adminUpdateSubmission":
        $t = $input["term"];
        $y = $input["year"];
        $p = $input["period"];
        $code = $input["subjectCode"];
        $room = $input["room"];
        $status = $input["status"]; // Approved หรือ Rejected
        $reason = $input["rejectReason"] ?? "";

        if ($status === "Approved") {
            $stmt = $pdo->prepare("UPDATE score_submissions SET status = 'Approved', approved_at = CURRENT_TIMESTAMP WHERE term = ? AND year = ? AND period = ? AND subject_code = ? AND room = ?");
            $stmt->execute([$t, $y, $p, $code, $room]);
            echo json_encode(["success" => true, "message" => "อนุมัติสำเนาคะแนนเรียบร้อยแล้ว"], JSON_UNESCAPED_UNICODE);
        } else if ($status === "Rejected") {
            $stmt = $pdo->prepare("UPDATE score_submissions SET status = 'Rejected', reject_reason = ? WHERE term = ? AND year = ? AND period = ? AND subject_code = ? AND room = ?");
            $stmt->execute([$reason, $t, $y, $p, $code, $room]);
            echo json_encode(["success" => true, "message" => "ตีกลับสำเนาคะแนนให้ครูแก้ไขเรียบร้อยแล้ว"], JSON_UNESCAPED_UNICODE);
        } else {
            echo json_encode(["success" => false, "message" => "สถานะไม่ถูกต้อง"], JSON_UNESCAPED_UNICODE);
        }
        break;

    default:
        echo json_encode(["success" => false, "message" => "Unknown action: $action"], JSON_UNESCAPED_UNICODE);
        break;
}
