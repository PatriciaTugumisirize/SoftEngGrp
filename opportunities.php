<?php
/**
 * opportunities.php
 * Handles CRUD operations for the Opportunities table
 * Part of the EduBridge project
 */

header("Content-Type: application/json");
require_once 'db.php';  // include the shared database connection

// Determine the requested action (?action=create/read/update/delete)
$action = $_GET['action'] ?? null;

switch ($action) {
    case 'create':
        createOpportunity($pdo);
        break;
    case 'read':
        readOpportunities($pdo);
        break;
    case 'update':
        updateOpportunity($pdo);
        break;
    case 'delete':
        deleteOpportunity($pdo);
        break;
    default:
        sendResponse(["error" => "Invalid or missing action"], 400);
        break;
}

/**
 * CREATE - Insert a new opportunity into the database
 */
function createOpportunity($pdo) {
    $data = getRequestData();

    $sql = "INSERT INTO opportunities (title, description, skillsrequired, duration, deadline, organization) 
            VALUES (:title, :description, :skills, :duration, :deadline, :organization)";
    $stmt = $pdo->prepare($sql);

    $stmt->execute([
        ':title'        => $data['title'],
        ':description'  => $data['description'],
        ':skills'       => $data['skillsrequired'],
        ':duration'     => $data['duration'],
        ':deadline'     => $data['deadline'],
        ':organization' => $data['organization']
    ]);

    sendResponse(["message" => "Opportunity created successfully"], 201);
}

/**
 * READ - Retrieve all opportunities
 */
function readOpportunities($pdo) {
    $stmt = $pdo->query("SELECT * FROM opportunities ORDER BY opportunityid ASC");
    $opportunities = $stmt->fetchAll(PDO::FETCH_ASSOC);

    sendResponse($opportunities, 200);
}

/**
 * UPDATE - Modify an existing opportunity
 */
function updateOpportunity($pdo) {
    $data = getRequestData();

    $sql = "UPDATE opportunities 
            SET title = :title, description = :description, skillsrequired = :skills, 
                duration = :duration, deadline = :deadline, organization = :organization
            WHERE opportunityid = :id";
    $stmt = $pdo->prepare($sql);

    $stmt->execute([
        ':id'           => $data['opportunityid'],
        ':title'        => $data['title'],
        ':description'  => $data['description'],
        ':skills'       => $data['skillsrequired'],
        ':duration'     => $data['duration'],
        ':deadline'     => $data['deadline'],
        ':organization' => $data['organization']
    ]);

    sendResponse(["message" => "Opportunity updated successfully"], 200);
}

/**
 * DELETE - Remove an opportunity
 */
function deleteOpportunity($pdo) {
    $data = getRequestData();

    $sql = "DELETE FROM opportunities WHERE opportunityid = :id";
    $stmt = $pdo->prepare($sql);

    $stmt->execute([':id' => $data['opportunityid']]);

    sendResponse(["message" => "Opportunity deleted successfully"], 200);
}

/**
 * Utility: Read JSON input from request body
 */
function getRequestData() {
    $raw = file_get_contents("php://input");
    $data = json_decode($raw, true);

    if (!$data) {
        sendResponse(["error" => "Invalid or missing JSON data"], 400);
        exit;
    }
    return $data;
}

/**
 * Utility: Send JSON response with status code
 */
function sendResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data);
}
?>
