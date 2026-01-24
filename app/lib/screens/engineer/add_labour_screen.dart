import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:image_picker/image_picker.dart';
import 'package:google_mlkit_face_detection/google_mlkit_face_detection.dart';
import '../../theme/app_colors.dart';
import '../../services/face_verification_service.dart';
import 'manual_attendance_screen.dart'; // To access the provider & model

class AddLabourScreen extends ConsumerStatefulWidget {
  const AddLabourScreen({super.key});

  @override
  ConsumerState<AddLabourScreen> createState() => _AddLabourScreenState();
}

class _AddLabourScreenState extends ConsumerState<AddLabourScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _categoryController = TextEditingController();
  final _faceService = FaceVerificationService();
  final _picker = ImagePicker();
  
  XFile? _photo;
  Face? _detectedFace;
  bool _isProcessing = false;
  String? _detectionError;

  @override
  void dispose() {
    _nameController.dispose();
    _categoryController.dispose();
    _faceService.dispose();
    super.dispose();
  }

  Future<void> _takePhoto() async {
    final picked = await _picker.pickImage(
      source: ImageSource.camera, 
      maxWidth: 1000, // Higher res for better detection
      imageQuality: 90,
      preferredCameraDevice: CameraDevice.front, // Manual attendance usually front/selfie? Or rear?
      // Actually site engineer takes photos, so Rear is better default, but MLKit handles both.
    );
    
    if (picked != null) {
      setState(() {
         _photo = picked;
         _isProcessing = true;
         _detectedFace = null;
         _detectionError = null;
      });

      // Detect face immediately
      try {
        final imageFile = File(picked.path);
        // Ensure file exists
        if (!await imageFile.exists()) throw "Image capture failed";

        final faces = await _faceService.detectFaces(imageFile);
        if (!mounted) return;
        
        if (faces.isEmpty) {
          setState(() => _detectionError = "No face detected. Try moving closer or better lighting.");
        } else if (faces.length > 1) {
          setState(() => _detectionError = "Multiple faces detected. Only one person allowed.");
        } else {
          setState(() {
             _detectedFace = faces.first;
             _detectionError = null;
          });
        }
      } catch (e) {
         setState(() => _detectionError = "Error detecting face: $e");
      } finally {
        if (mounted) setState(() => _isProcessing = false);
      }
    }
  }

  void _submit() {
    if (!_formKey.currentState!.validate()) return;
    if (_photo == null) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('take_photo_required'.tr())));
      return;
    }
    if (_detectedFace == null) {
       ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Valid face required for check-in.')));
       return;
    }

    final newRecord = AttendanceRecord(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      name: _nameController.text.trim(),
      category: _categoryController.text.trim(),
      status: 'CHECKED_IN',
      checkInPhoto: File(_photo!.path),
      checkInFace: _detectedFace,
      checkInTime: DateTime.now(),
    );

    final currentList = ref.read(attendanceRecordsProvider);
    ref.read(attendanceRecordsProvider.notifier).state = [newRecord, ...currentList];

    Navigator.pop(context);
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('labour_checked_in'.tr())));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('check_in_labour'.tr())),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                'New Labour Check-in',
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 32),

              // Large Photo Section
              GestureDetector(
                onTap: _takePhoto,
                child: Container(
                  height: 300,
                  decoration: BoxDecoration(
                    color: Colors.grey[200],
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                      color: _detectedFace != null ? Colors.green : (_detectionError != null ? Colors.red : Colors.grey),
                      width: 2,
                    ),
                    image: _photo != null 
                        ? DecorationImage(image: FileImage(File(_photo!.path)), fit: BoxFit.cover) 
                        : null,
                  ),
                  child: _photo == null
                      ? Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.camera_enhance, size: 64, color: Colors.grey[400]),
                            const SizedBox(height: 16),
                            const Text('Tap to Capture Photo', style: TextStyle(color: Colors.grey, fontSize: 16)),
                          ],
                        )
                      : null,
                ),
              ),
              const SizedBox(height: 16),
              
              // Status Indicator
              if (_isProcessing)
                const Center(child: CircularProgressIndicator())
              else if (_detectionError != null)
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(color: Colors.red[50], borderRadius: BorderRadius.circular(8)),
                  child: Row(
                    children: [
                      const Icon(Icons.error_outline, color: Colors.red),
                      const SizedBox(width: 12),
                      Expanded(child: Text(_detectionError!, style: const TextStyle(color: Colors.red))),
                    ],
                  ),
                )
              else if (_detectedFace != null)
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(color: Colors.green[50], borderRadius: BorderRadius.circular(8)),
                  child: Row(
                    children: [
                      const Icon(Icons.check_circle, color: Colors.green),
                      const SizedBox(width: 12),
                      const Expanded(child: Text("Face Detected Successfully", style: TextStyle(color: Colors.green, fontWeight: FontWeight.bold))),
                    ],
                  ),
                ),
                
              const SizedBox(height: 32),

              TextFormField(
                controller: _nameController,
                decoration: InputDecoration(
                  labelText: 'name'.tr(),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  prefixIcon: const Icon(Icons.person),
                ),
                validator: (v) => (v ?? '').isEmpty ? 'required'.tr() : null,
              ),
              const SizedBox(height: 24),
              
              TextFormField(
                controller: _categoryController,
                decoration: InputDecoration(
                  labelText: 'category_skill'.tr(),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  prefixIcon: const Icon(Icons.work),
                  hintText: 'e.g. Mason, Helper, Carpenter',
                ),
                validator: (v) => (v ?? '').isEmpty ? 'required'.tr() : null,
              ),
              const SizedBox(height: 40),
              
              SizedBox(
                height: 56,
                child: ElevatedButton.icon(
                  onPressed: (_detectedFace == null || _isProcessing) ? null : _submit,
                  icon: const Icon(Icons.check),
                  label: const Text('CONFIRM CHECK-IN', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
