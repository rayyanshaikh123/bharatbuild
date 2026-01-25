import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config.dart';
import 'persistent_client.dart';

class QAService {
  final String _baseUrl = API_BASE_URL;
  // Instantiate PersistentClient() without passing _client instance to ensure it uses the shared cookie storage if implemented as singleton or shared prefs
  // Wait, PersistentClient implementation creates a new http.Client() if not passed.
  // And it gets cookies from SharedPreferences. So new instance is fine as long as SharedPreferences is consistent.
  // HOWEVER, AuthService uses a specific instance.
  // To be absolutely safe and share the same "session", we should use the SAME client instance if PersistentClient caches anything in memory.
  // Looking at PersistentClient code: it reads form SharedPreferences on EVERY request. So separate instances are fine.
  
  // BUT, the issue might be that the login response set-cookie wasn't persisted fast enough or something?
  // Or maybe `_client` in AuthService is used for login, and `_client` in QAService is used for fetch.
  // Let's check `PersistentClient` again. It saves 'set-cookie' to SharedPreferences.
  // So as long as `qaEngineerLogin` in `AuthService` succeeds and saves the cookie, `QAService` should read it.
  
  // Wait, I see `AuthService` has a `client` getter. Ideally all services should share the same `AuthService` instance or client to avoid race conditions or sync issues?
  // Actually, I'll update QAService to take `AuthService` or use the same `PersistentClient`. 
  // But strictly `PersistentClient` reads from disk every time.
  
  // Let's try to debug. The user got 401. This means the cookie was not sent or invalid.
  // The log shows:
  // [2026-01-25T01:11:04.401Z] POST /register - 201 (2339ms)  <-- User REGISTERED
  // [2026-01-25T01:11:04.767Z] GET /qa-engineer/projects - Started
  // [2026-01-25T01:11:05.213Z] GET /projects - 401
  
  // Ah! The user REGISTERED but did NOT LOGIN. 
  // Passport usually requires explicit login after register unless `req.login()` is called in the register handler.
  // Let's check `backend/routes/auth/qaEngineerAuth.js`.
  
  final http.Client _client = PersistentClient();

  Future<List<dynamic>> getAssignedProjects() async {
    final response = await _client.get(
      Uri.parse('$_baseUrl/qa-engineer/projects'),
      headers: {
        'Content-Type': 'application/json; charset=UTF-8',
      },
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      return data['projects'];
    } else {
      throw Exception('Failed to load projects: ${response.body}');
    }
  }

  Future<List<dynamic>> getProjectTasks(String projectId) async {
    final response = await _client.get(
      Uri.parse('$_baseUrl/qa-engineer/projects/$projectId/tasks'),
      headers: {'Content-Type': 'application/json'},
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      return data['tasks'] ?? [];
    } else {
      throw Exception('Failed to load tasks');
    }
  }

  Future<void> submitQualityReview(String taskId, int rating, String remarks) async {
    final response = await _client.post(
      Uri.parse('$_baseUrl/qa-engineer/tasks/$taskId/quality-review'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'rating': rating,
        'remarks': remarks,
      }),
    );

    if (response.statusCode != 200) {
      final data = jsonDecode(response.body);
      throw Exception(data['error'] ?? 'Failed to submit review');
    }
  }

  Future<Map<String, dynamic>> getMyProfile() async {
    final response = await _client.get(
      Uri.parse('$_baseUrl/qa-engineer/me'),
       headers: {'Content-Type': 'application/json'},
    );
     if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      return data['user'];
    } else {
      throw Exception('Failed to load profile');
    }
  }
}

