import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:image_picker/image_picker.dart';
import 'package:google_mlkit_face_detection/google_mlkit_face_detection.dart';
import '../../theme/app_colors.dart';
import '../../providers/current_project_provider.dart';
import '../../services/face_verification_service.dart';
import '../../services/manual_attendance_service.dart';
import 'add_labour_screen.dart';

// Model for Attendance Record from Backend
class AttendanceRecord {
  String id;
  String? labourId; // Can be null for manual attendance
  String name;
  String category;
  String status; // 'PENDING', 'APPROVED', 'REJECTED'
  String? faceVerificationStatus; // 'PENDING', 'VERIFIED', 'FAILED'
  DateTime checkInTime;
  DateTime? checkOutTime;
  
  AttendanceRecord({
    required this.id,
    this.labourId,
    required this.name,
    required this.category,
    required this.status,
    this.faceVerificationStatus,
    required this.checkInTime,
    this.checkOutTime,
  });

  factory AttendanceRecord.fromJson(Map<String, dynamic> json) {
    // Handle null values safely
    final idValue = json['id'];
    final labourIdValue = json['labour_id'];
    final nameValue = json['name'];
    final categoryValue = json['category'] ?? json['skill'] ?? json['skill_type'];
    final statusValue = json['status'];
    final checkInTimeValue = json['check_in_time'];
    final checkOutTimeValue = json['check_out_time'];
    
    return AttendanceRecord(
      id: idValue?.toString() ?? '',
      labourId: labourIdValue?.toString(),
      name: (nameValue as String?) ?? 'Unknown',
      category: (categoryValue as String?) ?? 'Unknown',
      status: (statusValue as String?) ?? 'PENDING',
      faceVerificationStatus: json['face_verification_status'] as String?,
      checkInTime: checkInTimeValue != null 
          ? DateTime.parse(checkInTimeValue.toString())
          : DateTime.now(),
      checkOutTime: checkOutTimeValue != null
          ? DateTime.parse(checkOutTimeValue.toString())
          : null,
    );
  }
}

// Provider for manual attendance records
final manualAttendanceProvider = FutureProvider.family<List<AttendanceRecord>, String>((ref, projectId) async {
  final service = ManualAttendanceService();
  try {
    final data = await service.getManualAttendance(projectId: projectId);
    return data.map((json) => AttendanceRecord.fromJson(json)).toList();
  } finally {
    service.dispose();
  }
});

class ManualAttendanceScreen extends ConsumerStatefulWidget {
  const ManualAttendanceScreen({super.key});

  @override
  ConsumerState<ManualAttendanceScreen> createState() => _ManualAttendanceScreenState();
}

class _ManualAttendanceScreenState extends ConsumerState<ManualAttendanceScreen> {
  final _faceService = FaceVerificationService();
  final _attendanceService = ManualAttendanceService();
  final _picker = ImagePicker();
  bool _isVerifying = false;
  bool _isLoading = false;

  @override
  void dispose() {
    _faceService.dispose();
    _attendanceService.dispose();
    super.dispose();
  }

  Future<void> _refreshAttendance() async {
    final project = ref.read(currentProjectProvider);
    final projectId = project?['project_id'] ?? project?['id'];
    if (projectId != null) {
      ref.invalidate(manualAttendanceProvider(projectId.toString()));
    }
  }

  Future<void> _performCheckout(AttendanceRecord record) async {
    // 1. Capture Checkout Photo
    final picked = await _picker.pickImage(
      source: ImageSource.camera, 
      maxWidth: 1000,
      imageQuality: 90,
    );
    if (picked == null) return;
    final checkoutImage = File(picked.path);

    setState(() => _isVerifying = true);
    
    try {
      // 2. Detect Face in Checkout Photo
      final faces = await _faceService.detectFaces(checkoutImage);
      
      if (faces.isEmpty) {
        _showError('No face detected. Please try again.');
        return;
      } else if (faces.length > 1) {
        _showError('Multiple faces detected. Please ensure only one person is in frame.');
        return;
      }

      final checkoutFace = faces.first;
      
      // 3. Extract face features (serializable)
      final checkoutFeatures = _faceService.extractFaceFeatures(checkoutFace);

      // 4. Send to backend for verification
      final result = await _attendanceService.checkout(
        attendanceId: record.id,
        faceImage: checkoutImage,
        faceFeatures: checkoutFeatures,
      );

      final verification = result['verification'] as Map<String, dynamic>;
      final verified = verification['verified'] as bool;

      if (verified) {
        _showSuccess('Verification Successful!\nWages Initiated for ${record.name}.');
        // Refresh the list
        await _refreshAttendance();
      } else {
        final message = verification['message'] as String? ?? 'Face verification failed';
        _showError(message);
      }

    } catch (e) {
      _showError('Error during verification: ${e.toString()}');
    } finally {
      if (mounted) setState(() => _isVerifying = false);
    }
  }

