import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/scheduler.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:qr_flutter/qr_flutter.dart';
import '../../providers/tools_provider.dart';
import '../../providers/current_project_provider.dart';
import '../../providers/auth_providers.dart';
import '../../theme/app_colors.dart';

// Helper function to safely convert dynamic value to int (handles strings from PostgreSQL COUNT)
int _toInt(dynamic value) {
  if (value == null) return 0;
  if (value is int) return value;
  if (value is num) return value.toInt();
  if (value is String) {
    return int.tryParse(value) ?? 0;
  }
  return 0;
}

class ToolsManagementScreen extends ConsumerStatefulWidget {
  const ToolsManagementScreen({super.key});

  @override
  ConsumerState<ToolsManagementScreen> createState() => _ToolsManagementScreenState();
}

class _ToolsManagementScreenState extends ConsumerState<ToolsManagementScreen> {
  String? _statusFilter;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final toolsAsync = ref.watch(projectToolsProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text('tools_management'.tr()),
        actions: [
          PopupMenuButton<String>(
            icon: const Icon(Icons.filter_list),
            onSelected: (value) {
              setState(() {
                _statusFilter = value == 'ALL' ? null : value;
              });
            },
            itemBuilder: (context) => [
              PopupMenuItem(value: 'ALL', child: Text('all_tools'.tr())),
              const PopupMenuDivider(),
              PopupMenuItem(value: 'AVAILABLE', child: Text('available'.tr())),
              PopupMenuItem(value: 'ISSUED', child: Text('issued'.tr())),
              PopupMenuItem(value: 'DAMAGED', child: Text('damaged'.tr())),
              PopupMenuItem(value: 'LOST', child: Text('lost'.tr())),
            ],
          ),
        ],
      ),
      body: toolsAsync.when(
        data: (tools) {
          // Filter tools by status if filter is applied
          final filteredTools = _statusFilter == null
              ? tools
              : tools.where((t) => t['status'] == _statusFilter).toList();

          if (filteredTools.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.construction, size: 64, color: Colors.grey[400]),
                  const SizedBox(height: 16),
                  Text(
                    _statusFilter == null ? 'no_tools'.tr() : 'no_tools_with_status'.tr(),
                    style: theme.textTheme.titleMedium?.copyWith(color: Colors.grey[600]),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'add_tools_to_get_started'.tr(),
                    style: theme.textTheme.bodySmall?.copyWith(color: Colors.grey[500]),
                  ),
                ],
              ),
            );
          }

          return RefreshIndicator(
            onRefresh: () async => ref.refresh(projectToolsProvider.future),
            child: ListView.builder(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(16),
              itemCount: filteredTools.length,
              itemBuilder: (context, index) {
                final tool = filteredTools[index];
                return _buildToolCard(tool, theme);
              },
            ),
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, _) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.error_outline, size: 64, color: Colors.red[300]),
              const SizedBox(height: 16),
              Text('error'.tr(), style: theme.textTheme.titleMedium),
              const SizedBox(height: 8),
              Text(err.toString(), textAlign: TextAlign.center),
            ],
          ),
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showCreateToolDialog(context),
        icon: const Icon(Icons.add),
        label: Text('create_tool'.tr()),
      ),
    );
  }

  Widget _buildToolCard(Map<String, dynamic> tool, ThemeData theme) {
    final status = tool['status'] as String;
    final statusColor = _getStatusColor(status);
    final activeTransactions = _toInt(tool['active_transactions']);
    final totalTransactions = _toInt(tool['total_transactions']);

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: () => _showToolDetailsSheet(tool),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  // Tool icon
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: statusColor.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Icon(Icons.construction, color: statusColor, size: 24),
                  ),
                  const SizedBox(width: 12),
                  // Tool info
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          tool['name'] ?? 'Unnamed Tool',
                          style: theme.textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          tool['tool_code'] ?? '',
                          style: theme.textTheme.bodyMedium?.copyWith(
                            color: Colors.grey[600],
                            fontFamily: 'monospace',
                          ),
                        ),
                      ],
                    ),
                  ),
                  // Status badge
                  _buildStatusBadge(status, statusColor),
                ],
              ),
              if (tool['description'] != null && tool['description'].toString().isNotEmpty) ...[
                const SizedBox(height: 12),
                Text(
                  tool['description'],
                  style: theme.textTheme.bodySmall?.copyWith(color: Colors.grey[700]),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
              const SizedBox(height: 12),
              // Transaction info
              Row(
                children: [
                  Icon(Icons.swap_horiz, size: 16, color: Colors.grey[600]),
                  const SizedBox(width: 4),
                  Text(
                    '$totalTransactions transactions',
                    style: theme.textTheme.bodySmall?.copyWith(color: Colors.grey[600]),
                  ),
                  if (activeTransactions > 0) ...[
                    const SizedBox(width: 12),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: Colors.orange.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        '$activeTransactions active',
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: Colors.orange,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ],
                  const Spacer(),
                  Text(
                    'by_${tool['created_by_name'] ?? 'Unknown'}',
                    style: theme.textTheme.bodySmall?.copyWith(color: Colors.grey[500]),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStatusBadge(String status, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Text(
        status.toLowerCase().tr(),
        style: TextStyle(
          color: color,
          fontSize: 12,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case 'AVAILABLE':
        return Colors.green;
      case 'ISSUED':
        return Colors.orange;
      case 'DAMAGED':
        return Colors.red;
      case 'LOST':
        return Colors.purple;
      default:
        return Colors.grey;
    }
  }

  void _showToolDetailsSheet(Map<String, dynamic> tool) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (sheetContext) => _ToolDetailsSheet(
        tool: tool,
        parentContext: context, // Pass parent context
      ),
    );
  }

  void _showCreateToolDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => const _CreateToolDialog(),
    );
  }
}

// ==================== CREATE TOOL DIALOG ====================

class _CreateToolDialog extends ConsumerStatefulWidget {
  const _CreateToolDialog();

  @override
  ConsumerState<_CreateToolDialog> createState() => _CreateToolDialogState();
}

class _CreateToolDialogState extends ConsumerState<_CreateToolDialog> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _codeController = TextEditingController();
  final _descriptionController = TextEditingController();
  bool _isLoading = false;

  @override
  void dispose() {
    _nameController.dispose();
    _codeController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    final project = ref.read(currentProjectProvider);
    if (project == null) return;

    setState(() => _isLoading = true);

    final data = {
      'projectId': project['project_id'] ?? project['id'],
      'name': _nameController.text.trim(),
      'toolCode': _codeController.text.trim().toUpperCase(),
      'description': _descriptionController.text.trim(),
    };

    try {
      final success = await ref.read(createToolProvider(data).future);
      if (!mounted) return;

      if (success) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('tool_created'.tr()),
            backgroundColor: Colors.green,
          ),
        );
      } else {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('tool_queued_offline'.tr()),
            backgroundColor: Colors.orange,
            duration: const Duration(seconds: 3),
          ),
        );
      }
    } catch (e) {
      if (!mounted) return;
      setState(() => _isLoading = false);

      // Extract error message
      String errorMessage = 'error'.tr();
      if (e.toString().contains('Failed to create tool:')) {
        try {
          final match = RegExp(r'\{.*\}').firstMatch(e.toString());
          if (match != null) {
            final errorJson = jsonDecode(match.group(0)!);
            errorMessage = errorJson['error'] ?? errorMessage;
          }
        } catch (_) {
          errorMessage = e.toString().replaceAll('Exception: Failed to create tool: ', '');
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

    return AlertDialog(
      title: Text('create_new_tool'.tr()),
      content: Form(
        key: _formKey,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextFormField(
                controller: _nameController,
                decoration: InputDecoration(
                  labelText: 'tool_name'.tr(),
                  hintText: 'e.g. Drill Machine',
                  prefixIcon: const Icon(Icons.construction),
                ),
                validator: (v) => (v ?? '').isEmpty ? 'required'.tr() : null,
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _codeController,
                decoration: InputDecoration(
                  labelText: 'tool_code'.tr(),
                  hintText: 'e.g. DRL-001',
                  prefixIcon: const Icon(Icons.qr_code),
                ),
                textCapitalization: TextCapitalization.characters,
                validator: (v) => (v ?? '').isEmpty ? 'required'.tr() : null,
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _descriptionController,
                decoration: InputDecoration(
                  labelText: 'description'.tr(),
                  hintText: 'Optional details',
                  prefixIcon: const Icon(Icons.notes),
                ),
                maxLines: 3,
              ),
            ],
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: _isLoading ? null : () => Navigator.pop(context),
          child: Text('cancel'.tr()),
        ),
        ElevatedButton(
          onPressed: _isLoading ? null : _submit,
          child: _isLoading
              ? const SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : Text('create'.tr()),
        ),
      ],
    );
  }
}

