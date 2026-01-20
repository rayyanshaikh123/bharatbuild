import 'dart:convert';
import 'package:http/http.dart' as http;
import 'persistent_client.dart';

class AuthService {
  // Update this to your backend address when running on device/emulator
  // Backend is running on localhost:3001; for Android emulator use 10.0.2.2
  static const String _base = 'http://10.0.2.2:3001';

  // shared persistent client used for requests so cookies are preserved
  final http.Client _client = PersistentClient();

  Future<void> requestLabourOtp(String phone) async {
    final uri = Uri.parse('$_base/auth/labour/otp/request');
    final res = await _client.post(
      uri,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'phone': phone}),
    );
    if (res.statusCode != 200 && res.statusCode != 201) {
      throw Exception('OTP request failed: ${res.body}');
    }
  }

  Future<Map<String, dynamic>> verifyLabourOtp(String phone, String otp) async {
    final uri = Uri.parse('$_base/auth/labour/otp/verify');
    final res = await _client.post(
      uri,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'phone': phone, 'otp': otp}),
    );
    if (res.statusCode != 200) {
      throw Exception('OTP verify failed: ${res.body}');
    }
    return jsonDecode(res.body) as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> engineerLogin(
    String email,
    String password,
  ) async {
    final uri = Uri.parse('$_base/auth/engineer/login');
    final res = await _client.post(
      uri,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'email': email, 'password': password}),
    );
    if (res.statusCode != 200) {
      throw Exception('Login failed: ${res.body}');
    }
    return jsonDecode(res.body) as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> engineerRegister(
    String name,
    String email,
    String phone,
    String password,
  ) async {
    final uri = Uri.parse('$_base/auth/engineer/register');
    final res = await _client.post(
      uri,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'name': name,
        'email': email,
        'phone': phone,
        'password': password,
      }),
    );
    if (res.statusCode != 201) {
      throw Exception('Register failed: ${res.body}');
    }
    return jsonDecode(res.body) as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> labourRegister(String name, String phone) async {
    final uri = Uri.parse('$_base/auth/labour/register');
    final res = await _client.post(
      uri,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'name': name, 'phone': phone}),
    );
    if (res.statusCode != 201) {
      throw Exception('Register failed: ${res.body}');
    }
    return jsonDecode(res.body) as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> managerRegister(
    String name,
    String email,
    String phone,
    String password,
  ) async {
    final uri = Uri.parse('$_base/auth/manager/register');
    final res = await _client.post(
      uri,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'name': name,
        'email': email,
        'phone': phone,
        'password': password,
      }),
    );
    if (res.statusCode != 201) {
      throw Exception('Register failed: ${res.body}');
    }
    return jsonDecode(res.body) as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> managerLogin(
    String email,
    String password,
  ) async {
    final uri = Uri.parse('$_base/auth/manager/login');
    final res = await _client.post(
      uri,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'email': email, 'password': password}),
    );
    if (res.statusCode != 200) {
      throw Exception('Login failed: ${res.body}');
    }
    return jsonDecode(res.body) as Map<String, dynamic>;
  }

  /// Logout (clears server session and local cookies)
  Future<void> logoutLabour() async {
    final uri = Uri.parse('$_base/auth/labour/logout');
    final res = await _client.post(uri);
    await PersistentClient.clearCookies();
    if (res.statusCode != 200) {
      throw Exception('Logout failed: ${res.body}');
    }
  }

  Future<void> logoutEngineer() async {
    final uri = Uri.parse('$_base/auth/engineer/logout');
    final res = await _client.post(uri);
    await PersistentClient.clearCookies();
    if (res.statusCode != 200) {
      throw Exception('Logout failed: ${res.body}');
    }
  }

  /// Check current labour session. Returns user map if authenticated, null otherwise.
  Future<Map<String, dynamic>?> checkLabourSession() async {
    final uri = Uri.parse('$_base/labour/check-auth');
    final res = await _client.get(uri);
    if (res.statusCode == 200) {
      final data = jsonDecode(res.body) as Map<String, dynamic>;
      return data['labour'] as Map<String, dynamic>?;
    }
    return null;
  }

  Future<Map<String, dynamic>?> checkEngineerSession() async {
    final uri = Uri.parse('$_base/engineer/check-auth');
    final res = await _client.get(uri);
    if (res.statusCode == 200) {
      final data = jsonDecode(res.body) as Map<String, dynamic>;
      return data['engineer'] as Map<String, dynamic>?;
    }
    return null;
  }

  /// Fetch labour profile from backend (requires session cookie)
  Future<Map<String, dynamic>?> getLabourProfile() async {
    final uri = Uri.parse('$_base/labour/profile');
    final res = await _client.get(uri);
    if (res.statusCode == 200) {
      final data = jsonDecode(res.body) as Map<String, dynamic>;
      return data['labour'] as Map<String, dynamic>?;
    }
    return null;
  }

  /// Update labour profile on backend. Expects session cookie to be present.
  Future<Map<String, dynamic>?> updateLabourProfile(
    Map<String, dynamic> payload,
  ) async {
    final uri = Uri.parse('$_base/labour/profile');
    final res = await _client.patch(
      uri,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode(payload),
    );
    if (res.statusCode == 200) {
      final data = jsonDecode(res.body) as Map<String, dynamic>;
      return data['labour'] as Map<String, dynamic>?;
    }
    throw Exception('Update failed: ${res.statusCode} ${res.body}');
  }

  /* ---------------- JOB FEED ---------------- */

  Future<List<dynamic>> getAvailableJobs() async {
    final uri = Uri.parse('$_base/labour/jobs/available');
    final res = await _client.get(uri);
    if (res.statusCode == 200) {
      final data = jsonDecode(res.body) as Map<String, dynamic>;
      return data['jobs'] as List<dynamic>;
    }
    throw Exception('Failed to fetch jobs: ${res.body}');
  }

  Future<void> applyForJob(String jobId) async {
    final uri = Uri.parse('$_base/labour/jobs/$jobId/apply');
    final res = await _client.post(uri);
    if (res.statusCode != 200) {
      throw Exception('Failed to apply for job: ${res.body}');
    }
  }

  Future<List<dynamic>> getMyApplications() async {
    final uri = Uri.parse('$_base/labour/jobs/my-applications');
    final res = await _client.get(uri);
    if (res.statusCode == 200) {
      final data = jsonDecode(res.body) as Map<String, dynamic>;
      return data['applications'] as List<dynamic>;
    }
    throw Exception('Failed to fetch applications: ${res.body}');
  }

  Future<Map<String, dynamic>> getJobDetails(String jobId) async {
    final uri = Uri.parse('$_base/labour/jobs/$jobId');
    final res = await _client.get(uri);
    if (res.statusCode == 200) {
      final data = jsonDecode(res.body) as Map<String, dynamic>;
      return data['job'] as Map<String, dynamic>;
    }
    throw Exception('Failed to fetch job details: ${res.body}');
  }

  /* ---------------- ADDRESSES ---------------- */

  Future<List<dynamic>> getAddresses() async {
    final uri = Uri.parse('$_base/labour/addresses');
    final res = await _client.get(uri);
    if (res.statusCode == 200) {
      final data = jsonDecode(res.body) as Map<String, dynamic>;
      return data['addresses'] as List<dynamic>;
    }
    throw Exception('Failed to fetch addresses: ${res.body}');
  }

  Future<Map<String, dynamic>> addAddress(Map<String, dynamic> payload) async {
    final uri = Uri.parse('$_base/labour/addresses');
    final res = await _client.post(
      uri,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode(payload),
    );
    if (res.statusCode == 201) {
      final data = jsonDecode(res.body) as Map<String, dynamic>;
      return data['address'] as Map<String, dynamic>;
    }
    throw Exception('Failed to add address: ${res.body}');
  }

  Future<void> deleteAddress(String id) async {
    final uri = Uri.parse('$_base/labour/addresses/$id');
    final res = await _client.delete(uri);
    if (res.statusCode != 200) {
      throw Exception('Failed to delete address: ${res.body}');
    }
  }

  Future<void> updateAddress(String id, Map<String, dynamic> payload) async {
    final uri = Uri.parse('$_base/labour/addresses/$id');
    final res = await _client.patch(
      uri,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode(payload),
    );
    if (res.statusCode != 200) {
      throw Exception('Failed to update address: ${res.body}');
    }
  }

  /* ---------------- ATTENDANCE ---------------- */

  Future<Map<String, dynamic>> checkIn(String projectId, double lat, double lon) async {
    final uri = Uri.parse('$_base/labour/attendance/check-in');
    final res = await _client.post(
      uri,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'project_id': projectId,
        'latitude': lat,
        'longitude': lon,
      }),
    );
    if (res.statusCode == 201) {
      final data = jsonDecode(res.body) as Map<String, dynamic>;
      return data['attendance'] as Map<String, dynamic>;
    }
    throw Exception('Check-in failed: ${res.body}');
  }

  Future<Map<String, dynamic>> checkOut() async {
    final uri = Uri.parse('$_base/labour/attendance/check-out');
    final res = await _client.post(uri);
    if (res.statusCode == 200) {
      final data = jsonDecode(res.body) as Map<String, dynamic>;
      return data['attendance'] as Map<String, dynamic>;
    }
    throw Exception('Check-out failed: ${res.body}');
  }

  Future<List<dynamic>> getAttendanceHistory() async {
    final uri = Uri.parse('$_base/labour/attendance/history');
    final res = await _client.get(uri);
    if (res.statusCode == 200) {
      final data = jsonDecode(res.body) as Map<String, dynamic>;
      return data['history'] as List<dynamic>;
    }
    throw Exception('Failed to fetch attendance: ${res.body}');
  }

  Future<Map<String, dynamic>?> getTodayAttendance() async {
    final uri = Uri.parse('$_base/labour/attendance/today');
    final res = await _client.get(uri);
    if (res.statusCode == 200) {
      final data = jsonDecode(res.body) as Map<String, dynamic>;
      return data['attendance'] as Map<String, dynamic>?;
    }
    return null;
  }
}
