import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:easy_localization/easy_localization.dart';
import '../../providers/plan_provider.dart';
import '../../theme/app_colors.dart';
import '../../widgets/project_gate.dart';

class TasksScreen extends ConsumerWidget {
  const TasksScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final planAsync = ref.watch(planProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text('project_tasks'.tr()),
        elevation: 0,
      ),
      body: ProjectGate(
        child: planAsync.when(
        data: (data) {
          final items = data['items'] as List<dynamic>? ?? [];
          if (items.isEmpty) {
            return _buildEmptyState(context);
          }
          return RefreshIndicator(
            onRefresh: () async => ref.refresh(planProvider.future),
            child: ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: items.length,
              separatorBuilder: (_, __) => const SizedBox(height: 12),
              itemBuilder: (context, index) {
                final item = items[index];
                return _TaskCard(item: item);
              },
            ),
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, _) => Center(child: Text('Error: $err')),
        ),
      ),
    );
  }

  Widget _buildEmptyState(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.assignment_outlined, size: 64, color: Colors.grey.withOpacity(0.5)),
          const SizedBox(height: 16),
          Text('no_tasks_found'.tr()),
        ],
      ),
    );
  }
}

class _TaskCard extends ConsumerWidget {
  final dynamic item;
  const _TaskCard({required this.item});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final status = item['status'] ?? 'PENDING';
    final priority = item['priority'] ?? 0;
    
    Color priorityColor = Colors.grey;
    if (priority >= 4) priorityColor = Colors.red;
    else if (priority >= 3) priorityColor = Colors.orange;
    else if (priority >= 2) priorityColor = Colors.blue;
    else if (priority >= 1) priorityColor = Colors.green;

    Color statusColor = Colors.orange;
    if (status == 'COMPLETED') statusColor = Colors.green;
    if (status == 'IN_PROGRESS') statusColor = Colors.blue;
    if (status == 'BLOCKED') statusColor = Colors.red;

    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      elevation: 2,
      child: InkWell(
        onTap: () => _showUpdateDialog(context, ref),
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                   Container(
                     padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                     decoration: BoxDecoration(
                       color: priorityColor.withOpacity(0.1),
                       borderRadius: BorderRadius.circular(8),
                     ),
                     child: Text(
                       'P$priority',
                       style: TextStyle(color: priorityColor, fontWeight: FontWeight.bold, fontSize: 12),
                     ),
                   ),
                   Container(
                     padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                     decoration: BoxDecoration(
                       color: statusColor.withOpacity(0.1),
                       borderRadius: BorderRadius.circular(8),
                     ),
                     child: Text(
                       status,
                       style: TextStyle(color: statusColor, fontWeight: FontWeight.bold, fontSize: 11),
                     ),
                   ),
                ],
              ),
              const SizedBox(height: 12),
              Text(
                item['task_name'] ?? 'Untitled Task',
                style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
              ),
              if (item['description'] != null && item['description'].isNotEmpty) ...[
                const SizedBox(height: 8),
                Text(
                  item['description'],
                  style: theme.textTheme.bodySmall?.copyWith(color: Colors.grey[600]),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
              const SizedBox(height: 16),
              Row(
                children: [
                  Icon(Icons.calendar_today, size: 14, color: Colors.grey[400]),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      '${item['period_start'] ?? ''} - ${item['period_end'] ?? ''}',
                      style: theme.textTheme.labelSmall?.copyWith(color: Colors.grey),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showUpdateDialog(BuildContext context, WidgetRef ref) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => _UpdateTaskSheet(item: item),
    );
  }
}

class _UpdateTaskSheet extends ConsumerStatefulWidget {
  final dynamic item;
  const _UpdateTaskSheet({required this.item});

  @override
  ConsumerState<_UpdateTaskSheet> createState() => _UpdateTaskSheetState();
}

class _UpdateTaskSheetState extends ConsumerState<_UpdateTaskSheet> {
  late String _status;
  late int _priority;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _status = widget.item['status'] ?? 'PENDING';
    _priority = widget.item['priority'] ?? 0;
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'update_task'.tr(),
            style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 24),
          
          Text('status'.tr(), style: const TextStyle(fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            children: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED'].map((s) {
              final isSelected = _status == s;
              return ChoiceChip(
                label: Text(s),
                selected: isSelected,
                onSelected: (val) => setState(() => _status = s),
                selectedColor: AppColors.primary.withOpacity(0.2),
                labelStyle: TextStyle(
                  color: isSelected ? AppColors.primary : Colors.grey,
                  fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                ),
              );
            }).toList(),
          ),
          
          const SizedBox(height: 20),
          Text('priority'.tr(), style: const TextStyle(fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          Row(
            children: List.generate(6, (index) {
              final isSelected = _priority == index;
              return Padding(
                padding: const EdgeInsets.only(right: 8),
                child: InkWell(
                  onTap: () => setState(() => _priority = index),
                  child: Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: isSelected ? AppColors.primary : Colors.grey.withOpacity(0.1),
                      shape: BoxShape.circle,
                    ),
                    alignment: Alignment.center,
                    child: Text(
                      '$index',
                      style: TextStyle(
                        color: isSelected ? Colors.white : Colors.black,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ),
              );
            }),
          ),
          
          const SizedBox(height: 32),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _isLoading ? null : _submit,
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: _isLoading 
                ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
                : Text('save'.tr()),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _submit() async {
    setState(() => _isLoading = true);
    
    final result = await ref.read(updatePlanItemProvider({
      'id': widget.item['id'],
      'status': _status,
      'priority': _priority,
    }).future);

    if (mounted) {
      setState(() => _isLoading = false);
      if (result) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('task_updated_successfully'.tr()), backgroundColor: Colors.green),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('update_failed'.tr()), backgroundColor: Colors.red),
        );
      }
    }
  }
}