// ==================== TOOL DETAILS SHEET ====================

class _ToolDetailsSheet extends ConsumerWidget {
  final Map<String, dynamic> tool;
  final BuildContext parentContext;

  const _ToolDetailsSheet({
    required this.tool,
    required this.parentContext,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final status = tool['status'] as String;
    final statusColor = _getStatusColor(status);

    return DraggableScrollableSheet(
      initialChildSize: 0.7,
      minChildSize: 0.5,
      maxChildSize: 0.95,
      builder: (context, scrollController) {
        return Container(
          decoration: BoxDecoration(
            color: theme.scaffoldBackgroundColor,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
          ),
          child: Column(
            children: [
              // Drag handle
              Container(
                margin: const EdgeInsets.symmetric(vertical: 12),
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey[300],
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              // Content
              Expanded(
                child: ListView(
                  controller: scrollController,
                  padding: const EdgeInsets.all(24),
                  children: [
                    // Header
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: statusColor.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Icon(Icons.construction, color: statusColor, size: 32),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                tool['name'] ?? 'Unnamed Tool',
                                style: theme.textTheme.headlineSmall?.copyWith(
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                tool['tool_code'] ?? '',
                                style: theme.textTheme.titleMedium?.copyWith(
                                  color: Colors.grey[600],
                                  fontFamily: 'monospace',
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 24),
                    // Description
                    if (tool['description'] != null && tool['description'].toString().isNotEmpty) ...[
                      _buildInfoSection(
                        context,
                        icon: Icons.notes,
                        title: 'description'.tr(),
                        content: tool['description'],
                      ),
                      const SizedBox(height: 16),
                    ],
                    // Status
                    _buildInfoSection(
                      context,
                      icon: Icons.info_outline,
                      title: 'status'.tr(),
                      child: _buildStatusBadge(status, statusColor),
                    ),
                    const SizedBox(height: 16),
                    // Transactions
                    _buildInfoSection(
                      context,
                      icon: Icons.swap_horiz,
                      title: 'transactions'.tr(),
                      content: '${_toInt(tool['total_transactions'])} total, ${_toInt(tool['active_transactions'])} active',
                    ),
                    const SizedBox(height: 16),
                    // Created by
                    _buildInfoSection(
                      context,
                      icon: Icons.person,
                      title: 'created_by'.tr(),
                      content: tool['created_by_name'] ?? 'Unknown',
                    ),
                    const SizedBox(height: 32),
                    // Action buttons
                    Row(
                      children: [
                        Expanded(
                          child: ElevatedButton.icon(
                            onPressed: () => _generateQR(context, ref, parentContext),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppColors.primary,
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(vertical: 14),
                            ),
                            icon: const Icon(Icons.qr_code_2),
                            label: Text('generate_qr'.tr()),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: OutlinedButton.icon(
                            onPressed: () => _viewHistory(context, ref),
                            style: OutlinedButton.styleFrom(
                              padding: const EdgeInsets.symmetric(vertical: 14),
                            ),
                            icon: const Icon(Icons.history),
                            label: Text('history'.tr()),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    // Delete button
                    if (_toInt(tool['active_transactions']) == 0)
                      OutlinedButton.icon(
                        onPressed: () => _deleteTool(context, ref),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: Colors.red,
                          side: const BorderSide(color: Colors.red),
                          padding: const EdgeInsets.symmetric(vertical: 14),
                        ),
                        icon: const Icon(Icons.delete_outline),
                        label: Text('delete_tool'.tr()),
                      ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildInfoSection(
    BuildContext context, {
    required IconData icon,
    required String title,
    String? content,
    Widget? child,
  }) {
    final theme = Theme.of(context);
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, color: Colors.grey[600], size: 20),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: theme.textTheme.bodySmall?.copyWith(
                  color: Colors.grey[600],
                  fontWeight: FontWeight.w500,
                ),
              ),
              const SizedBox(height: 4),
              if (content != null)
                Text(
                  content,
                  style: theme.textTheme.bodyLarge,
                )
              else if (child != null)
                child,
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildStatusBadge(String status, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Text(
        status.toLowerCase().tr(),
        style: TextStyle(
          color: color,
          fontSize: 14,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case 'AVAILABLE':
        return Colors.green;
      case 'ISSUED':
        return Colors.orange;
      case 'DAMAGED':
        return Colors.red;
      case 'LOST':
        return Colors.purple;
      default:
        return Colors.grey;
    }
  }

  void _generateQR(BuildContext context, WidgetRef ref, BuildContext parentContext) async {
    Navigator.pop(context); // Close bottom sheet

    // Show loading dialog using parent context
    showDialog(
      context: parentContext,
      barrierDismissible: false,
      useRootNavigator: true,
      builder: (dialogContext) => const PopScope(
        canPop: false,
        child: Center(child: CircularProgressIndicator()),
      ),
    );

    try {
      // Call service directly to avoid provider caching issues
      final authService = ref.read(authServiceProvider);
      debugPrint('[QR Generation] Starting QR generation for tool: ${tool['id']}');
      
      final qrData = await authService.generateToolQR(tool['id']);
      debugPrint('[QR Generation] QR data received: ${qrData.keys}');
      
      // Close loading dialog
      Navigator.of(parentContext, rootNavigator: true).pop();

      // Validate QR data structure
      if (qrData.containsKey('qr') && qrData['qr'] is Map) {
        debugPrint('[QR Generation] QR data valid, preparing to show dialog');
        debugPrint('[QR Generation] QR token: ${(qrData['qr'] as Map)['qr_token']}');
        
        // Use SchedulerBinding to ensure dialog is shown after frame is rendered
        SchedulerBinding.instance.addPostFrameCallback((_) {
          debugPrint('[QR Generation] PostFrameCallback - showing QR dialog');
          showDialog(
            context: parentContext,
            barrierDismissible: true,
            useRootNavigator: true,
            builder: (dialogContext) {
              try {
                debugPrint('[QR Generation] Building QR dialog widget');
                return _QRCodeDialog(tool: tool, qrData: qrData);
              } catch (e, stackTrace) {
                debugPrint('[QR Generation] Error building QR dialog: $e');
                debugPrint('[QR Generation] Stack trace: $stackTrace');
                return AlertDialog(
                  title: const Text('Error'),
                  content: Text('Failed to display QR code: $e'),
                  actions: [
                    TextButton(
                      onPressed: () => Navigator.pop(dialogContext),
                      child: const Text('Close'),
                    ),
                  ],
                );
              }
            },
          );
          debugPrint('[QR Generation] QR dialog shown');
        });
      } else {
        throw Exception('Invalid QR data structure received from server');
      }
    } catch (e, stackTrace) {
      debugPrint('[QR Generation] Error: $e');
      debugPrint('[QR Generation] Stack trace: $stackTrace');
      
      // Close loading dialog
      try {
        Navigator.of(parentContext, rootNavigator: true).pop();
      } catch (_) {
        // Dialog might already be closed
      }

      // Show error
      String errorMessage = 'Failed to generate QR code';
      if (e.toString().contains('Exception:')) {
        errorMessage = e.toString().replaceAll('Exception: ', '').replaceAll('Failed to generate QR: ', '');
      } else {
        errorMessage = e.toString();
      }

      ScaffoldMessenger.of(parentContext).showSnackBar(
        SnackBar(
          content: Text(errorMessage),
          backgroundColor: Colors.red,
          duration: const Duration(seconds: 4),
        ),
      );
    }
  }

  void _viewHistory(BuildContext context, WidgetRef ref) {
    Navigator.pop(context); // Close bottom sheet
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => _ToolHistoryScreen(tool: tool),
      ),
    );
  }

  void _deleteTool(BuildContext context, WidgetRef ref) async {
    Navigator.pop(context); // Close bottom sheet

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('delete_tool'.tr()),
        content: Text('are_you_sure_delete_tool'.tr()),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text('cancel'.tr()),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            child: Text('delete'.tr()),
          ),
        ],
      ),
    );

    if (confirmed != true || !context.mounted) return;

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => const Center(child: CircularProgressIndicator()),
    );

    try {
      await ref.read(deleteToolProvider(tool['id']).future);
      if (!context.mounted) return;

      Navigator.pop(context); // Close loading dialog
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('tool_deleted'.tr()),
          backgroundColor: Colors.green,
        ),
      );
    } catch (e) {
      if (!context.mounted) return;
      Navigator.pop(context); // Close loading dialog

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(e.toString().replaceAll('Exception: ', '')),
          backgroundColor: Colors.red,
        ),
      );
    }
  }
}

// ==================== QR CODE DIALOG ====================

class _QRCodeDialog extends StatelessWidget {
  final Map<String, dynamic> tool;
  final Map<String, dynamic> qrData;

  const _QRCodeDialog({required this.tool, required this.qrData});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    
    // Validate QR data structure
    if (!qrData.containsKey('qr') || qrData['qr'] is! Map) {
      return Dialog(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.error_outline, color: Colors.red, size: 48),
              const SizedBox(height: 16),
              Text('Invalid QR data received', style: theme.textTheme.titleMedium),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Close'),
              ),
            ],
          ),
        ),
      );
    }
    
