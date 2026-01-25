import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:image_picker/image_picker.dart';
import 'package:intl/intl.dart';
import 'package:geolocator/geolocator.dart';
import '../../theme/app_colors.dart';
import '../../providers/current_project_provider.dart';
import '../../services/auth_service.dart';
import '../../providers/auth_providers.dart';

// Provider for fetching sent purchase orders
final sentPurchaseOrdersProvider = FutureProvider.family<List<dynamic>, String>((ref, projectId) async {
  final auth = ref.read(authServiceProvider);
  return await auth.getSentPurchaseOrders(projectId);
});

class GRNScreen extends ConsumerStatefulWidget {
  const GRNScreen({super.key});

  @override
  ConsumerState<GRNScreen> createState() => _GRNScreenState();
}

class _GRNScreenState extends ConsumerState<GRNScreen> {
  final _formKey = GlobalKey<FormState>();
  final _remarksController = TextEditingController();
  
  String? _selectedPOId;
  Map<String, dynamic>? _selectedPO;
  List<Map<String, dynamic>> _receivedItems = [];
  XFile? _billImage;
  XFile? _proofImage;
  final _picker = ImagePicker();
  bool _isLoading = false;

  @override
  void dispose() {
    _remarksController.dispose();
    super.dispose();
  }

  Future<void> _pickImage(ImageSource source, {required bool isBill}) async {
    final picked = await _picker.pickImage(source: source, imageQuality: 80, maxWidth: 1200);
    if (picked != null) {
      setState(() {
        if (isBill) {
          _billImage = picked;
        } else {
          _proofImage = picked;
        }
      });
    }
  }

  void _selectPurchaseOrder(Map<String, dynamic> po) {
    setState(() {
      _selectedPOId = po['id'] as String;
      _selectedPO = po;
      
      // Initialize received items from PO items
      final poItems = po['items'] as List<dynamic>? ?? [];
      _receivedItems = poItems.map((item) {
        return {
          'material_name': item['material_name'] ?? item['name'] ?? '',
          'quantity_ordered': item['quantity'] ?? 0.0,
          'quantity_received': 0.0,
          'unit': item['unit'] ?? 'units',
        };
      }).toList();
    });
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    
    if (_selectedPOId == null || _selectedPO == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select a purchase order')),
      );
      return;
    }