  void _showError(String msg) {
    if(!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(msg), backgroundColor: Colors.red),
    );
  }

  void _showSuccess(String msg) {
    if(!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(msg), backgroundColor: Colors.green),
    );
  }

  @override
  Widget build(BuildContext context) {
    final project = ref.watch(currentProjectProvider);
    final projectId = project?['project_id'] ?? project?['id'];

    if (projectId == null) {
      return Scaffold(
        appBar: AppBar(title: Text('manual_attendance'.tr())),
        body: const Center(child: Text('Please select a project first')),
      );
    }

    final attendanceAsync = ref.watch(manualAttendanceProvider(projectId.toString()));

    return Scaffold(
      appBar: AppBar(
        title: Text('manual_attendance'.tr()),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _isLoading ? null : () async {
              setState(() => _isLoading = true);
              await _refreshAttendance();
              if (mounted) setState(() => _isLoading = false);
            },
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () async {
          final result = await Navigator.push(
            context,
            MaterialPageRoute(builder: (context) => const AddLabourScreen()),
          );
          // Refresh after check-in
          if (result == true) {
            await _refreshAttendance();
          }
        },
        label: Text('check_in_labour'.tr()),
        icon: const Icon(Icons.person_add),
        backgroundColor: AppColors.primary,
      ),
      body: Stack(
        children: [
          attendanceAsync.when(
            data: (records) {
              if (records.isEmpty) {
                return Center(child: Text('no_labours_checked_in'.tr()));
              }
              
              return RefreshIndicator(
                onRefresh: _refreshAttendance,
                child: ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: records.length,
                  itemBuilder: (context, index) {
                    final record = records[index];
                    final canCheckout = record.status == 'PENDING';
                    
                    return Card(
                      margin: const EdgeInsets.only(bottom: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      child: Padding(
                        padding: const EdgeInsets.all(12.0),
                        child: Column(
                          children: [
                            ListTile(
                              contentPadding: EdgeInsets.zero,
                              leading: CircleAvatar(
                                radius: 25,
                                backgroundColor: Colors.grey[300],
                                child: const Icon(Icons.person, size: 30),
                              ),
                              title: Text(record.name, style: const TextStyle(fontWeight: FontWeight.bold)),
                              subtitle: Text(
                                '${record.category}\nIn: ${DateFormat('hh:mm a').format(record.checkInTime)}'
                                '${record.checkOutTime != null ? '\nOut: ${DateFormat('hh:mm a').format(record.checkOutTime!)}' : ''}',
                              ),
                              isThreeLine: true,
                              trailing: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                    decoration: BoxDecoration(
                                      color: record.status == 'APPROVED' 
                                          ? Colors.green.withOpacity(0.1) 
                                          : Colors.orange.withOpacity(0.1),
                                      borderRadius: BorderRadius.circular(20),
                                    ),
                                    child: Text(
                                      record.status == 'APPROVED' ? 'APPROVED' : 'PENDING',
                                      style: TextStyle(
                                        fontWeight: FontWeight.bold,
                                        color: record.status == 'APPROVED' ? Colors.green : Colors.orange,
                                        fontSize: 12,
                                      ),
                                    ),
                                  ),
                                  if (record.faceVerificationStatus != null) ...[
                                    const SizedBox(height: 4),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                      decoration: BoxDecoration(
                                        color: record.faceVerificationStatus == 'VERIFIED'
                                            ? Colors.green.withOpacity(0.1)
                                            : record.faceVerificationStatus == 'FAILED'
                                                ? Colors.red.withOpacity(0.1)
                                                : Colors.grey.withOpacity(0.1),
                                        borderRadius: BorderRadius.circular(12),
                                      ),
                                      child: Text(
                                        record.faceVerificationStatus == 'VERIFIED' ? '✓ Verified'
                                            : record.faceVerificationStatus == 'FAILED' ? '✗ Failed'
                                            : 'Pending',
                                        style: TextStyle(
                                          fontSize: 10,
                                          color: record.faceVerificationStatus == 'VERIFIED'
                                              ? Colors.green
                                              : record.faceVerificationStatus == 'FAILED'
                                                  ? Colors.red
                                                  : Colors.grey,
                                        ),
                                      ),
                                    ),
                                  ],
                                ],
                              ),
                            ),
                            if (canCheckout)
                              Padding(
                                padding: const EdgeInsets.only(top: 8),
                                child: SizedBox(
                                  width: double.infinity,
                                  child: ElevatedButton.icon(
                                    onPressed: _isVerifying ? null : () => _performCheckout(record),
                                    icon: const Icon(Icons.face_retouching_natural),
                                    label: const Text('Checkout & Verify Face'),
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: AppColors.primary,
                                      foregroundColor: Colors.white,
                                    ),
                                  ),
                                ),
                              ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
              );
            },
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (error, stack) => Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text('Error: ${error.toString()}'),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: _refreshAttendance,
                    child: const Text('Retry'),
                  ),
                ],
              ),
            ),
          ),
          if (_isVerifying)
             Container(
               color: Colors.black54,
               child: const Center(
                 child: Column(
                   mainAxisSize: MainAxisSize.min,
                   children: [
                     CircularProgressIndicator(color: Colors.white),
                     SizedBox(height: 16),
                     Text('Verifying Face...', style: TextStyle(color: Colors.white, fontSize: 18)),
                   ],
                 ),
               ),
             ),
        ],
      ),
    );
  }
}
