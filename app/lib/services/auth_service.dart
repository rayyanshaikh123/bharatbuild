import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';
import 'package:intl/intl.dart';
import 'persistent_client.dart';
import '../config.dart';

class AuthService {
  static final String _base = API_BASE_URL;

  // shared persistent client used for requests so cookies are preserved
  final http.Client _client = PersistentClient();

  /// Helper method to extract error message from response
  String _extractErrorMessage(http.Response response) {
    try {
      final body = jsonDecode(response.body);
      if (body is Map && body.containsKey('error')) {
        return body['error'] as String;
      }
      if (body is Map && body.containsKey('message')) {
        return body['message'] as String;
      }
    } catch (_) {
      // If parsing fails, return the raw body
    }
    return response.body.isNotEmpty ? response.body : 'Unknown error occurred';
  }

  /// Helper method to throw formatted exception
  Never _throwError(String operation, http.Response response) {
    final errorMsg = _extractErrorMessage(response);
    throw Exception('$operation: $errorMsg');
  }

  Future<void> requestLabourOtp(String phone) async {
    final uri = Uri.parse('$_base/auth/labour/otp/request');
    final res = await _client.post(
      uri,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'phone': phone}),
    );
    if (res.statusCode != 200 && res.statusCode != 201) {
      _throwError('OTP request failed', res);
    }
  }

  Future<Map<String, dynamic>> verifyLabourOtp(String phone, String otp) async {
    final uri = Uri.parse('$_base/auth/labour/otp/verify');
    final res = await _client.post(
      uri,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'phone': phone, 'otp': otp}),
    ).timeout(const Duration(seconds: 60));
    if (res.statusCode != 200) {
      _throwError('OTP verification failed', res);
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
    ).timeout(const Duration(seconds: 60));
    if (res.statusCode != 200) {
      _throwError('Login failed', res);
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
    ).timeout(const Duration(seconds: 60));
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
    ).timeout(const Duration(seconds: 60));
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
    ).timeout(const Duration(seconds: 60));
    if (res.statusCode != 201) {
      throw Exception('Register failed: ${res.body}');
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
    try {
      final res = await _client.get(uri).timeout(const Duration(seconds: 30));
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body) as Map<String, dynamic>;
        return data['labour'] as Map<String, dynamic>?;
      }
    } catch (_) {
      // Timeout or error -> assume logged out or offline
      return null;
    }
    return null;
  }

  Future<Map<String, dynamic>?> checkEngineerSession() async {
    final uri = Uri.parse('$_base/engineer/check-auth');
    try {
      final res = await _client.get(uri).timeout(const Duration(seconds: 30));
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body) as Map<String, dynamic>;
        return data['engineer'] as Map<String, dynamic>?;
      }
    } catch (_) {
      // Timeout or error -> assume logged out or offline
      return null;
    }
    return null;
  }

  /// Fetch labour profile from backend (requires session cookie)
  Future<Map<String, dynamic>?> getLabourProfile() async {
    final uri = Uri.parse('$_base/labour/profile');
    try {
      final res = await _client.get(uri).timeout(const Duration(seconds: 15));
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body) as Map<String, dynamic>;
        return data['labour'] as Map<String, dynamic>?;
      }
    } catch (_) {}
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
    ).timeout(const Duration(seconds: 15));
    if (res.statusCode == 200) {
      final data = jsonDecode(res.body) as Map<String, dynamic>;
      return data['labour'] as Map<String, dynamic>?;
    }
    throw Exception('Update failed: ${res.statusCode} ${res.body}');
  }

  /// Fetch engineer profile from backend (requires session cookie)
  Future<Map<String, dynamic>?> getEngineerProfile() async {
    final uri = Uri.parse('$_base/engineer/profile');
    try {
      final res = await _client.get(uri).timeout(const Duration(seconds: 15));
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body) as Map<String, dynamic>;
        return data['engineer'] as Map<String, dynamic>?;
      }
    } catch (_) {
      // Timeout or network error
    }
    return null;
  }

  /// Update engineer profile on backend. Expects session cookie to be present.
  Future<Map<String, dynamic>?> updateEngineerProfile(
    Map<String, dynamic> payload,
  ) async {
    final uri = Uri.parse('$_base/engineer/profile');
    final res = await _client.patch(
      uri,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode(payload),
    ).timeout(const Duration(seconds: 15));
    if (res.statusCode == 200) {
      final data = jsonDecode(res.body) as Map<String, dynamic>;
      return data['engineer'] as Map<String, dynamic>?;
    }
    throw Exception('Update failed: ${res.statusCode} ${res.body}');
  }

  /* ---------------- ORGANIZATIONS ---------------- */
  Future<Map<String, dynamic>> getOrganizations() async {
    final uri = Uri.parse('$_base/engineer/organization/all');
    final res = await _client.get(uri);
    if (res.statusCode != 200) throw Exception('Failed to fetch organizations');
    return jsonDecode(res.body);
  }

  Future<Map<String, dynamic>> getCurrentOrganization() async {
    final uri = Uri.parse('$_base/engineer/organization/');
    final res = await _client.get(uri);
    // 404 is fine here, means no org
    if (res.statusCode == 404) return {'organizations': []};
    if (res.statusCode != 200) throw Exception('Failed to fetch organization');
    return jsonDecode(res.body);
  }

  Future<Map<String, dynamic>> getMyOrgRequests() async {
    final uri = Uri.parse('$_base/engineer/organization/my-requests');
    final res = await _client.get(uri);
    if (res.statusCode != 200) throw Exception('Failed to fetch requests');
    return jsonDecode(res.body);
  }

  Future<void> joinOrganization(String orgId) async {
    final uri = Uri.parse('$_base/engineer/organization/join-organization');
    final res = await _client.post(
      uri,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'organizationId': orgId}),
    );
    if (res.statusCode != 200) throw Exception('Failed to join organization: ${res.body}');
  }

  /* ---------------- LABOUR REQUESTS (ENGINEER) ---------------- */

  /// Get all labour requests created by the engineer
  Future<List<dynamic>> getLabourRequests() async {
    final uri = Uri.parse('$_base/engineer/labour-requests');
    final res = await _client.get(uri);
    if (res.statusCode == 200) {
      final data = jsonDecode(res.body) as Map<String, dynamic>;
      return data['requests'] as List<dynamic>;
    }
    throw Exception('Failed to fetch labour requests: ${res.body}');
  }

  /// Create a new labour request
  Future<void> createLabourRequest(Map<String, dynamic> payload) async {
    final uri = Uri.parse('$_base/engineer/labour-requests');
    final res = await _client.post(
      uri,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode(payload),
    );
    if (res.statusCode != 201) {
      throw Exception('Failed to create labour request: ${res.body}');
    }
  }

  /// Get applicants for a specific labour request
  Future<List<dynamic>> getLabourRequestApplicants(String requestId) async {
    final uri = Uri.parse('$_base/engineer/labour-requests/$requestId/applicants');
    final res = await _client.get(uri);
    if (res.statusCode == 200) {
      final data = jsonDecode(res.body) as Map<String, dynamic>;
      return data['applicants'] as List<dynamic>;
    }
    throw Exception('Failed to fetch applicants: ${res.body}');
  }

  /// Approve a labourer for a labour request
  Future<void> approveLabourer(String requestId, String labourId) async {
    final uri = Uri.parse('$_base/engineer/labour-requests/$requestId/approve/$labourId');
    final res = await _client.post(uri);
    if (res.statusCode != 200) {
      throw Exception('Failed to approve labourer: ${res.body}');
    }
  }

  /// Reject a labourer for a labour request
  Future<void> rejectLabourer(String requestId, String labourId) async {
    final uri = Uri.parse('$_base/engineer/labour-requests/$requestId/reject/$labourId');
    final res = await _client.post(uri);
    if (res.statusCode != 200) {
      throw Exception('Failed to reject labourer: ${res.body}');
    }
  }

  /* ---------------- PROJECTS (ENGINEER) ---------------- */

  Future<List<dynamic>> getMyProjects() async {
    final uri = Uri.parse('$_base/engineer/project-requests/my-projects');
    final res = await _client.get(uri);
    if (res.statusCode == 200) {
      final data = jsonDecode(res.body) as Map<String, dynamic>;
      return data['projects'] as List<dynamic>;
    }
    throw Exception('Failed to fetch projects: ${res.body}');
  }

  /// Get all projects for a specific organization (to request access)
  Future<List<dynamic>> getOrgProjects(String orgId) async {
    final uri = Uri.parse('$_base/engineer/project-requests/projects?organizationId=$orgId');
    final res = await _client.get(uri);
    if (res.statusCode == 200) {
      final data = jsonDecode(res.body) as Map<String, dynamic>;
      return data['projects'] as List<dynamic>;
    }
    throw Exception('Failed to fetch org projects: ${res.body}');
  }

  /// Request to join a project
  Future<void> joinProject(String projectId, String orgId) async {
    final uri = Uri.parse('$_base/engineer/project-requests/project-join/$projectId');
    final res = await _client.post(
      uri,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'organizationId': orgId}),
    );
    if (res.statusCode != 200) {
      _throwError('Failed to join project', res);
    }
  }

  /// Get my pending project requests
  Future<List<dynamic>> getMyProjectRequests() async {
    final uri = Uri.parse('$_base/engineer/project-requests/my-requests');
    final res = await _client.get(uri);
    if (res.statusCode == 200) {
      final data = jsonDecode(res.body) as Map<String, dynamic>;
      return data['requests'] as List<dynamic>;
    }
    throw Exception('Failed to fetch requests: ${res.body}');
  }

  /* ---------------- DPR (ENGINEER) ---------------- */

  Future<List<dynamic>> getProjectPlanItems(String projectId) async {
    final uri = Uri.parse('$_base/engineer/dpr/projects/$projectId/plans/items');
    final res = await _client.get(uri);
    if (res.statusCode == 200) {
      final data = jsonDecode(res.body) as Map<String, dynamic>;
      return data['plan_items'] as List<dynamic>;
    }
    throw Exception('Failed to fetch plan items: ${res.body}');
  }

  Future<void> createDPR(String projectId, Map<String, dynamic> payload) async {
    final uri = Uri.parse('$_base/engineer/dpr/projects/$projectId/dprs');
    final res = await _client.post(
      uri,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode(payload),
    );
    if (res.statusCode != 201) {
      throw Exception('Failed to create DPR: ${res.body}');
    }
  }

  Future<List<dynamic>> getMyDPRs(String projectId) async {
    final uri = Uri.parse('$_base/engineer/dpr/projects/$projectId/dprs/my');
    final res = await _client.get(uri);
    if (res.statusCode == 200) {
      final data = jsonDecode(res.body) as Map<String, dynamic>;
      return data['dprs'] as List<dynamic>;
    }
    throw Exception('Failed to fetch DPRs: ${res.body}');
  }

  /* ---------------- ATTENDANCE (ENGINEER) ---------------- */

  Future<List<dynamic>> getProjectTodayAttendance(String projectId, {String? date}) async {
    final dateStr = date ?? DateFormat('yyyy-MM-dd').format(DateTime.now());
    final uri = Uri.parse('$_base/engineer/attendance/today?projectId=$projectId&date=$dateStr');
    final res = await _client.get(uri);
    if (res.statusCode == 200) {
      final data = jsonDecode(res.body) as Map<String, dynamic>;
      return data['attendance'] as List<dynamic>;
    }
    throw Exception('Failed to fetch attendance: ${res.body}');
  }

  Future<void> markAttendance(Map<String, dynamic> payload) async {
    final uri = Uri.parse('$_base/engineer/attendance/mark');
    final res = await _client.post(
      uri,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode(payload),
    );
    if (res.statusCode != 200) {
      throw Exception('Failed to mark attendance: ${res.body}');
    }
  }

  Future<Map<String, dynamic>> searchLabourByPhone(String phone) async {
    final uri = Uri.parse('$_base/engineer/attendance/search-labour?phone=$phone');
    final res = await _client.get(uri);
    if (res.statusCode == 200) {
      final data = jsonDecode(res.body) as Map<String, dynamic>;
      return data['labour'] as Map<String, dynamic>;
    }
    throw Exception('Labourer not found: ${res.body}');
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
      return jsonDecode(res.body) as Map<String, dynamic>;
    }
    throw Exception('Failed to fetch job details: ${res.body}');
  }

  /* ---------------- PROJECTS ---------------- */

  Future<Map<String, dynamic>> getAllProjects() async {
    final uri = Uri.parse('$_base/labour/projects/all');
    final res = await _client.get(uri);
    if (res.statusCode == 200) {
      return jsonDecode(res.body) as Map<String, dynamic>;
    }
    throw Exception('Failed to fetch projects: ${res.body}');
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

  Future<void> setPrimaryAddress(String id) async {
    final uri = Uri.parse('$_base/labour/addresses/$id/set-primary');
    final res = await _client.patch(uri);
    if (res.statusCode != 200) {
      throw Exception('Failed to set primary address: ${res.body}');
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
      return (data['attendance'] ?? data['session']) as Map<String, dynamic>;
    }
    throw Exception('Check-out failed: ${res.body}');
  }

  Future<Map<String, dynamic>> getLiveStatus() async {
    final uri = Uri.parse('$_base/labour/attendance/live-status');
    final res = await _client.get(uri);
    if (res.statusCode == 200) {
      return jsonDecode(res.body) as Map<String, dynamic>;
    }
    throw Exception('Failed to fetch live status: ${res.body}');
  }

  Future<void> trackLocation(double lat, double lon) async {
    final uri = Uri.parse('$_base/labour/attendance/track');
    await _client.post(
      uri,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'latitude': lat, 'longitude': lon}),
    );
  }

  Future<Map<String, dynamic>> scanQRCode(String qrToken) async {
    final uri = Uri.parse('$_base/labour/tools/scan');
    final res = await _client.post(
      uri,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'qrToken': qrToken}),
    );
    if (res.statusCode == 200 || res.statusCode == 201) {
      return jsonDecode(res.body) as Map<String, dynamic>;
    }
    throw Exception('Scan failed: ${res.body}');
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

  /* ---------------- WAGES (LABOUR) ---------------- */
  Future<Map<String, dynamic>> getLabourWages() async {
    final uri = Uri.parse('$_base/labour/wages/my-wages');
    final res = await _client.get(uri);
    if (res.statusCode == 200) {
      return jsonDecode(res.body) as Map<String, dynamic>;
    }
    throw Exception('Failed to fetch wages: ${res.body}');
  }

  /* ---------------- MATERIAL MANAGEMENT ---------------- */
  Future<Map<String, dynamic>> createMaterialRequest(Map<String, dynamic> data) async {
    final uri = Uri.parse('$_base/engineer/material/request');
    final res = await _client.post(
      uri,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode(data),
    );
    if (res.statusCode == 201) {
      return jsonDecode(res.body) as Map<String, dynamic>;
    }
    throw Exception('Failed to create material request: ${res.body}');
  }

  Future<List<dynamic>> getMaterialRequests({String? projectId}) async {
    var url = '$_base/engineer/material/requests';
    if (projectId != null) url += '?project_id=$projectId';
    final uri = Uri.parse(url);
    final res = await _client.get(uri);
    if (res.statusCode == 200) {
      final data = jsonDecode(res.body) as Map<String, dynamic>;
      return data['requests'] as List<dynamic>;
    }
    throw Exception('Failed to fetch material requests: ${res.body}');
  }

  Future<Map<String, dynamic>> uploadMaterialBill(Map<String, dynamic> data) async {
    final uri = Uri.parse('$_base/engineer/material/upload-bill');
    final res = await _client.post(
      uri,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode(data),
    );
    if (res.statusCode == 201) {
      return jsonDecode(res.body) as Map<String, dynamic>;
    }
    throw Exception('Failed to upload material bill: ${res.body}');
  }

  Future<List<dynamic>> getMaterialBills({String? projectId}) async {
    var url = '$_base/engineer/material/bills';
    if (projectId != null) url += '?project_id=$projectId';
    final uri = Uri.parse(url);
    final res = await _client.get(uri);
    if (res.statusCode == 200) {
      final data = jsonDecode(res.body) as Map<String, dynamic>;
      return data['bills'] as List<dynamic>;
    }
    throw Exception('Failed to fetch material bills: ${res.body}');
  }

  /* ---------------- AI / OCR ---------------- */
  Future<Map<String, dynamic>> ocrBill(Map<String, dynamic> data) async {
    final uri = Uri.parse('$_base/engineer/ai/ocr-bill');
    final res = await _client.post(
      uri,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode(data),
    );
    if (res.statusCode == 200) {
      return jsonDecode(res.body) as Map<String, dynamic>;
    }
    throw Exception('OCR failed: ${res.body}');
  }

  /* ---------------- WAGES ---------------- */
  Future<List<dynamic>> getWageQueue(String projectId, {String? date}) async {
    final dateStr = date ?? DateFormat('yyyy-MM-dd').format(DateTime.now());
    final uri = Uri.parse('$_base/engineer/wages/queue?projectId=$projectId&date=$dateStr');
    final res = await _client.get(uri);
    if (res.statusCode == 200) {
      final data = jsonDecode(res.body) as Map<String, dynamic>;
      return data['queue'] as List<dynamic>;
    }
    throw Exception('Failed to fetch wage queue: ${res.body}');
  }

  Future<void> submitWage(Map<String, dynamic> payload) async {
    final uri = Uri.parse('$_base/engineer/wages/submit');
    final res = await _client.post(
      uri,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode(payload),
    );
    if (res.statusCode != 200) {
      throw Exception('Failed to submit wage: ${res.body}');
    }
  }

  /* ---------------- OFFLINE SYNC ---------------- */
  Future<Map<String, dynamic>> syncBatch(String role, List<Map<String, dynamic>> actions) async {
    final endpoint = role == 'LABOUR' ? '/sync/labour' : '/sync/engineer';
    final uri = Uri.parse('$_base$endpoint');
    
    final res = await _client.post(
      uri,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'actions': actions}),
    );

    if (res.statusCode >= 400) {
      throw Exception('Batch sync failed (${res.statusCode}): ${res.body}');
    }

    return jsonDecode(res.body) as Map<String, dynamic>;
  }

  Future<void> syncQueueItem({
    required String endpoint,
    required String method,
    Map<String, dynamic>? payload,
  }) async {
    final uri = Uri.parse('$_base$endpoint');
    final body = payload != null ? jsonEncode(payload) : null;
    final headers = {'Content-Type': 'application/json'};

    http.Response res;
    if (method == 'POST') {
      res = await _client.post(uri, headers: headers, body: body);
    } else if (method == 'PATCH') {
      res = await _client.patch(uri, headers: headers, body: body);
    } else if (method == 'PUT') {
      res = await _client.put(uri, headers: headers, body: body);
    } else {
      res = await _client.get(uri, headers: headers);
    }

    if (res.statusCode >= 400) {
      throw Exception('Sync failed (${res.statusCode}): ${res.body}');
    }
  }

  /* ---------------- INVENTORY / LEDGER ---------------- */
  Future<List<dynamic>> getProjectStock(String projectId) async {
    final uri = Uri.parse('$_base/engineer/ledger/stock/$projectId');
    final res = await _client.get(uri);
    if (res.statusCode == 200) {
      final data = jsonDecode(res.body);
      return data['stock'] as List<dynamic>;
    }
    throw Exception('Failed to load stock: ${res.body}');
  }

  Future<List<dynamic>> getLedgerHistory(String projectId) async {
    final uri = Uri.parse('$_base/engineer/ledger/history/$projectId');
    final res = await _client.get(uri);
    if (res.statusCode == 200) {
      final data = jsonDecode(res.body);
      return data['history'] as List<dynamic>;
    }
    throw Exception('Failed to load ledger history: ${res.body}');
  }

  Future<void> recordMaterialMovement(Map<String, dynamic> data) async {
    final uri = Uri.parse('$_base/engineer/ledger/movement');
    final res = await _client.post(
      uri,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode(data),
    );
    if (res.statusCode != 200 && res.statusCode != 201) {
      throw Exception('Failed to record movement: ${res.body}');
    }
  }

  /* ---------------- DASHBOARD (ENGINEER) ---------------- */

  Future<Map<String, dynamic>> getEngineerDashboard() async {
    final uri = Uri.parse('$_base/engineer/dashboard');
    final res = await _client.get(uri);
    if (res.statusCode == 200) {
      return jsonDecode(res.body) as Map<String, dynamic>;
    }
    throw Exception('Failed to fetch dashboard: ${res.body}');
  }

  /* ---------------- PROJECT PLAN (ENGINEER) ---------------- */
  Future<Map<String, dynamic>> getProjectPlan(String projectId) async {
    final uri = Uri.parse('$_base/engineer/plan/plans/$projectId');
    final res = await _client.get(uri);
    if (res.statusCode == 200) {
      return jsonDecode(res.body) as Map<String, dynamic>;
    }
    throw Exception('Failed to fetch plan: ${res.body}');
  }

  Future<Map<String, dynamic>> updatePlanItem(String itemId, Map<String, dynamic> payload) async {
    final uri = Uri.parse('$_base/engineer/plan/plan-items/$itemId');
    final res = await _client.patch(
      uri,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode(payload),
    );
    if (res.statusCode == 200) {
      return jsonDecode(res.body) as Map<String, dynamic>;
    }
    throw Exception('Failed to update task: ${res.body}');
  }

  Future<Map<String, dynamic>> getEngineerNotifications() async {
    final uri = Uri.parse('$_base/engineer/notifications');
    final res = await _client.get(uri);
    if (res.statusCode == 200) {
      return jsonDecode(res.body) as Map<String, dynamic>;
    }
    throw Exception('Failed to fetch notifications: ${res.body}');
  }

  Future<Map<String, dynamic>> getEngineerActivities() async {
    final uri = Uri.parse('$_base/engineer/audits');
    final res = await _client.get(uri);
    if (res.statusCode == 200) {
      return jsonDecode(res.body) as Map<String, dynamic>;
    }
    throw Exception('Failed to fetch activities: ${res.body}');
  }

  Future<void> markEngineerNotificationsRead() async {
    final uri = Uri.parse('$_base/engineer/notifications/read-all');
    final res = await _client.post(uri);
    if (res.statusCode != 200) {
      throw Exception('Failed to mark notifications as read: ${res.body}');
    }
  }

  Future<void> markEngineerNotificationRead(String id) async {
    final uri = Uri.parse('$_base/engineer/notifications/$id/read');
    final res = await _client.post(uri);
    if (res.statusCode != 200) {
      throw Exception('Failed to mark notification as read: ${res.body}');
    }
  }

  /* ---------------- LABOUR NOTIFICATIONS ---------------- */

  Future<Map<String, dynamic>> getLabourNotifications() async {
    final uri = Uri.parse('$_base/labour/notifications');
    final res = await _client.get(uri);
    if (res.statusCode == 200) {
      return jsonDecode(res.body) as Map<String, dynamic>;
    }
    throw Exception('Failed to fetch notifications: ${res.body}');
  }

  Future<void> markLabourNotificationsRead() async {
    final uri = Uri.parse('$_base/labour/notifications/read-all');
    final res = await _client.post(uri);
    if (res.statusCode != 200) {
      throw Exception('Failed to mark notifications as read: ${res.body}');
    }
  }

  Future<void> markLabourNotificationRead(String id) async {
    final uri = Uri.parse('$_base/labour/notifications/$id/read');
    final res = await _client.post(uri);
    if (res.statusCode != 200) {
      throw Exception('Failed to mark notification as read: ${res.body}');
    }
  }

  /* ---------------- PURCHASE ORDERS (ENGINEER) ---------------- */
  Future<List<dynamic>> getSentPurchaseOrders(String projectId) async {
    final uri = Uri.parse('$_base/engineer/purchase-orders/sent/list')
        .replace(queryParameters: {'projectId': projectId});
    final res = await _client.get(uri);
    if (res.statusCode == 200) {
      final body = jsonDecode(res.body) as Map<String, dynamic>;
      return body['purchase_orders'] as List<dynamic>;
    }
    throw Exception('Failed to fetch purchase orders: ${res.body}');
  }

  Future<Map<String, dynamic>> getPurchaseOrder(String poId) async {
    final uri = Uri.parse('$_base/engineer/purchase-orders/$poId');
    final res = await _client.get(uri);
    if (res.statusCode == 200) {
      return jsonDecode(res.body) as Map<String, dynamic>;
    }
    throw Exception('Failed to fetch purchase order: ${res.body}');
  }

  /* ---------------- GRN (ENGINEER) ---------------- */
  Future<Map<String, dynamic>> createGRN({
    required String projectId,
    required String purchaseOrderId,
    required String materialRequestId,
    required List<Map<String, dynamic>> receivedItems,
    String? remarks,
    required File billImage,
    required File proofImage,
  }) async {
    final uri = Uri.parse('$_base/engineer/grns');
    
    // Create multipart request
    final request = http.MultipartRequest('POST', uri);
    
    // Add images
    request.files.add(
      await http.MultipartFile.fromPath(
        'bill_image',
        billImage.path,
        filename: 'bill.jpg',
        contentType: MediaType('image', 'jpeg'),
      ),
    );
    
    request.files.add(
      await http.MultipartFile.fromPath(
        'proof_image',
        proofImage.path,
        filename: 'proof.jpg',
        contentType: MediaType('image', 'jpeg'),
      ),
    );

    // Add form fields
    request.fields['projectId'] = projectId;
    request.fields['purchaseOrderId'] = purchaseOrderId;
    request.fields['materialRequestId'] = materialRequestId;
    request.fields['receivedItems'] = jsonEncode(receivedItems);
    if (remarks != null && remarks.isNotEmpty) {
      request.fields['remarks'] = remarks;
    }

    // Send request
    final streamedResponse = await _client.send(request);
    final response = await http.Response.fromStream(streamedResponse);

    if (response.statusCode != 201) {
      _throwError('GRN creation failed', response);
    }

    return jsonDecode(response.body) as Map<String, dynamic>;
  }

  Future<List<dynamic>> getGRNs(String projectId) async {
    final uri = Uri.parse('$_base/engineer/grns')
        .replace(queryParameters: {'projectId': projectId});
    final res = await _client.get(uri);
    if (res.statusCode == 200) {
      final body = jsonDecode(res.body) as Map<String, dynamic>;
      return body['grns'] as List<dynamic>;
    }
    throw Exception('Failed to fetch GRNs: ${res.body}');
  }

  // ==================== TOOLS MANAGEMENT ====================
  
  /// Create a new tool
  Future<Map<String, dynamic>> createTool(Map<String, dynamic> data) async {
    final uri = Uri.parse('$_base/engineer/tools');
    try {
      final res = await _client
          .post(
            uri,
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode(data),
          )
          .timeout(const Duration(seconds: 30));
      if (res.statusCode == 201) {
        return jsonDecode(res.body) as Map<String, dynamic>;
      }
      throw Exception('Failed to create tool: ${res.body}');
    } on SocketException catch (e) {
      throw Exception('Network error: ${e.message}');
    } on http.ClientException catch (e) {
      throw Exception('Connection error: ${e.message}');
    } on TimeoutException {
      throw Exception('Request timeout: Tool creation took too long');
    } catch (e) {
      if (e.toString().contains('Connection closed')) {
        throw Exception('Connection closed by server. Please try again.');
      }
      rethrow;
    }
  }

  /// Get all tools for a project
  Future<List<dynamic>> getProjectTools({required String projectId, String? status}) async {
    final queryParams = {'projectId': projectId};
    if (status != null) queryParams['status'] = status;
    
    final uri = Uri.parse('$_base/engineer/tools')
        .replace(queryParameters: queryParams);
    try {
      final res = await _client.get(uri).timeout(const Duration(seconds: 30));
      if (res.statusCode == 200) {
        final body = jsonDecode(res.body) as Map<String, dynamic>;
        return body['tools'] as List<dynamic>;
      }
      throw Exception('Failed to fetch tools: ${res.body}');
    } on SocketException catch (e) {
      throw Exception('Network error: ${e.message}');
    } on http.ClientException catch (e) {
      throw Exception('Connection error: ${e.message}');
    } on TimeoutException {
      throw Exception('Request timeout: Fetching tools took too long');
    } catch (e) {
      if (e.toString().contains('Connection closed')) {
        throw Exception('Connection closed by server. Please try again.');
      }
      rethrow;
    }
  }

  /// Delete a tool
  Future<void> deleteTool(String toolId) async {
    final uri = Uri.parse('$_base/engineer/tools/$toolId');
    try {
      final res = await _client.delete(uri).timeout(const Duration(seconds: 30));
      if (res.statusCode != 200) {
        throw Exception('Failed to delete tool: ${res.body}');
      }
    } on SocketException catch (e) {
      throw Exception('Network error: ${e.message}');
    } on http.ClientException catch (e) {
      throw Exception('Connection error: ${e.message}');
    } on TimeoutException {
      throw Exception('Request timeout: Tool deletion took too long');
    } catch (e) {
      if (e.toString().contains('Connection closed')) {
        throw Exception('Connection closed by server. Please try again.');
      }
      rethrow;
    }
  }

  /// Generate QR code for a tool
  Future<Map<String, dynamic>> generateToolQR(String toolId) async {
    final uri = Uri.parse('$_base/engineer/tools/$toolId/qr');
    try {
      print('[AuthService] Generating QR for tool: $toolId');
      final res = await _client
          .post(
            uri,
            headers: {'Content-Type': 'application/json'},
          )
          .timeout(const Duration(seconds: 30));
      
      print('[AuthService] Response status: ${res.statusCode}');
      print('[AuthService] Response body length: ${res.body.length}');
      
      if (res.statusCode == 201 || res.statusCode == 200) {
        if (res.body.isEmpty) {
          throw Exception('Empty response from server');
        }
        
        try {
          final body = jsonDecode(res.body) as Map<String, dynamic>;
          print('[AuthService] Parsed QR data keys: ${body.keys}');
          
          // Validate response structure
          if (!body.containsKey('qr')) {
            throw Exception('Invalid response: missing "qr" field');
          }
          
          return body;
        } catch (e) {
          print('[AuthService] JSON decode error: $e');
          print('[AuthService] Response body: ${res.body.substring(0, res.body.length > 200 ? 200 : res.body.length)}');
          throw Exception('Failed to parse QR response: $e');
        }
      }
      
      // Try to extract error message
      String errorMsg = 'Failed to generate QR';
      try {
        final errorBody = jsonDecode(res.body) as Map<String, dynamic>;
        errorMsg = errorBody['error'] ?? errorBody['message'] ?? res.body;
      } catch (_) {
        errorMsg = res.body.isNotEmpty ? res.body : 'Unknown error';
      }
      
      throw Exception(errorMsg);
    } on SocketException catch (e) {
      print('[AuthService] SocketException: ${e.message}');
      throw Exception('Network error: ${e.message}');
    } on http.ClientException catch (e) {
      print('[AuthService] ClientException: ${e.message}');
      throw Exception('Connection error: ${e.message}');
    } on TimeoutException {
      print('[AuthService] TimeoutException');
      throw Exception('Request timeout: QR generation took too long');
    } catch (e) {
      print('[AuthService] Generic error: $e');
      if (e.toString().contains('Connection closed')) {
        throw Exception('Connection closed by server. Please try again.');
      }
      rethrow;
    }
  }

  /// Get transaction history for a tool
  Future<List<dynamic>> getToolHistory(String toolId) async {
    final uri = Uri.parse('$_base/engineer/tools/$toolId/history');
    try {
      final res = await _client.get(uri).timeout(const Duration(seconds: 30));
      if (res.statusCode == 200) {
        final body = jsonDecode(res.body) as Map<String, dynamic>;
        return body['transactions'] as List<dynamic>;
      }
      throw Exception('Failed to fetch tool history: ${res.body}');
    } on SocketException catch (e) {
      throw Exception('Network error: ${e.message}');
    } on http.ClientException catch (e) {
      throw Exception('Connection error: ${e.message}');
    } on TimeoutException {
      throw Exception('Request timeout: Fetching history took too long');
    } catch (e) {
      if (e.toString().contains('Connection closed')) {
        throw Exception('Connection closed by server. Please try again.');
      }
      rethrow;
    }
  }

  // ==================== LABOUR TOOLS MANAGEMENT ====================
  
  /// Scan QR code to issue/return tool
  Future<Map<String, dynamic>> scanToolQR(String qrToken) async {
    final uri = Uri.parse('$_base/labour/tools/scan');
    try {
      final res = await _client
          .post(
            uri,
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({'qrToken': qrToken}),
          )
          .timeout(const Duration(seconds: 30));
      
      if (res.statusCode == 200 || res.statusCode == 201) {
        return jsonDecode(res.body) as Map<String, dynamic>;
      }
      
      String errorMsg = 'Failed to scan QR code';
      try {
        final errorBody = jsonDecode(res.body) as Map<String, dynamic>;
        errorMsg = errorBody['error'] ?? errorBody['message'] ?? res.body;
      } catch (_) {
        errorMsg = res.body.isNotEmpty ? res.body : 'Unknown error';
      }
      
      throw Exception(errorMsg);
    } on SocketException catch (e) {
      throw Exception('Network error: ${e.message}');
    } on http.ClientException catch (e) {
      throw Exception('Connection error: ${e.message}');
    } on TimeoutException {
      throw Exception('Request timeout: QR scan took too long');
    } catch (e) {
      if (e.toString().contains('Connection closed')) {
        throw Exception('Connection closed by server. Please try again.');
      }
      rethrow;
    }
  }

  /// Get my issued tools
  Future<List<dynamic>> getMyIssuedTools() async {
    final uri = Uri.parse('$_base/labour/tools/my-tools');
    try {
      final res = await _client.get(uri).timeout(const Duration(seconds: 30));
      if (res.statusCode == 200) {
        final body = jsonDecode(res.body) as Map<String, dynamic>;
        return body['tools'] as List<dynamic>;
      }
      throw Exception('Failed to fetch issued tools: ${res.body}');
    } on SocketException catch (e) {
      throw Exception('Network error: ${e.message}');
    } on http.ClientException catch (e) {
      throw Exception('Connection error: ${e.message}');
    } on TimeoutException {
      throw Exception('Request timeout: Fetching tools took too long');
    } catch (e) {
      if (e.toString().contains('Connection closed')) {
        throw Exception('Connection closed by server. Please try again.');
      }
      rethrow;
    }
  }

  /// Get my tool history
  Future<List<dynamic>> getMyToolHistory({String? projectId, String? status}) async {
    final queryParams = <String, String>{};
    if (projectId != null) queryParams['projectId'] = projectId;
    if (status != null) queryParams['status'] = status;
    
    final uri = Uri.parse('$_base/labour/tools/my-history')
        .replace(queryParameters: queryParams);
    try {
      final res = await _client.get(uri).timeout(const Duration(seconds: 30));
      if (res.statusCode == 200) {
        final body = jsonDecode(res.body) as Map<String, dynamic>;
        return body['transactions'] as List<dynamic>;
      }
      throw Exception('Failed to fetch tool history: ${res.body}');
    } on SocketException catch (e) {
      throw Exception('Network error: ${e.message}');
    } on http.ClientException catch (e) {
      throw Exception('Connection error: ${e.message}');
    } on TimeoutException {
      throw Exception('Request timeout: Fetching history took too long');
    } catch (e) {
      if (e.toString().contains('Connection closed')) {
        throw Exception('Connection closed by server. Please try again.');
      }
      rethrow;
    }
  }
}