    if (_billImage == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('please_attach_bill_photo'.tr())),
      );
      return;
    }

    if (_proofImage == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please attach proof image')),
      );
      return;
    }

    if (_receivedItems.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter received quantities for at least one item')),
      );
      return;
    }

    // Validate that at least one item has received quantity > 0
    final hasReceivedItems = _receivedItems.any((item) => 
      (item['quantity_received'] as num?) != null && 
      (item['quantity_received'] as num) > 0
    );

    if (!hasReceivedItems) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter received quantities for items')),
      );
      return;
    }

    setState(() => _isLoading = true);

    try {
      final project = ref.read(currentProjectProvider);
      final projectId = project?['project_id'] ?? project?['id'];
      
      if (projectId == null) {
        throw Exception('No project selected');
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

      final auth = ref.read(authServiceProvider);
      
      // Prepare received items for backend
      final receivedItemsForBackend = _receivedItems
          .where((item) => (item['quantity_received'] as num?) != null && 
                          (item['quantity_received'] as num) > 0)
          .map((item) => {
                'material_name': item['material_name'],
                'quantity_ordered': item['quantity_ordered'],
                'quantity_received': item['quantity_received'],
                'unit': item['unit'],
              })
          .toList();

      await auth.createGRN(
        projectId: projectId.toString(),
        purchaseOrderId: _selectedPOId!,
        materialRequestId: _selectedPO!['material_request_id'] as String,
        receivedItems: receivedItemsForBackend,
        remarks: _remarksController.text.trim().isEmpty ? null : _remarksController.text.trim(),
        billImage: File(_billImage!.path),
        proofImage: File(_proofImage!.path),
        latitude: position?.latitude,
        longitude: position?.longitude,
      );

      if (!mounted) return;

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('grn_created_successfully'.tr()), backgroundColor: Colors.green),
      );
      Navigator.pop(context);
    } catch (e) {
      if (!mounted) return;
      
      String errorMessage = 'Error: ${e.toString()}';
      if (e.toString().contains('OUTSIDE_PROJECT_GEOFENCE')) {
        errorMessage = 'You must be inside the project site to create GRN entries';
      }
      
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(errorMessage),
          backgroundColor: Colors.red,
        ),
      );
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final project = ref.watch(currentProjectProvider);
    final projectId = project?['project_id'] ?? project?['id'];

    if (projectId == null) {
      return Scaffold(
        appBar: AppBar(title: Text('grn_entry'.tr())),
        body: const Center(child: Text('Please select a project first')),
      );
    }

    final purchaseOrdersAsync = ref.watch(sentPurchaseOrdersProvider(projectId.toString()));

    return Scaffold(
      appBar: AppBar(
        title: Text('grn_entry'.tr()),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Project Info
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
                            Text(project['name'] ?? 'Unknown', style: const TextStyle(fontWeight: FontWeight.bold)),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),

              // Purchase Order Selection
              Text(
                'Select Purchase Order',
                style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 12),
              purchaseOrdersAsync.when(
                data: (pos) {
                  if (pos.isEmpty) {
                    return Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.orange[50],
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: Colors.orange[200]!),
                      ),
                      child: Row(
                        children: [
                          Icon(Icons.info_outline, color: Colors.orange[700]),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              'No sent purchase orders available for GRN creation',
                              style: TextStyle(color: Colors.orange[900]),
                            ),
                          ),
                        ],
                      ),
                    );
                  }

                  return DropdownButtonFormField<String>(
                    value: _selectedPOId,
                    decoration: InputDecoration(
                      labelText: 'Purchase Order',
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      prefixIcon: const Icon(Icons.shopping_cart),
                    ),
                    items: pos.map((po) {
                      final poNumber = po['po_number'] ?? 'N/A';
                      final vendorName = po['vendor_name'] ?? 'Unknown Vendor';
                      final totalAmount = po['total_amount'] ?? 0;
                      return DropdownMenuItem<String>(
                        value: po['id'] as String,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text('$poNumber - $vendorName', style: const TextStyle(fontWeight: FontWeight.bold)),
                            Text('₹${totalAmount.toStringAsFixed(2)}', style: theme.textTheme.bodySmall),
                          ],
                        ),
                      );
                    }).toList(),
                    onChanged: (value) {
                      if (value != null) {
                        final po = pos.firstWhere((p) => p['id'] == value);
                        _selectPurchaseOrder(po);
                      }
                    },
                    validator: (value) => value == null ? 'Please select a purchase order' : null,
                  );
                },
                loading: () => const LinearProgressIndicator(),
                error: (error, stack) => Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.red[50],
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text('Error loading purchase orders: ${error.toString()}'),
                ),
              ),
              const SizedBox(height: 24),

              // Received Items Section
              if (_selectedPO != null) ...[
                Text(
                  'Received Items',
                  style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 12),
                ..._receivedItems.asMap().entries.map((entry) {
                  final index = entry.key;
                  final item = entry.value;
                  return Card(
                    margin: const EdgeInsets.only(bottom: 12),
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            item['material_name'] as String,
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                          ),
                          const SizedBox(height: 8),
                          Row(
                            children: [
                              Expanded(
                                child: Text(
                                  'Ordered: ${item['quantity_ordered']} ${item['unit']}',
                                  style: theme.textTheme.bodySmall,
                                ),
                              ),
                              Expanded(
                                child: TextFormField(
                                  initialValue: item['quantity_received']?.toString() ?? '0',
                                  keyboardType: TextInputType.number,
                                  decoration: InputDecoration(
                                    labelText: 'Received',
                                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                                    suffixText: item['unit'] as String,
                                  ),
                                  onChanged: (value) {
                                    setState(() {
                                      _receivedItems[index]['quantity_received'] = 
                                        double.tryParse(value) ?? 0.0;
                                    });
                                  },
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  );
                }),
                const SizedBox(height: 24),
              ],

              // Bill Image Upload
              Text(
                'Bill Image',
                style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 12),
              _buildImageUpload(
                image: _billImage,
                label: 'Upload Bill Photo',
                onCamera: () => _pickImage(ImageSource.camera, isBill: true),
                onGallery: () => _pickImage(ImageSource.gallery, isBill: true),
                onRemove: () => setState(() => _billImage = null),
              ),
              const SizedBox(height: 24),

              // Proof Image Upload
              Text(
                'Proof Image',
                style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 12),
              _buildImageUpload(
                image: _proofImage,
                label: 'Upload Proof Photo',
                onCamera: () => _pickImage(ImageSource.camera, isBill: false),
                onGallery: () => _pickImage(ImageSource.gallery, isBill: false),
                onRemove: () => setState(() => _proofImage = null),
              ),
              const SizedBox(height: 24),

              // Remarks
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

              // Submit Button
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

  Widget _buildImageUpload({
    required XFile? image,
    required String label,
    required VoidCallback onCamera,
    required VoidCallback onGallery,
    required VoidCallback onRemove,
  }) {
    return Container(
      width: double.infinity,
      height: 200,
      decoration: BoxDecoration(
        color: Colors.grey[100],
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey[300]!),
      ),
      child: image != null
          ? Stack(
              fit: StackFit.expand,
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: Image.file(
                    File(image.path),
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
                      onPressed: onRemove,
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
                Text(label, style: TextStyle(color: Colors.grey[600])),
                const SizedBox(height: 16),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    TextButton.icon(
                      onPressed: onCamera,
                      icon: const Icon(Icons.camera),
                      label: Text('camera'.tr()),
                    ),
                    TextButton.icon(
                      onPressed: onGallery,
                      icon: const Icon(Icons.photo_library),
                      label: Text('gallery'.tr()),
                    ),
                  ],
                ),
              ],
            ),
    );
  }
}
