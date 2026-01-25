import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:image_picker/image_picker.dart';
import 'package:google_mlkit_face_detection/google_mlkit_face_detection.dart';
import '../../theme/app_colors.dart';
import '../../services/face_verification_service.dart';
import '../../services/manual_attendance_service.dart';
import '../../providers/current_project_provider.dart';

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
  final _attendanceService = ManualAttendanceService();
  final _picker = ImagePicker();
  
  XFile? _photo;
  Face? _detectedFace;
  FaceFeatures? _faceFeatures;
  bool _isProcessing = false;
  bool _isSubmitting = false;
  String? _detectionError;

  @override
  void dispose() {
    _nameController.dispose();
    _categoryController.dispose();
    _faceService.dispose();
    _attendanceService.dispose();
    super.dispose();
  }

  Future<void> _takePhoto() async {
    final picked = await _picker.pickImage(
      source: ImageSource.camera, 
      maxWidth: 1000,
      imageQuality: 90,
    );
    
    if (picked != null) {
      setState(() {
         _photo = picked;
         _isProcessing = true;
         _detectedFace = null;
         _faceFeatures = null;
         _detectionError = null;
      });

      // Detect face immediately
      try {
        final imageFile = File(picked.path);
        if (!await imageFile.exists()) throw "Image capture failed";

        final faces = await _faceService.detectFaces(imageFile);
        if (!mounted) return;
        
        if (faces.isEmpty) {
          setState(() => _detectionError = "No face detected. Try moving closer or better lighting.");
        } else if (faces.length > 1) {
          setState(() => _detectionError = "Multiple faces detected. Only one person allowed.");
        } else {
          final face = faces.first;
          final features = _faceService.extractFaceFeatures(face);
          setState(() {
             _detectedFace = face;
             _faceFeatures = features;
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

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    
    if (_photo == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('take_photo_required'.tr())),
      );
      return;
    }
    
    if (_detectedFace == null || _faceFeatures == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Valid face required for check-in.')),
      );
      return;
    }

    final project = ref.read(currentProjectProvider);
    final projectId = project?['project_id'] ?? project?['id'];
    
    if (projectId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select a project first.')),
      );
      return;
    }

    setState(() => _isSubmitting = true);

    try {
      await _attendanceService.checkIn(
        projectId: projectId.toString(),
        name: _nameController.text.trim(),
        category: _categoryController.text.trim(),
        faceImage: File(_photo!.path),
        faceFeatures: _faceFeatures!,
      );

      if (!mounted) return;
      
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('labour_checked_in'.tr()), backgroundColor: Colors.green),
      );
      
      Navigator.pop(context, true); // Return true to indicate success
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Check-in failed: ${e.toString()}'),
          backgroundColor: Colors.red,
        ),
      );
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
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
                'Local Labour Check-in',
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              Text(
                'For labours who do not use the app',
                style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.grey),
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
                      color: _detectedFace != null 
                          ? Colors.green 
                          : (_detectionError != null ? Colors.red : Colors.grey),
                      width: 2,
                    ),
                    image: _photo != null 
                        ? DecorationImage(
                            image: FileImage(File(_photo!.path)), 
                            fit: BoxFit.cover,
                          ) 
                        : null,
                  ),
                  child: _photo == null
                      ? Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.camera_enhance, size: 64, color: Colors.grey[400]),
                            const SizedBox(height: 16),
                            const Text(
                              'Tap to Capture Photo',
                              style: TextStyle(color: Colors.grey, fontSize: 16),
                            ),
                          ],
                        )
                      : null,
                ),
              ),
              const SizedBox(height: 16),
              
              // Status Indicator
              if (_isProcessing && _photo != null)
                const Center(child: CircularProgressIndicator())
              else if (_detectionError != null)
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.red[50],
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.error_outline, color: Colors.red),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          _detectionError!,
                          style: const TextStyle(color: Colors.red),
                        ),
                      ),
                    ],
                  ),
                )
              else if (_detectedFace != null && _faceFeatures != null)
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.green[50],
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.check_circle, color: Colors.green),
                      const SizedBox(width: 12),
                      const Expanded(
                        child: Text(
                          "Face Detected Successfully",
                          style: TextStyle(color: Colors.green, fontWeight: FontWeight.bold),
                        ),
                      ),
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
                  onPressed: (_detectedFace == null || 
                              _faceFeatures == null || 
                              _isProcessing || 
                              _isSubmitting) 
                      ? null 
                      : _submit,
                  icon: _isSubmitting
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : const Icon(Icons.check),
                  label: Text(
                    _isSubmitting ? 'CHECKING IN...' : 'CONFIRM CHECK-IN',
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                  ),
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
