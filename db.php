<?php
$host = "localhost";   // or 127.0.0.1
$port = "5433";        // default PostgreSQL port
$dbname = "edubridgeOpps";
$user = "postgres";  //  postgres username
$password = "postgres";  //  postgres password

try {
    $pdo = new PDO("pgsql:host=$host;port=$port;dbname=$dbname", $user, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    die("Database connection failed: " . $e->getMessage());
}
?>
