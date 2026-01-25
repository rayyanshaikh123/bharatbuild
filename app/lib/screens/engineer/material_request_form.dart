import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:geolocator/geolocator.dart';
import '../../providers/material_provider.dart';
import '../../providers/current_project_provider.dart';
import '../../theme/app_colors.dart';

class MaterialRequestForm extends ConsumerStatefulWidget {
  const MaterialRequestForm({super.key});

  @override
  ConsumerState<MaterialRequestForm> createState() => _MaterialRequestFormState();
}

class _MaterialRequestFormState extends ConsumerState<MaterialRequestForm> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _quantityController = TextEditingController();
  final _descriptionController = TextEditingController();
  String? _selectedCategory;

  final List<String> _categories = [
    'Cement',
    'Steel',
    'Bricks',
    'Sand',
    'Aggregate',
    'Electrical',
    'Plumbing',
    'Paint',
    'Others'
  ];

  @override
  void dispose() {
    _titleController.dispose();
    _quantityController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_selectedCategory == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('please_select_category'.tr())),
      );
      return;
    }

    final selectedProject = ref.read(currentProjectProvider);
    if (selectedProject == null) return;

    // Parse quantity to number
    final quantityText = _quantityController.text.trim();
    final quantity = double.tryParse(quantityText);
    
    if (quantity == null || quantity <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('please_enter_valid_quantity'.tr())),
      );
      return;
    }

    // Get current location for geofence validation
    Position? position;
    try {
      position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
        timeLimit: const Duration(seconds: 10),
      );
    } catch (e) {
      // Location fetch failed, but continue without coordinates (backend will skip validation)
      print('Failed to get location: $e');
    }

    final data = {
      'project_id': selectedProject['project_id'] ?? selectedProject['id'],
      'title': _titleController.text.trim(),
      'category': _selectedCategory,
      'quantity': quantity,
      'description': _descriptionController.text.trim(),
      if (position != null) 'latitude': position.latitude,
      if (position != null) 'longitude': position.longitude,
    };

    try {
      final success = await ref.read(createMaterialRequestProvider(data).future);
      if (!mounted) return;
      
      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('request_submitted'.tr()),
            backgroundColor: Colors.green,
          ),
        );
        Navigator.pop(context);
      } else {
        // Stored offline for later sync
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('material_queued_offline'.tr()),
            backgroundColor: Colors.orange,
            duration: const Duration(seconds: 3),
          ),
        );
        Navigator.pop(context);
      }
    } catch (e) {
      if (!mounted) return;
      
      // Extract error message from backend response
      String errorMessage = 'error'.tr();
      if (e.toString().contains('Failed to create material request:')) {
        // Parse backend error
        try {
          final match = RegExp(r'\{.*\}').firstMatch(e.toString());
          if (match != null) {
            final errorJson = jsonDecode(match.group(0)!);
            final error = errorJson['error'] ?? '';
            if (error == 'OUTSIDE_PROJECT_GEOFENCE') {
              errorMessage = 'You must be inside the project site to create material requests';
            } else {
              errorMessage = error;
            }
          }
        } catch (_) {
          errorMessage = e.toString().replaceAll('Exception: Failed to create material request: ', '');
        }
      } else {
        errorMessage = e.toString().replaceAll('Exception: ', '');
      }
      
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(errorMessage),
          backgroundColor: Colors.red,
          duration: const Duration(seconds: 4),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(title: Text('request_material'.tr())),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              TextFormField(
                controller: _titleController,
                decoration: InputDecoration(
                  labelText: 'title'.tr(),
                  hintText: 'e.g. 500 Bags of Cement',
                ),
                validator: (v) => (v ?? '').isEmpty ? 'required'.tr() : null,
              ),
              const SizedBox(height: 20),
              DropdownButtonFormField<String>(
                value: _selectedCategory,
                items: _categories.map((c) => DropdownMenuItem(value: c, child: Text(c))).toList(),
                onChanged: (v) => setState(() => _selectedCategory = v),
                decoration: InputDecoration(labelText: 'category'.tr()),
              ),
              const SizedBox(height: 20),
              TextFormField(
                controller: _quantityController,
                decoration: InputDecoration(
                  labelText: 'quantity'.tr(),
                  hintText: 'e.g. 500',
                ),
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                validator: (v) {
                  if ((v ?? '').isEmpty) return 'required'.tr();
                  final num = double.tryParse(v!);
                  if (num == null || num <= 0) {
                    return 'Please enter a valid positive number';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 20),
              TextFormField(
                controller: _descriptionController,
                decoration: InputDecoration(
                  labelText: 'description'.tr(),
                ),
                maxLines: 3,
              ),
              const SizedBox(height: 40),
              ElevatedButton(
                onPressed: _submit,
                style: ElevatedButton.styleFrom(
                  minimumSize: const Size(double.infinity, 56),
                ),
                child: Text('submit_request'.tr()),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
