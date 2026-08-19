<?php
require_once __DIR__ . "/config.php";
$pdo = getDB();
$stmt = $pdo->prepare("UPDATE teachers SET password = 'Password@123' WHERE username != 'admin'");
$stmt->execute();
echo json_encode(["success" => true, "affected" => $stmt->rowCount()]);