    final qr = qrData['qr'] as Map<String, dynamic>;
    final qrToken = qr['qr_token'] as String? ?? '';
    final validDate = qr['valid_date'] as String? ?? '';
    final message = qrData['message'] as String? ?? 'QR code generated';

    debugPrint('[QR Dialog] Building dialog with token length: ${qrToken.length}');
    
    if (qrToken.isEmpty) {
      return Dialog(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.error_outline, color: Colors.red, size: 48),
              const SizedBox(height: 16),
              Text('QR token is empty', style: theme.textTheme.titleMedium),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Close'),
              ),
            ],
          ),
        ),
      );
    }

    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              tool['name'] ?? 'Tool',
              style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              tool['tool_code'] ?? '',
              style: theme.textTheme.titleMedium?.copyWith(
                color: Colors.grey[600],
                fontFamily: 'monospace',
              ),
            ),
            const SizedBox(height: 24),
            // QR Code
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.grey[300]!),
              ),
              child: QrImageView(
                data: qrToken,
                version: QrVersions.auto,
                size: 250.0,
              ),
            ),
            const SizedBox(height: 16),
            // Valid date
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: Colors.green.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.calendar_today, size: 16, color: Colors.green),
                  const SizedBox(width: 8),
                  Flexible(
                    child: Text(
                      'Valid for $validDate',
                      style: TextStyle(
                        color: Colors.green[700],
                        fontWeight: FontWeight.w500,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 8),
            Text(
              message.toLowerCase().contains('already exists') 
                  ? 'QR code already exists for today' 
                  : 'QR code generated successfully',
              style: theme.textTheme.bodySmall?.copyWith(color: Colors.grey[600]),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            // Actions
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => _copyToken(context, qrToken),
                    icon: const Icon(Icons.copy, size: 18),
                    label: Text('copy_token'.tr()),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton(
                    onPressed: () => Navigator.pop(context),
                    child: Text('close'.tr()),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  void _copyToken(BuildContext context, String token) {
    Clipboard.setData(ClipboardData(text: token));
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('token_copied'.tr()),
        duration: const Duration(seconds: 2),
      ),
    );
  }
}

// ==================== TOOL HISTORY SCREEN ====================

class _ToolHistoryScreen extends ConsumerWidget {
  final Map<String, dynamic> tool;

  const _ToolHistoryScreen({required this.tool});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final historyAsync = ref.watch(toolHistoryProvider(tool['id']));

    return Scaffold(
      appBar: AppBar(
        title: Text('tool_history'.tr()),
      ),
      body: Column(
        children: [
          // Tool info header
          Container(
            padding: const EdgeInsets.all(16),
            color: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.3),
            child: Row(
              children: [
                Icon(Icons.construction, color: theme.colorScheme.primary),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        tool['name'] ?? 'Tool',
                        style: theme.textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Text(
                        tool['tool_code'] ?? '',
                        style: theme.textTheme.bodyMedium?.copyWith(
                          color: Colors.grey[600],
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          // History list
          Expanded(
            child: historyAsync.when(
              data: (transactions) {
                if (transactions.isEmpty) {
                  return Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.history, size: 64, color: Colors.grey[400]),
                        const SizedBox(height: 16),
                        Text(
                          'no_transaction_history'.tr(),
                          style: theme.textTheme.titleMedium?.copyWith(
                            color: Colors.grey[600],
                          ),
                        ),
                      ],
                    ),
                  );
                }

                return ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: transactions.length,
                  itemBuilder: (context, index) {
                    final tx = transactions[index];
                    return _buildTransactionCard(tx, theme);
                  },
                );
              },
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (err, _) => Center(child: Text('Error: $err')),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTransactionCard(Map<String, dynamic> tx, ThemeData theme) {
    final isReturned = tx['returned_at'] != null;
    final issuedAt = DateTime.parse(tx['issued_at']);
    final returnedAt = tx['returned_at'] != null ? DateTime.parse(tx['returned_at']) : null;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Labour info
            Row(
              children: [
                CircleAvatar(
                  backgroundColor: isReturned ? Colors.green.withValues(alpha: 0.1) : Colors.orange.withValues(alpha: 0.1),
                  child: Icon(
                    isReturned ? Icons.check_circle : Icons.access_time,
                    color: isReturned ? Colors.green : Colors.orange,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        tx['labour_name'] ?? 'Unknown',
                        style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.bold),
                      ),
                      Text(
                        tx['labour_phone'] ?? '',
                        style: theme.textTheme.bodySmall?.copyWith(color: Colors.grey[600]),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: isReturned ? Colors.green.withValues(alpha: 0.1) : Colors.orange.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    isReturned ? 'returned'.tr() : 'issued'.tr(),
                    style: TextStyle(
                      color: isReturned ? Colors.green : Colors.orange,
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            // Timeline
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'issued'.tr(),
                        style: theme.textTheme.bodySmall?.copyWith(color: Colors.grey[600]),
                      ),
                      Text(
                        DateFormat('MMM dd, yyyy').format(issuedAt),
                        style: theme.textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w500),
                      ),
                      Text(
                        DateFormat('hh:mm a').format(issuedAt),
                        style: theme.textTheme.bodySmall?.copyWith(color: Colors.grey[600]),
                      ),
                    ],
                  ),
                ),
                if (isReturned) ...[
                  Icon(Icons.arrow_forward, color: Colors.grey[400]),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'returned'.tr(),
                          style: theme.textTheme.bodySmall?.copyWith(color: Colors.grey[600]),
                        ),
                        Text(
                          DateFormat('MMM dd, yyyy').format(returnedAt!),
                          style: theme.textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w500),
                        ),
                        Text(
                          DateFormat('hh:mm a').format(returnedAt),
                          style: theme.textTheme.bodySmall?.copyWith(color: Colors.grey[600]),
                        ),
                      ],
                    ),
                  ),
                ],
              ],
            ),
          ],
        ),
      ),
    );
  }
}
