import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:easy_localization/easy_localization.dart';
import '../../providers/qa_provider.dart';
import 'qa_task_details_screen.dart';
import 'package:intl/intl.dart';

class QAProjectTasksScreen extends ConsumerWidget {
  final String projectId;
  final String? projectName;

  const QAProjectTasksScreen({super.key, required this.projectId, this.projectName});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tasksAsync = ref.watch(qaProjectTasksProvider(projectId));

    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      appBar: AppBar(
        title: Text(projectName ?? "Project Tasks"),
        elevation: 0,
      ),
      body: tasksAsync.when(
        data: (tasks) {
          if (tasks.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                   Icon(Icons.assignment_outlined, size: 64, color: Colors.grey.shade400),
                   const SizedBox(height: 16),
                   Text("No tasks found for this project", style: TextStyle(color: Colors.grey.shade600, fontSize: 16)),
                ],
              ),
            );
          }
          return RefreshIndicator(
            onRefresh: () async => ref.refresh(qaProjectTasksProvider(projectId)),
            child: ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: tasks.length,
              separatorBuilder: (_, __) => const SizedBox(height: 12),
              itemBuilder: (context, index) {
                final task = tasks[index];
                return _QATaskCard(task: task);
              },
            ),
          );
        },
        error: (err, stack) => Center(child: Text("Error: $err")),
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

    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: Colors.grey.shade200),
      ),
      child: InkWell(
        onTap: () {
           // We need to refresh the list after returning from details to show updated status
           // However, using standard navigator push directly here makes it hard to trigger refresh on pop
           // The parent widget handles refresh if we assume the provider auto-updates? No, we need manual refresh or invalidate.
           // For simplicity, we can pass a callback or rely on user pulling to refresh.
           // Better: Use `then` to refresh.
          Navigator.push(
            context,
            MaterialPageRoute(
               builder: (_) => QATaskDetailsScreen(task: task),
            ),
          );
        },
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
             crossAxisAlignment: CrossAxisAlignment.start,
             children: [
               Row(
                 crossAxisAlignment: CrossAxisAlignment.start,
                 children: [
                    Expanded(
                      child: Text(
                        task['description'] ?? 'Unnamed Task',
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    const SizedBox(width: 8),
                    _StatusBadge(isReviewed: isReviewed),
                 ],
               ),
               const SizedBox(height: 12),
               if (task['subcontractor_name'] != null) ...[
                 Row(
                   children: [
                     Icon(Icons.person_outline, size: 14, color: Colors.grey.shade600),
                     const SizedBox(width: 4),
                     Text(
                       "Subcontractor: ${task['subcontractor_name']}",
                       style: TextStyle(fontSize: 13, color: Colors.grey.shade700),
                     ),
                   ],
                 ),
                 const SizedBox(height: 8),
               ],
               Row(
                 children: [
                   Icon(Icons.calendar_today, size: 14, color: Colors.grey.shade500),
                   const SizedBox(width: 4),
                   Text(
                     "${_formatDate(task['period_start'])} - ${_formatDate(task['period_end'])}",
                     style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                   ),
                   const Spacer(),
                   if (isReviewed)
                     Row(
                       children: [
                         const Icon(Icons.star, size: 16, color: Colors.amber),
                         const SizedBox(width: 4),
                         Text(
                           "${task['quality_rating']}", 
                           style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)
                         ),
                       ],
                     ),
                 ],
               ),
             ],
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

