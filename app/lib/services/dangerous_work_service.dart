import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'auth_service.dart';
import '../providers/auth_providers.dart';

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

  Future<List<dynamic>> getMyRequests(String projectId) async {
    final uri = Uri.parse('$_base/labour/dangerous-task-requests/my?projectId=$projectId');
    final res = await _client.get(uri);
    if (res.statusCode == 200) {
      final data = jsonDecode(res.body) as Map<String, dynamic>;
      return data['task_requests'] as List<dynamic>;
    }
    throw Exception('Failed to fetch my requests: ${res.body}');
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
}

final dangerousWorkServiceProvider = Provider<DangerousWorkService>((ref) {
  final authService = ref.watch(authServiceProvider);
  // We can reuse the same settings as authService if we had access to them, 
  // but better to just use the base url from environment or config.
  // For now, let's assume it's the same base as authService.
  // Actually, I'll update AuthService to expose its client/base or just use it.
  return DangerousWorkService('http://172.16.7.241:3001', (authService as dynamic)._client);
});
