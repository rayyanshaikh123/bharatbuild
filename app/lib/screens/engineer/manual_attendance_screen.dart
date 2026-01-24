import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:image_picker/image_picker.dart';
import 'package:google_mlkit_face_detection/google_mlkit_face_detection.dart';
import '../../theme/app_colors.dart';
import '../../providers/current_project_provider.dart';
import '../../services/face_verification_service.dart';
import 'add_labour_screen.dart';

// Model for Attendance Record
class AttendanceRecord {
  String id;
  String name;
  String category;
  String status; // 'CHECKED_IN', 'PAID'
  File? checkInPhoto;
  Face? checkInFace; // Storing Face object (in memory) for verification
  DateTime checkInTime;
  DateTime? checkOutTime;
  
  AttendanceRecord({
    required this.id,
    required this.name,
    required this.category,
    required this.status,
    required this.checkInPhoto,
    this.checkInFace,
    required this.checkInTime,
    this.checkOutTime,
  });
}

// In-memory provider for demo (would be backend in production)
final attendanceRecordsProvider = StateProvider<List<AttendanceRecord>>((ref) => []);

class ManualAttendanceScreen extends ConsumerStatefulWidget {
  const ManualAttendanceScreen({super.key});

  @override
  ConsumerState<ManualAttendanceScreen> createState() => _ManualAttendanceScreenState();
}

class _ManualAttendanceScreenState extends ConsumerState<ManualAttendanceScreen> {
  final _faceService = FaceVerificationService();
  final _picker = ImagePicker();
  bool _isVerifying = false;

  @override
  void dispose() {
    _faceService.dispose();
    super.dispose();
  }

  Future<void> _performCheckout(AttendanceRecord record) async {
    // 1. Capture Checkout Photo
    final picked = await _picker.pickImage(source: ImageSource.camera, maxWidth: 800);
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

      // 3. Verify against Check-in Face
      if (record.checkInFace == null) {
        _showError('Error: No check-in face data found for comparison.');
        return;
      }

      final isMatch = _faceService.compareFaces(record.checkInFace!, checkoutFace);

      if (isMatch) {
         // Success!
         _updateStatus(record, 'PAID');
         _showSuccess('Verification Successful!\nWages Initiated for ${record.name}.');
      } else {
         _showError('Face Verification Failed!\nThis does not match the check-in photo.');
      }

    } catch (e) {
      _showError('Error during verification: $e');
    } finally {
      if (mounted) setState(() => _isVerifying = false);
    }
  }

  void _updateStatus(AttendanceRecord record, String newStatus) {
    record.status = newStatus;
    if (newStatus == 'PAID') record.checkOutTime = DateTime.now();
    ref.read(attendanceRecordsProvider.notifier).state = [...ref.read(attendanceRecordsProvider)];
  }

  void _showError(String msg) {
    if(!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg), backgroundColor: Colors.red));
  }

  void _showSuccess(String msg) {
    if(!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg), backgroundColor: Colors.green));
  }

  @override
  Widget build(BuildContext context) {
    final records = ref.watch(attendanceRecordsProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text('manual_attendance'.tr()),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showCheckInSheet(context),
        label: Text('check_in_labour'.tr()),
        icon: const Icon(Icons.person_add),
        backgroundColor: AppColors.primary,
      ),
      body: Stack(
        children: [
          records.isEmpty
              ? Center(child: Text('no_labours_checked_in'.tr()))
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: records.length,
                  itemBuilder: (context, index) {
                    final record = records[index];
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
                                backgroundImage: FileImage(record.checkInPhoto!),
                              ),
                              title: Text(record.name, style: const TextStyle(fontWeight: FontWeight.bold)),
                              subtitle: Text('${record.category}\nIn: ${DateFormat('hh:mm a').format(record.checkInTime)}'),
                              isThreeLine: true,
                              trailing: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                decoration: BoxDecoration(
                                  color: record.status == 'PAID' ? Colors.green.withOpacity(0.1) : Colors.orange.withOpacity(0.1),
                                  borderRadius: BorderRadius.circular(20),
                                ),
                                child: Text(
                                  record.status == 'PAID' ? 'PAID' : 'WORKING',
                                  style: TextStyle(
                                    fontWeight: FontWeight.bold,
                                    color: record.status == 'PAID' ? Colors.green : Colors.orange,
                                    fontSize: 12,
                                  ),
                                ),
                              ),
                            ),
                            if (record.status == 'CHECKED_IN')
                              Padding(
                                padding: const EdgeInsets.only(top: 8),
                                child: SizedBox(
                                  width: double.infinity,
                                  child: ElevatedButton.icon(
                                    onPressed: () => _performCheckout(record),
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

  void _showCheckInSheet(BuildContext context) {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (context) => const AddLabourScreen()),
    );
  }
}

