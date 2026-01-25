import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:easy_localization/easy_localization.dart';
import '../../providers/qa_provider.dart';
import 'qa_task_details_screen.dart';
import 'package:intl/intl.dart';
import '../../theme.dart';

class QAProjectTasksScreen extends ConsumerWidget {
  final String projectId;
  final String? projectName;

  const QAProjectTasksScreen({super.key, required this.projectId, this.projectName});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tasksAsync = ref.watch(qaProjectTasksProvider(projectId));

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: Text(
          projectName ?? "Project Tasks",
          style: const TextStyle(fontWeight: FontWeight.bold),
        ),
        backgroundColor: Colors.white,
        foregroundColor: AppTheme.brandNavy,
        elevation: 0,
        centerTitle: false,
      ),
      body: tasksAsync.when(
        data: (tasks) {
          if (tasks.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                   Container(
                     padding: const EdgeInsets.all(24),
                     decoration: BoxDecoration(
                       color: Colors.white,
                       shape: BoxShape.circle,
                       boxShadow: [
                         BoxShadow(
                           color: Colors.black.withOpacity(0.05),
                           blurRadius: 20,
                           offset: const Offset(0, 10),
                         )
                       ]
                     ),
                     child: const Icon(Icons.assignment_outlined, size: 48, color: AppTheme.muted),
                   ),
                   const SizedBox(height: 24),
                   const Text(
                     "No tasks assigned",
                     style: TextStyle(
                       color: AppTheme.brandNavy, 
                       fontSize: 18, 
                       fontWeight: FontWeight.bold
                     )
                   ),
                   const SizedBox(height: 8),
                   const Text(
                     "You don't have any pending tasks for this project.",
                     style: TextStyle(color: AppTheme.muted, fontSize: 14),
                   ),
                ],
              ),
            );
          }
          return RefreshIndicator(
            onRefresh: () async => ref.refresh(qaProjectTasksProvider(projectId)),
            child: ListView.separated(
              padding: const EdgeInsets.all(20),
              itemCount: tasks.length,
              separatorBuilder: (_, __) => const SizedBox(height: 16),
              itemBuilder: (context, index) {
                final task = tasks[index];
                return _QATaskCard(task: task);
              },
            ),
          );
        },
        error: (err, stack) => Center(child: Text("Error: $err", style: const TextStyle(color: Colors.red))),
        loading: () => const Center(child: CircularProgressIndicator()),
      ),
    );
  }
}

class _QATaskCard extends StatelessWidget {
  final dynamic task;
  const _QATaskCard({required this.task});

  @override
  Widget build(BuildContext context) {
    final isReviewed = task['quality_rating'] != null;

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () {
            Navigator.push(
              context,
              MaterialPageRoute(
                 builder: (_) => QATaskDetailsScreen(task: task),
              ),
            );
          },
          borderRadius: BorderRadius.circular(16),
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
               crossAxisAlignment: CrossAxisAlignment.start,
               children: [
                 Row(
                   crossAxisAlignment: CrossAxisAlignment.start,
                   children: [
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: AppTheme.brandOrange.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Icon(Icons.assignment_turned_in, color: AppTheme.brandOrange, size: 20),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              task['description'] ?? 'Unnamed Task',
                              style: const TextStyle(
                                fontWeight: FontWeight.w700, 
                                fontSize: 16,
                                color: AppTheme.brandNavy,
                              ),
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                            const SizedBox(height: 4),
                            _StatusBadge(isReviewed: isReviewed),
                          ],
                        ),
                      ),
                   ],
                 ),
                 const SizedBox(height: 20),
                 const Divider(height: 1, color: Color(0xFFE2E8F0)),
                 const SizedBox(height: 16),
                 if (task['subcontractor_name'] != null) ...[
                   Row(
                     children: [
                       const Icon(Icons.person_outline, size: 16, color: AppTheme.muted),
                       const SizedBox(width: 8),
                       Text(
                         task['subcontractor_name'],
                         style: const TextStyle(fontSize: 14, color: AppTheme.brandNavy, fontWeight: FontWeight.w500),
                       ),
                     ],
                   ),
                   const SizedBox(height: 12),
                 ],
                 Row(
                   children: [
                     const Icon(Icons.calendar_today_outlined, size: 16, color: AppTheme.muted),
                     const SizedBox(width: 8),
                     Text(
                       "${_formatDate(task['period_start'])} - ${_formatDate(task['period_end'])}",
                       style: const TextStyle(fontSize: 13, color: AppTheme.muted, fontWeight: FontWeight.w500),
                     ),
                     const Spacer(),
                     if (isReviewed)
                       Container(
                         padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                         decoration: BoxDecoration(
                           color: Colors.amber.withOpacity(0.1),
                           borderRadius: BorderRadius.circular(6),
                         ),
                         child: Row(
                           children: [
                             const Icon(Icons.star_rounded, size: 16, color: Colors.amber),
                             const SizedBox(width: 4),
                             Text(
                               "${task['quality_rating']}/5", 
                               style: const TextStyle(
                                 fontWeight: FontWeight.bold, 
                                 fontSize: 13,
                                 color: Colors.amber,
                               )
                             ),
                           ],
                         ),
                       ),
                   ],
                 ),
               ],
            ),
          ),
        ),
      ),
    );
  }

  String _formatDate(String? dateStr) {
    if (dateStr == null) return "N/A";
    try {
      return DateFormat('MMM dd').format(DateTime.parse(dateStr));
    } catch (_) {
      return dateStr;
    }
  }
}

class _StatusBadge extends StatelessWidget {
  final bool isReviewed;
  const _StatusBadge({required this.isReviewed});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: isReviewed ? Colors.green.shade50 : Colors.orange.shade50,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: isReviewed ? Colors.green.shade100 : Colors.orange.shade100
        ),
      ),
      child: Text(
        isReviewed ? "Reviewed" : "Pending",
        style: TextStyle(
          fontSize: 11, 
          fontWeight: FontWeight.w600,
          color: isReviewed ? Colors.green.shade700 : Colors.orange.shade800
        ),
      ),
    );
  }
}

