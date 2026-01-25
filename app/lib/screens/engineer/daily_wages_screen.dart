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
  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 2,
      child: Scaffold(
        appBar: AppBar(
          title: Text('daily_wages'.tr()),
          elevation: 0,
          bottom: TabBar(
            tabs: [
              Tab(text: 'queue'.tr()),
              Tab(text: 'payments'.tr()),
            ],
            indicatorColor: AppColors.primary,
            labelColor: AppColors.primary,
            unselectedLabelColor: Colors.grey,
          ),
        ),
        body: const TabBarView(
          children: [
            _WageQueueTab(),
            _PaymentListTab(),
          ],
        ),
      ),
    );
  }
}

class _WageQueueTab extends ConsumerStatefulWidget {
  const _WageQueueTab();

  @override
  ConsumerState<_WageQueueTab> createState() => _WageQueueTabState();
}

class _WageQueueTabState extends ConsumerState<_WageQueueTab> {
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

    return queueAsync.when(
      data: (list) {
        if (list.isEmpty) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.checklist_rtl_rounded, size: 64, color: Colors.grey.withOpacity(0.5)),
                const SizedBox(height: 16),
                Text('all_wages_processed'.tr(), style: TextStyle(color: Colors.grey)),
              ],
            ),
          );
        }

        return RefreshIndicator(
          onRefresh: () async => ref.refresh(wageQueueProvider.future),
          child: ListView.separated(
            physics: const AlwaysScrollableScrollPhysics(),
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
                        child: Text(item['rate'] != null ? 'update'.tr() : 'approve_wage'.tr()), 
                      ),
                    ),
                  ],
                ),
              );
            },
          ),
        );
      },
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (err, _) => Center(child: Text('Error: $err')),
    );
  }
}

class _PaymentListTab extends ConsumerStatefulWidget {
  const _PaymentListTab();

  @override
  ConsumerState<_PaymentListTab> createState() => _PaymentListTabState();
}

class _PaymentListTabState extends ConsumerState<_PaymentListTab> {
  Future<void> _markPaid(String wageId) async {
    final success = await ref.read(markWagePaidProvider(wageId).future);
    
    if (!mounted) return;
    
    if (success) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Marked as PAID'), backgroundColor: Colors.green),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Failed to mark as paid'), backgroundColor: Colors.red),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final unpaidAsync = ref.watch(unpaidWagesProvider);

    return unpaidAsync.when(
      data: (list) {
        if (list.isEmpty) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.done_all_rounded, size: 64, color: Colors.green.withOpacity(0.5)),
                const SizedBox(height: 16),
                Text('no_pending_payments'.tr(), style: TextStyle(color: Colors.grey)),
              ],
            ),
          );
        }

        return RefreshIndicator(
          onRefresh: () async => ref.refresh(unpaidWagesProvider.future),
          child: ListView.separated(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(16),
            itemCount: list.length,
            separatorBuilder: (_, __) => const SizedBox(height: 12),
            itemBuilder: (context, index) {
              final item = list[index];
              final amount = double.tryParse(item['total_amount']?.toString() ?? '0') ?? 0;
              final date = item['attendance_date']?.toString().split('T')[0] ?? '';

              return Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: theme.colorScheme.surface,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: Colors.orange.withOpacity(0.2)),
                ),
                child: Column(
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: Colors.orange.withOpacity(0.1),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(Icons.pending_actions, color: Colors.orange, size: 20),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(item['labour_name'] ?? 'Unknown', style: const TextStyle(fontWeight: FontWeight.bold)),
                              Text(date, style: theme.textTheme.bodySmall),
                            ],
                          ),
                        ),
                        Text(
                          '₹${amount.toStringAsFixed(0)}',
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton.icon(
                        onPressed: () => _markPaid(item['id'].toString()),
                        icon: const Icon(Icons.check_circle_outline),
                        label: const Text('MARK AS PAID'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.green,
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        ),
                      ),
                    ),
                  ],
                ),
              );
            },
          ),
        );
      },
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (err, _) => Center(child: Text('Error: $err')),
    );
  }
}
