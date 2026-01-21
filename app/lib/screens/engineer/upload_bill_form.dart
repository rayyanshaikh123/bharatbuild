import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:easy_localization/easy_localization.dart';
import '../../providers/material_provider.dart';
import '../../providers/current_project_provider.dart';
import '../../theme/app_colors.dart';

class UploadBillForm extends ConsumerStatefulWidget {
  final Map<String, dynamic>? request;
  const UploadBillForm({super.key, this.request});

  @override
  ConsumerState<UploadBillForm> createState() => _UploadBillFormState();
}

class _UploadBillFormState extends ConsumerState<UploadBillForm> {
  final _formKey = GlobalKey<FormState>();
  final _vendorController = TextEditingController();
  final _billNumberController = TextEditingController();
  final _amountController = TextEditingController();
  final _gstController = TextEditingController(text: '18');
  String? _selectedCategory;

  @override
  void initState() {
    super.initState();
    if (widget.request != null) {
      _selectedCategory = widget.request!['category'];
    }
  }

  @override
  void dispose() {
    _vendorController.dispose();
    _billNumberController.dispose();
    _amountController.dispose();
    _gstController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    
    final selectedProject = ref.read(currentProjectProvider);
    if (selectedProject == null) return;

    final amount = double.tryParse(_amountController.text) ?? 0.0;
    final gstPercent = double.tryParse(_gstController.text) ?? 0.0;
    final gstAmount = amount * (gstPercent / 100);
    final totalAmount = amount + gstAmount;

    final data = {
      'material_request_id': widget.request?['id'],
      'project_id': selectedProject['id'] ?? selectedProject['project_id'],
      'vendor_name': _vendorController.text.trim(),
      'bill_number': _billNumberController.text.trim(),
      'bill_amount': amount,
      'gst_percentage': gstPercent,
      'gst_amount': gstAmount,
      'total_amount': totalAmount,
      'category': _selectedCategory ?? 'Others',
    };

    try {
      final success = await ref.read(uploadMaterialBillProvider(data).future);
      if (!mounted) return;
      
      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('bill_uploaded'.tr())),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('bill_queued_offline'.tr()), backgroundColor: Colors.orange),
        );
      }
      Navigator.pop(context);
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('error'.tr() + ': $e')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('upload_bill'.tr())),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Form(
          key: _formKey,
          child: Column(
            children: [
              if (widget.request != null)
                Container(
                  padding: const EdgeInsets.all(12),
                  margin: const EdgeInsets.only(bottom: 24),
                  decoration: BoxDecoration(
                    color: Colors.blue.withOpacity(0.05),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: Colors.blue.withOpacity(0.1)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.info_outline, color: Colors.blue),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          'Linking to: ${widget.request!['title']}',
                          style: const TextStyle(fontWeight: FontWeight.bold),
                        ),
                      ),
                    ],
                  ),
                ),
              TextFormField(
                controller: _vendorController,
                decoration: InputDecoration(labelText: 'vendor'.tr()),
                validator: (v) => (v ?? '').isEmpty ? 'required'.tr() : null,
              ),
              const SizedBox(height: 20),
              TextFormField(
                controller: _billNumberController,
                decoration: InputDecoration(labelText: 'bill_number'.tr()),
                validator: (v) => (v ?? '').isEmpty ? 'required'.tr() : null,
              ),
              const SizedBox(height: 20),
              Row(
                children: [
                  Expanded(
                    flex: 2,
                    child: TextFormField(
                      controller: _amountController,
                      decoration: InputDecoration(labelText: 'bill_amount'.tr(), prefixText: '₹'),
                      keyboardType: TextInputType.number,
                      validator: (v) => (v ?? '').isEmpty ? 'required'.tr() : null,
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: TextFormField(
                      controller: _gstController,
                      decoration: const InputDecoration(labelText: 'GST %'),
                      keyboardType: TextInputType.number,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 40),
              ElevatedButton(
                onPressed: _submit,
                style: ElevatedButton.styleFrom(minimumSize: const Size(double.infinity, 56)),
                child: Text('upload_bill'.tr()),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
