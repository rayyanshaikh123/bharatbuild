import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:easy_localization/easy_localization.dart';
import 'dart:convert';
import 'package:image_picker/image_picker.dart';
import '../../theme/app_colors.dart';
import '../../providers/dpr_provider.dart';
import '../../services/voice_nlp_service.dart';

class DPRFormScreen extends ConsumerStatefulWidget {
  const DPRFormScreen({super.key});

  @override
  ConsumerState<DPRFormScreen> createState() => _DPRFormScreenState();
}

class _DPRFormScreenState extends ConsumerState<DPRFormScreen> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _descriptionController = TextEditingController();
  
  Map<String, dynamic>? _selectedPlanItem; // To be removed or used for simple dropdown
  final List<Map<String, dynamic>> _reportedItems = [];
  DateTime _reportDate = DateTime.now();
  XFile? _image;
  bool _isLoading = false;
  bool _isListening = false;
  final _picker = ImagePicker();
  final _voiceService = VoiceNLPService();

  @override
  void initState() {
    super.initState();
    _voiceService.init();
  }

  @override
  void dispose() {
    _titleController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  Future<void> _selectDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _reportDate,
      firstDate: DateTime.now().subtract(const Duration(days: 7)),
      lastDate: DateTime.now(),
    );
    if (picked != null) setState(() => _reportDate = picked);
  }
  Future<void> _pickImage(ImageSource source) async {
    final pickedFile = await _picker.pickImage(
      source: source,
      imageQuality: 50,
      maxWidth: 800,
    );
    if (pickedFile != null) setState(() => _image = pickedFile);
  }

  Future<void> _submitDPR() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);

    try {
      String? base64Image;
      String? mimeType;
      
      if (_image != null) {
        final bytes = await _image!.readAsBytes();
        base64Image = base64Encode(bytes);
        mimeType = 'image/jpeg';
      }

      final payload = {
        'title': _titleController.text.trim(),
        'description': _descriptionController.text.trim(),
        'plan_id': _reportedItems.isNotEmpty ? _reportedItems.first['plan_id'] : null,
        'plan_item_id': _reportedItems.isNotEmpty ? _reportedItems.first['plan_item_id'] : null,
        'report_date': DateFormat('yyyy-MM-dd').format(_reportDate),
        'report_image': base64Image,
        'report_image_mime': mimeType,
        'items': _reportedItems,
      };

      final success = await ref.read(createDPRProvider(payload).future);

      if (!mounted) return;
      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('dpr_submitted_successfully'.tr()), backgroundColor: Colors.green),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('dpr_queued_offline'.tr()), backgroundColor: Colors.orange),
        );
      }
      Navigator.pop(context);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('error'.tr() + ': $e'), backgroundColor: Colors.red),
      );
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _handleVoiceInput(List<dynamic> availablePlanItems) async {
    if (_isListening) {
      await _voiceService.stopListening();
      setState(() => _isListening = false);
    } else {
      setState(() => _isListening = true);
      await _voiceService.startListening((text) {
        setState(() => _isListening = false);
        _processVoiceText(text, availablePlanItems);
      });
    }
  }

  void _processVoiceText(String text, List<dynamic> availablePlanItems) {
    // Build known items map from available plan items
    final Map<String, String> knownItemsMap = {};
    for (var item in availablePlanItems) {
      final taskName = (item['task_name'] as String).toLowerCase();
      knownItemsMap[taskName] = item['id'];
    }

    final result = _voiceService.parseSpeech(text, knownItemsMap);
    final parsedItems = result['items'] as Map<String, double>;
    final customItems = result['custom'] as List<Map<String, dynamic>>;

    setState(() {
      // Add matched items
      parsedItems.forEach((planItemId, qty) {
        final planItem = availablePlanItems.firstWhere((it) => it['id'] == planItemId);
        // Check if already in _reportedItems
        final existingIdx = _reportedItems.indexWhere((ri) => ri['plan_item_id'] == planItemId);
        if (existingIdx != -1) {
          _reportedItems[existingIdx]['quantity_done'] = qty;
        } else {
          _reportedItems.add({
            'plan_item_id': planItem['id'],
            'plan_id': planItem['plan_id'],
            'task_name': planItem['task_name'],
            'quantity_done': qty,
            'remarks': '',
          });
        }
      });

      // Handle custom/unmatched items by adding them as remarks to a "Custom/Other" note or listing them
      if (customItems.isNotEmpty) {
        String customRemarks = customItems.map((c) => "${c['quantity']} ${c['item']}").join(", ");
        _descriptionController.text = "${_descriptionController.text} [Voice: $customRemarks]".trim();
      }
    });

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Processed: $text')),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final planItemsAsync = ref.watch(projectPlanItemsProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text('submit_dpr'.tr()),
        elevation: 0,
        actions: [
          planItemsAsync.maybeWhen(
            data: (items) => IconButton(
              icon: Icon(_isListening ? Icons.mic : Icons.mic_none, 
                         color: _isListening ? Colors.red : null),
              onPressed: () => _handleVoiceInput(items),
              tooltip: 'Voice Input',
            ),
            orElse: () => const SizedBox.shrink(),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'report_details'.tr(),
                style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 16),
              
              // Date Picker
              InkWell(
                onTap: _selectDate,
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: theme.colorScheme.surface,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: theme.colorScheme.outline.withOpacity(0.2)),
                  ),
                  child: Row(
                    children: [
                      Icon(Icons.calendar_today, color: AppColors.primary),
                      const SizedBox(width: 12),
                      Text(DateFormat('dd MMM yyyy').format(_reportDate)),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 20),

              // Title
              TextFormField(
                controller: _titleController,
                decoration: InputDecoration(
                  labelText: 'title'.tr(),
                  hintText: 'e.g. Concrete Pouring Completed',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                ),
                validator: (value) => value == null || value.isEmpty ? 'required'.tr() : null,
              ),
              const SizedBox(height: 20),

              // Reported Plan Items Section
              planItemsAsync.maybeWhen(
                data: (items) => Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'work_progress'.tr(),
                          style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.bold),
                        ),
                        if (items.isNotEmpty)
                          TextButton.icon(
                            onPressed: () => _showAddPlanItemSheet(items),
                            icon: const Icon(Icons.add_circle_outline, size: 20),
                            label: Text('add_task'.tr()),
                          ),
                      ],
                    ),
                    if (_reportedItems.isEmpty)
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: Colors.grey.withOpacity(0.05),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: Colors.grey.withOpacity(0.2)),
                        ),
                        child: Center(
                          child: Text(
                            'no_tasks_selected_yet'.tr(),
                            style: theme.textTheme.bodySmall?.copyWith(fontStyle: FontStyle.italic),
                          ),
                        ),
                      )
                    else
                      ..._reportedItems.asMap().entries.map((entry) {
                        final idx = entry.key;
                        final item = entry.value;
                        return _buildReportedItemCard(idx, item);
                      }),
                    const SizedBox(height: 24),
                  ],
                ),
                orElse: () => const SizedBox.shrink(),
              ),

              // Description
              TextFormField(
                controller: _descriptionController,
                maxLines: 5,
                decoration: InputDecoration(
                  labelText: 'description'.tr(),
                  hintText: 'describe_work_done'.tr(),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                ),
                validator: (value) => value == null || value.isEmpty ? 'required'.tr() : null,
              ),
              const SizedBox(height: 24),

              // Image Selection
              Text(
                'site_photos'.tr(),
                style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 12),
              if (_image != null)
                Stack(
                  children: [
                    Container(
                      height: 200,
                      width: double.infinity,
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(12),
                        image: DecorationImage(
                          image: FileImage(File(_image!.path)),
                          fit: BoxFit.cover,
                        ),
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
              else
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        onPressed: () => _pickImage(ImageSource.camera),
                        icon: const Icon(Icons.camera_alt_outlined),
                        label: Text('camera'.tr()),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: OutlinedButton.icon(
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        onPressed: () => _pickImage(ImageSource.gallery),
                        icon: const Icon(Icons.photo_library_outlined),
                        label: Text('gallery'.tr()),
                      ),
                    ),
                  ],
                ),
              const SizedBox(height: 40),

              SizedBox(
                width: double.infinity,
                height: 56,
                child: ElevatedButton(
                  onPressed: _isLoading ? null : _submitDPR,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                  child: _isLoading 
                    ? const CircularProgressIndicator(color: Colors.white)
                    : Text('submit_report'.tr(), style: const TextStyle(fontWeight: FontWeight.bold)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildReportedItemCard(int index, Map<String, dynamic> item) {
    final theme = Theme.of(context);
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    item['task_name'] ?? 'Task',
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.remove_circle_outline, color: Colors.red),
                  onPressed: () => setState(() => _reportedItems.removeAt(index)),
                ),
              ],
            ),
            const Divider(),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  flex: 2,
                  child: TextFormField(
                    initialValue: item['quantity_done']?.toString(),
                    keyboardType: TextInputType.number,
                    decoration: InputDecoration(
                      labelText: 'quantity_done'.tr(),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    ),
                    onChanged: (val) => _reportedItems[index]['quantity_done'] = double.tryParse(val) ?? 0,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  flex: 3,
                  child: TextFormField(
                    initialValue: item['remarks'],
                    decoration: InputDecoration(
                      labelText: 'remarks'.tr(),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    ),
                    onChanged: (val) => _reportedItems[index]['remarks'] = val,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  void _showAddPlanItemSheet(List<dynamic> items) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (context) => ListView.builder(
        padding: const EdgeInsets.all(20),
        itemCount: items.length,
        itemBuilder: (context, index) {
          final item = items[index];
          final isAlreadyAdded = _reportedItems.any((ri) => ri['plan_item_id'] == item['id']);

          return ListTile(
            title: Text(item['task_name'] ?? 'Task'),
            subtitle: Text('${item['planned_quantity'] ?? 0} planned'),
            trailing: isAlreadyAdded
                ? const Icon(Icons.check_circle, color: Colors.green)
                : const Icon(Icons.add_circle_outline),
            enabled: !isAlreadyAdded,
            onTap: () {
              setState(() {
                _reportedItems.add({
                  'plan_item_id': item['id'],
                  'plan_id': item['plan_id'],
                  'task_name': item['task_name'],
                  'quantity_done': 0.0,
                  'remarks': '',
                });
              });
              Navigator.pop(context);
            },
          );
        },
      ),
    );
  }
}
