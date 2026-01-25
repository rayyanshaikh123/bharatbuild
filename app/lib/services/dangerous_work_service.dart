import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'auth_service.dart';
import '../providers/auth_providers.dart';
import '../config.dart';

class DangerousWorkService {
  final String _base;
  final http.Client _client;

  DangerousWorkService(this._base, this._client);

  Future<List<dynamic>> getAvailableTasks(String projectId) async {
    final uri = Uri.parse('$_base/labour/dangerous-task-requests/available-tasks?projectId=$projectId');
    final res = await _client.get(uri);
    if (res.statusCode == 200) {
      final data = jsonDecode(res.body) as Map<String, dynamic>;
      return data['dangerous_tasks'] as List<dynamic>;
    }
    throw Exception('Failed to fetch dangerous tasks: ${res.body}');
  }

  Future<List<dynamic>> getTaskTemplates(String projectId) async {
    final uri = Uri.parse('$_base/engineer/dangerous-tasks?projectId=$projectId');
    final res = await _client.get(uri);
    if (res.statusCode == 200) {
      final data = jsonDecode(res.body) as Map<String, dynamic>;
      return data['dangerous_tasks'] as List<dynamic>;
    }
    throw Exception('Failed to fetch task templates: ${res.body}');
  }

  Future<Map<String, dynamic>> createTaskTemplate(String projectId, String name, String description) async {
    final uri = Uri.parse('$_base/engineer/dangerous-tasks');
    print('[DangerousWorkService] Creating Task Template for Project: $projectId');
    final res = await _client.post(
      uri,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'projectId': projectId,
        'name': name,
        'description': description,
      }),
    );
    if (res.statusCode == 201) {
      return jsonDecode(res.body) as Map<String, dynamic>;
    }
    throw Exception('Failed to create task template: ${res.body}');
  }

  Future<List<dynamic>> getMyRequests(String projectId) async {
    final uri = Uri.parse('$_base/labour/dangerous-task-requests/my?projectId=$projectId');
    final res = await _client.get(uri);
    if (res.statusCode == 200) {
      final data = jsonDecode(res.body) as Map<String, dynamic>;
      return data['task_requests'] as List<dynamic>;
    }
    throw Exception('Failed to fetch my requests: ${res.body}');
  }

  Future<List<dynamic>> getProjectRequests(String projectId) async {
    // Call the dedicated engineer endpoint for safety authorizations
    final uri = Uri.parse('$_base/engineer/dangerous-tasks/requests?projectId=$projectId&status=REQUESTED');
    final res = await _client.get(uri);
    if (res.statusCode == 200) {
      final data = jsonDecode(res.body) as Map<String, dynamic>;
      return data['task_requests'] as List<dynamic>;
    }
    throw Exception('Failed to fetch project requests: ${res.body}');
  }

  Future<Map<String, dynamic>> createRequest(String taskId, String projectId) async {
    final uri = Uri.parse('$_base/labour/dangerous-task-requests');
    final res = await _client.post(
      uri,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'dangerousTaskId': taskId,
        'projectId': projectId,
      }),
    );
    if (res.statusCode == 201) {
      return jsonDecode(res.body) as Map<String, dynamic>;
    }
    throw Exception('Failed to create request: ${res.body}');
  }

  Future<Map<String, dynamic>> generateOtp(String requestId) async {
    final uri = Uri.parse('$_base/labour/dangerous-task-requests/$requestId/generate-otp');
    final res = await _client.post(uri);
    if (res.statusCode == 200) {
      return jsonDecode(res.body) as Map<String, dynamic>;
    }
    throw Exception('Failed to generate OTP: ${res.body}');
  }

  Future<Map<String, dynamic>> verifyOtp(String requestId, String otp) async {
    final uri = Uri.parse('$_base/labour/dangerous-task-requests/$requestId/verify-otp');
    final res = await _client.post(
      uri,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'otp': otp}),
    );
    if (res.statusCode == 200) {
      return jsonDecode(res.body) as Map<String, dynamic>;
    }
    throw Exception('Verification failed: ${res.body}');
  }

  Future<Map<String, dynamic>> authorizeRequest(String requestId, String otp) async {
    // Call the dedicated engineer endpoint for OTP verification
    final uri = Uri.parse('$_base/engineer/dangerous-tasks/authorize');
    final res = await _client.post(
      uri,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'requestId': requestId,
        'otp': otp,
      }),
    );
    if (res.statusCode == 200) {
      return jsonDecode(res.body) as Map<String, dynamic>;
    }
    throw Exception('Authorization failed: ${res.body}');
  }
}

final dangerousWorkServiceProvider = Provider<DangerousWorkService>((ref) {
  final authService = ref.watch(authServiceProvider);
  // Use the same base as authService (from config.dart)
  return DangerousWorkService(API_BASE_URL, authService.client);
});
