-- ====================================================
-- โครงสร้างฐานข้อมูล MySQL สำหรับ HostAtom (phpMyAdmin)
-- ระบบผลการเรียนและบันทึกคะแนน โรงเรียนมกุฎเมืองราชวิทยาลัย
-- ====================================================

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+07:00";

-- 1. ตารางตั้งค่าระบบ (settings)
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

-- 2. ตารางข้อมูลครูผู้สอนและสิทธิ์ (teachers)
CREATE TABLE IF NOT EXISTS `teachers` (
  `id` int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `username` varchar(50) NOT NULL UNIQUE,
  `password` varchar(255) NOT NULL,
  `name` varchar(100) NOT NULL,
  `advisor_room` varchar(50) DEFAULT NULL,
  `role` enum('Teacher','Admin') NOT NULL DEFAULT 'Teacher',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- เพิ่มผู้ดูแลระบบเริ่มต้น
INSERT INTO `teachers` (`username`, `password`, `name`, `role`) VALUES
('admin', '1234', 'ผู้ดูแลระบบวิชาการ', 'Admin')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- 3. ตารางข้อมูลนักเรียน (students)
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

-- 4. ตารางภาระงานสอน (teaching_load)
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

-- 5. ตารางครูประจำชุมนุม (club_teachers)
CREATE TABLE IF NOT EXISTS `club_teachers` (
  `id` int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `teacher_name` varchar(100) NOT NULL,
  `club_name` varchar(100) NOT NULL,
  `term` varchar(10) NOT NULL,
  `year` varchar(10) NOT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. ตารางนักเรียนประจำชุมนุม (club_students)
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

-- 7. ตารางผลการเรียนและคะแนน (grades)
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

COMMIT;
