import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:image_picker/image_picker.dart';
import 'package:intl/intl.dart';
import '../../theme/app_colors.dart';
import '../../providers/current_project_provider.dart';

// TODO: Create a provider for GRN submission in a future phase
// For now, valid submission is mocked.

class GRNScreen extends ConsumerStatefulWidget {
  const GRNScreen({super.key});

  @override
  ConsumerState<GRNScreen> createState() => _GRNScreenState();
}

class _GRNScreenState extends ConsumerState<GRNScreen> {
  final _formKey = GlobalKey<FormState>();
  final _vendorController = TextEditingController();
  final _amountController = TextEditingController();
  final _remarksController = TextEditingController();
  
  DateTime _grnDate = DateTime.now();
  XFile? _image;
  final _picker = ImagePicker();
  bool _isLoading = false;

  @override
  void dispose() {
    _vendorController.dispose();
    _amountController.dispose();
    _remarksController.dispose();
    super.dispose();
  }

  Future<void> _pickImage(ImageSource source) async {
    final picked = await _picker.pickImage(source: source, imageQuality: 50);
    if (picked != null) setState(() => _image = picked);
  }

  Future<void> _selectDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _grnDate,
      firstDate: DateTime(2020),
      lastDate: DateTime.now(),
    );
    if (picked != null) setState(() => _grnDate = picked);
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_image == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('please_attach_bill_photo'.tr())),
      );
      return;
    }

    setState(() => _isLoading = true);
    
    // Simulate network delay
    await Future.delayed(const Duration(seconds: 2));

    if (!mounted) return;

    // TODO: Connect to backend.
    // For now, just show success and pop.
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('grn_created_successfully'.tr()), backgroundColor: Colors.green),
    );
    Navigator.pop(context);
    
    setState(() => _isLoading = false);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final project = ref.watch(currentProjectProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text('grn_entry'.tr()), // Ensure this key exists or fallback
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (project != null)
                Padding(
                  padding: const EdgeInsets.only(bottom: 20),
                  child: Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppColors.primary.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(
                      children: [
                        Icon(Icons.business, color: AppColors.primary),
                        const SizedBox(width: 12),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Project', style: theme.textTheme.bodySmall),
                            Text(project['name'], style: const TextStyle(fontWeight: FontWeight.bold)),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),

              // Date Picker
              InkWell(
                onTap: _selectDate,
                child: InputDecorator(
                  decoration: InputDecoration(
                    labelText: 'date'.tr(),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                    prefixIcon: const Icon(Icons.calendar_today),
                  ),
                  child: Text(DateFormat('dd MMM yyyy').format(_grnDate)),
                ),
              ),
              const SizedBox(height: 20),

              // Image Upload Section
              Container(
                width: double.infinity,
                height: 200,
                decoration: BoxDecoration(
                  color: Colors.grey[100],
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.grey[300]!),
                ),
                child: _image != null
                    ? Stack(
                        fit: StackFit.expand,
                        children: [
                          ClipRRect(
                            borderRadius: BorderRadius.circular(12),
                            child: Image.file(
                              File(_image!.path),
                              fit: BoxFit.cover,
                            ),
                          ),
                          Positioned(
                            top: 8,
                            right: 8,
                            child: CircleAvatar(
                              backgroundColor: Colors.black54,
                              child: IconButton(
                                icon: const Icon(Icons.close, color: Colors.white),
                                onPressed: () => setState(() => _image = null),
                              ),
                            ),
                          ),
                        ],
                      )
                    : Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.camera_alt, size: 48, color: Colors.grey[400]),
                          const SizedBox(height: 12),
                          Text('upload_hardcopy_bill'.tr(), style: TextStyle(color: Colors.grey[600])),
                          const SizedBox(height: 16),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              TextButton.icon(
                                onPressed: () => _pickImage(ImageSource.camera),
                                icon: const Icon(Icons.camera),
                                label: Text('camera'.tr()),
                              ),
                              TextButton.icon(
                                onPressed: () => _pickImage(ImageSource.gallery),
                                icon: const Icon(Icons.photo_library),
                                label: Text('gallery'.tr()),
                              ),
                            ],
                          ),
                        ],
                      ),
              ),
              const SizedBox(height: 24),

              TextFormField(
                controller: _vendorController,
                decoration: InputDecoration(
                  labelText: 'vendor_name'.tr(),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  prefixIcon: const Icon(Icons.store),
                ),
                validator: (v) => (v ?? '').isEmpty ? 'required'.tr() : null,
              ),
              const SizedBox(height: 16),

              TextFormField(
                controller: _amountController,
                keyboardType: TextInputType.number,
                decoration: InputDecoration(
                  labelText: 'total_amount'.tr(),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  prefixIcon: const Icon(Icons.currency_rupee),
                ),
                validator: (v) => (v ?? '').isEmpty ? 'required'.tr() : null,
              ),
              const SizedBox(height: 16),

              TextFormField(
                controller: _remarksController,
                maxLines: 3,
                decoration: InputDecoration(
                  labelText: 'remarks'.tr(),
                  hintText: 'materials_received_condition'.tr(),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
              const SizedBox(height: 32),

              SizedBox(
                width: double.infinity,
                height: 56,
                child: ElevatedButton(
                  onPressed: _isLoading ? null : _submit,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    elevation: 2,
                  ),
                  child: _isLoading
                      ? const SizedBox(
                          height: 24,
                          width: 24,
                          child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                        )
                      : Text('create_grn'.tr(), style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
