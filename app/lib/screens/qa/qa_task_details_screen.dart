import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:easy_localization/easy_localization.dart';
import '../../providers/qa_provider.dart';
import 'package:intl/intl.dart';

class QATaskDetailsScreen extends ConsumerStatefulWidget {
  final Map<String, dynamic> task;

  const QATaskDetailsScreen({super.key, required this.task});

  @override
  ConsumerState<QATaskDetailsScreen> createState() => _QATaskDetailsScreenState();
}

class _QATaskDetailsScreenState extends ConsumerState<QATaskDetailsScreen> {
  final _formKey = GlobalKey<FormState>();
  int _rating = 0;
  final _remarksController = TextEditingController();
  bool _isSubmitting = false;

  @override
  void initState() {
    super.initState();
    if (widget.task['quality_rating'] != null) {
      _rating = widget.task['quality_rating'];
    }
    if (widget.task['quality_remarks'] != null) {
      _remarksController.text = widget.task['quality_remarks'];
    }
  }

  @override
  void dispose() {
    _remarksController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_rating == 0) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Please select a rating")));
      return;
    }
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isSubmitting = true);
    try {
      final service = ref.read(qaServiceProvider);
      await service.submitQualityReview(
        widget.task['id'].toString(), 
        _rating, 
        _remarksController.text.trim()
      );
      
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Review submitted successfully")));
       // Refresh is handled by parent, but ideally we could invalidate provider here too if needed
       // ref.invalidate(qaProjectTasksProvider(projectId)); // We don't have projectId easily accessible here without passing it
      Navigator.pop(context); 
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Error: $e")));
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final task = widget.task;
    final isAlreadyReviewed = task['quality_rating'] != null;

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: const Text("Task Details"),
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _DetailSection(
               title: "Task Description", 
               content: task['description'] ?? 'No description'
            ),
            const SizedBox(height: 24),
            Row(
              children: [
                Expanded(
                  child: _DetailSection(
                     title: "Start Date", 
                     content: _formatDate(task['period_start'])
                  ),
                ),
                Expanded(
                  child: _DetailSection(
                     title: "End Date", 
                     content: _formatDate(task['period_end'])
                  ),
                ),
              ],
            ),
            if (task['subcontractor_name'] != null) ...[
              const SizedBox(height: 24),
              _DetailSection(
                 title: "Assigned Subcontractor", 
                 content: task['subcontractor_name']
              ),
            ],
            
            const SizedBox(height: 32),
            const Divider(),
            const SizedBox(height: 24),
            
            Text(
               "Quality Review", 
               style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold)
            ),
            const SizedBox(height: 8),
            Text(
               "Rate the quality of work executed for this task.",
               style: TextStyle(color: Colors.grey.shade600)
            ),
            const SizedBox(height: 24),

            Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                   Center(
                     child: Row(
                       mainAxisSize: MainAxisSize.min,
                       children: List.generate(5, (index) {
                         return IconButton(
                           iconSize: 40,
                           padding: const EdgeInsets.symmetric(horizontal: 4),
                           icon: Icon(
                             index < _rating ? Icons.star : Icons.star_border,
                             color: Colors.amber,
                           ),
                           onPressed: isAlreadyReviewed ? null : () {
                             setState(() => _rating = index + 1);
                           },
                         );
                       }),
                     ),
                   ),
                   const SizedBox(height: 24),
                   TextFormField(
                     controller: _remarksController,
                     enabled: !isAlreadyReviewed,
                     decoration: const InputDecoration(
                       labelText: "Review Remarks",
                       alignLabelWithHint: true,
                       border: OutlineInputBorder(),
                     ),
                     maxLines: 4,
                     validator: (v) => (v ?? '').isEmpty ? "Remarks are required" : null,
                   ),
                   const SizedBox(height: 32),
                   if (!isAlreadyReviewed)
                     SizedBox(
                       width: double.infinity,
                       height: 50,
                       child: ElevatedButton(
                         onPressed: _isSubmitting ? null : _submit,
                         child: _isSubmitting 
                           ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2)) 
                           : const Text("Submit Review", style: TextStyle(fontSize: 16)),
                       ),
                     )
                   else 
                     Container(
                       width: double.infinity,
                       padding: const EdgeInsets.all(16),
                       decoration: BoxDecoration(
                         color: Colors.green.shade50,
                         borderRadius: BorderRadius.circular(8),
                         border: Border.all(color: Colors.green.shade100),
                       ),
                       child: Column(
                         children: [
                           Icon(Icons.check_circle, color: Colors.green.shade600, size: 32),
                           const SizedBox(height: 8),
                           Text("Review Submitted", style: TextStyle(color: Colors.green.shade800, fontWeight: FontWeight.bold)),
                         ],
                       ),
                     ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _formatDate(String? dateStr) {
    if (dateStr == null) return "N/A";
    try {
      return DateFormat('MMM dd, yyyy').format(DateTime.parse(dateStr));
    } catch (_) {
      return dateStr;
    }
  }
}

class _DetailSection extends StatelessWidget {
  final String title;
  final String content;
  const _DetailSection({required this.title, required this.content});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title.toUpperCase(), style: TextStyle(
          color: Colors.grey.shade500, 
          fontSize: 12, 
          fontWeight: FontWeight.w600,
          letterSpacing: 0.5
        )),
        const SizedBox(height: 4),
        Text(content, style: const TextStyle(
          fontSize: 16, 
          fontWeight: FontWeight.w500
        )),
      ],
    );
  }
}

