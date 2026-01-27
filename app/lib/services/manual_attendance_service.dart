import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';
import '../config.dart';
import 'persistent_client.dart';
import 'face_verification_service.dart';

class ManualAttendanceService {
  static final String _base = API_BASE_URL;
  final http.Client _client = PersistentClient();
  final FaceVerificationService _faceService = FaceVerificationService();

  String _extractErrorMessage(http.Response response) {
    try {
      final body = jsonDecode(response.body);
      if (body is Map && body.containsKey('error')) {
        return body['error'] as String;
      }
      if (body is Map && body.containsKey('message')) {
        return body['message'] as String;
      }
    } catch (_) {}
    return response.body.isNotEmpty ? response.body : 'Unknown error occurred';
  }

  Never _throwError(String operation, http.Response response) {
    final errorMsg = _extractErrorMessage(response);
    throw Exception('$operation: $errorMsg');
  }

  /// Check-in a local labour with face verification
  Future<Map<String, dynamic>> checkIn({
    required String projectId,
    required String name,
    required String category,
    required File faceImage,
    required FaceFeatures faceFeatures,
  }) async {
    try {
      final uri = Uri.parse('$_base/engineer/attendance/manual/check-in');
      
      // Create multipart request
      final request = http.MultipartRequest('POST', uri);
      
      // Add face image
      request.files.add(
        await http.MultipartFile.fromPath(
          'faceImage',
          faceImage.path,
          filename: 'checkin_face.jpg',
          contentType: MediaType('image', 'jpeg'),
        ),
      );

      // Add form fields
      request.fields['projectId'] = projectId;
      request.fields['name'] = name;
      request.fields['category'] = category;
      request.fields['faceFeatures'] = faceFeatures.toJsonString();

      // Send request
      final streamedResponse = await _client.send(request);
      final response = await http.Response.fromStream(streamedResponse);

      if (response.statusCode != 200 && response.statusCode != 201) {
        _throwError('Check-in failed', response);
      }

      return jsonDecode(response.body) as Map<String, dynamic>;
    } catch (e) {
      throw Exception('Check-in error: $e');
    }
  }

  /// Checkout a labour with face verification
  Future<Map<String, dynamic>> checkout({
    required String attendanceId,
    required File faceImage,
    required FaceFeatures faceFeatures,
  }) async {
    try {
      final uri = Uri.parse('$_base/engineer/attendance/manual/checkout');
      
      // Create multipart request
      final request = http.MultipartRequest('POST', uri);
      
      // Add face image
      request.files.add(
        await http.MultipartFile.fromPath(
          'faceImage',
          faceImage.path,
          filename: 'checkout_face.jpg',
          contentType: MediaType('image', 'jpeg'),
        ),
      );

      // Add form fields
      request.fields['attendanceId'] = attendanceId;
      request.fields['faceFeatures'] = faceFeatures.toJsonString();

      // Send request
      final streamedResponse = await _client.send(request);
      final response = await http.Response.fromStream(streamedResponse);

      if (response.statusCode != 200 && response.statusCode != 201) {
        _throwError('Checkout failed', response);
      }

      return jsonDecode(response.body) as Map<String, dynamic>;
    } catch (e) {
      throw Exception('Checkout error: $e');
    }
  }

  /// Get manual attendance records for a project and date
  Future<List<Map<String, dynamic>>> getManualAttendance({
    required String projectId,
    String? date,
  }) async {
    try {
      final uri = Uri.parse('$_base/engineer/attendance/manual/list')
          .replace(queryParameters: {
        'projectId': projectId,
        if (date != null) 'date': date,
      });

      final response = await _client.get(uri);

      if (response.statusCode != 200) {
        _throwError('Failed to fetch attendance', response);
      }

      final body = jsonDecode(response.body) as Map<String, dynamic>;
      return List<Map<String, dynamic>>.from(body['attendance'] ?? []);
    } catch (e) {
      throw Exception('Failed to fetch attendance: $e');
    }
  }

  void dispose() {
    _faceService.dispose();
  }
}
