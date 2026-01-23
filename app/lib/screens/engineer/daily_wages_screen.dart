import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:easy_localization/easy_localization.dart';
import '../../providers/wage_provider.dart';
import '../../providers/current_project_provider.dart';
import '../../theme/app_colors.dart';

class DailyWagesScreen extends ConsumerStatefulWidget {
  const DailyWagesScreen({super.key});

  @override
  ConsumerState<DailyWagesScreen> createState() => _DailyWagesScreenState();
}

class _DailyWagesScreenState extends ConsumerState<DailyWagesScreen> {
  // Removed manual rate controllers as rate is now auto-calculated on backend

  Future<void> _submitWage(Map<String, dynamic> item) async {
    final project = ref.read(currentProjectProvider);
    if (project == null) return;

    try {
      final success = await ref.read(submitWageProvider({
        'attendanceId': item['attendance_id'],
        'labourId': item['labour_id'],
        'projectId': (project['project_id'] ?? project['id']).toString(),
      }).future);

      if (!mounted) return;
      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('wages_submitted'.tr()), backgroundColor: Colors.green),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('wage_queued_offline'.tr()), backgroundColor: Colors.orange),
        );
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final queueAsync = ref.watch(wageQueueProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text('daily_wages'.tr()),
        elevation: 0,
      ),
      body: queueAsync.when(
        data: (list) {
          if (list.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.payments_outlined, size: 64, color: Colors.grey.withOpacity(0.5)),
                  const SizedBox(height: 16),
                  Text('no_attendance_records'.tr()),
                ],
              ),
            );
          }

          return ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: list.length,
            separatorBuilder: (_, __) => const SizedBox(height: 12),
            itemBuilder: (context, index) {
              final item = list[index];
              
              return Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: theme.colorScheme.surface,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: theme.colorScheme.outline.withOpacity(0.1)),
                ),
                child: Column(
                  children: [
                    Row(
                      children: [
                        CircleAvatar(
                          backgroundColor: AppColors.primary.withOpacity(0.1),
                          child: Text(
                            item['name'][0].toUpperCase(),
                            style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(item['name'], style: const TextStyle(fontWeight: FontWeight.bold)),
                              Text(item['skill_type'], style: theme.textTheme.bodySmall),
                            ],
                          ),
                        ),
                        if (item['rate'] != null)
                          const Icon(Icons.check_circle, color: Colors.green, size: 20),
                      ],
                    ),
                    const SizedBox(height: 16),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: () => _submitWage(item),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.primary,
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                        ),
                        child: Text(item['rate'] != null ? 'update'.tr() : 'submit_request'.tr()), 
                        // Using submit_request ('Submit Request') or save ('Save') - reusing submit_request for clarity as it implies processing
                      ),
                    ),
                  ],
                ),
              );
            },
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, _) => Center(child: Text('Error: $err')),
      ),
    );
  }
}
