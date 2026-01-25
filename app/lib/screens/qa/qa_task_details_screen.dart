import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:easy_localization/easy_localization.dart';
import '../../providers/qa_provider.dart';
import 'package:intl/intl.dart';
import '../../theme.dart';

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
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text("Task Details", style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        foregroundColor: AppTheme.brandNavy,
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(20),
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
                ],
              ),
            ),
            
            const SizedBox(height: 24),
            
            Container(
              padding: const EdgeInsets.all(24),
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
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.stars_rounded, color: AppTheme.brandOrange, size: 24),
                      const SizedBox(width: 8),
                      Text(
                         "Quality Review", 
                         style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold, color: AppTheme.brandNavy)
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                     "Rate the quality of work executed for this task.",
                     style: TextStyle(color: AppTheme.muted, fontSize: 14)
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
                               final isSelected = index < _rating;
                               return GestureDetector(
                                 onTap: isAlreadyReviewed ? null : () {
                                   setState(() => _rating = index + 1);
                                 },
                                 child: Padding(
                                   padding: const EdgeInsets.symmetric(horizontal: 4),
                                   child: AnimatedScale(
                                     scale: isSelected ? 1.1 : 1.0,
                                     duration: const Duration(milliseconds: 200),
                                     child: Icon(
                                       isSelected ? Icons.star_rounded : Icons.star_outline_rounded,
                                       color: isSelected ? Colors.amber : Colors.grey.shade300,
                                       size: 44,
                                     ),
                                   ),
                                 ),
                               );
                             }),
                           ),
                         ),
                         
                         const SizedBox(height: 12),
                         Center(
                           child: Text(
                             _rating == 0 ? "Select a rating" : "$_rating / 5 Stars",
                             style: TextStyle(
                               color: _rating == 0 ? AppTheme.muted : Colors.amber, 
                               fontWeight: FontWeight.bold
                             ),
                           ),
                         ),

                         const SizedBox(height: 32),
                         
                         TextFormField(
                           controller: _remarksController,
                           decoration: InputDecoration(
                             labelText: "Remarks / Issues Found",
                             alignLabelWithHint: true,
                             border: OutlineInputBorder(
                               borderRadius: BorderRadius.circular(12),
                               borderSide: BorderSide(color: Colors.grey.shade300),
                             ),
                             enabledBorder: OutlineInputBorder(
                               borderRadius: BorderRadius.circular(12),
                               borderSide: BorderSide(color: Colors.grey.shade300),
                             ),
                             filled: true,
                             fillColor: Colors.grey.shade50,
                           ),
                           maxLines: 4,
                           readOnly: isAlreadyReviewed,
                         ),

                         if (!isAlreadyReviewed) ...[
                           const SizedBox(height: 32),
                           SizedBox(
                             width: double.infinity,
                             height: 54,
                             child: ElevatedButton(
                               onPressed: _isSubmitting ? null : _submit,
                               style: ElevatedButton.styleFrom(
                                 backgroundColor: AppTheme.brandOrange,
                                 shape: RoundedRectangleBorder(
                                   borderRadius: BorderRadius.circular(12),
                                 ),
                                 elevation: 0,
                               ),
                               child: _isSubmitting 
                                 ? const CircularProgressIndicator(color: Colors.white)
                                 : const Text("Submit Review", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                             ),
                           ),
                         ] else ...[
                           const SizedBox(height: 24),
                           Container(
                             padding: const EdgeInsets.all(12),
                             decoration: BoxDecoration(
                               color: Colors.green.shade50,
                               borderRadius: BorderRadius.circular(8),
                               border: Border.all(color: Colors.green.shade200),
                             ),
                             child: const Row(
                               children: [
                                 Icon(Icons.check_circle, color: Colors.green),
                                 SizedBox(width: 8),
                                 Text("Review already submitted", style: TextStyle(color: Colors.green, fontWeight: FontWeight.bold)),
                               ],
                             ),
                           ),
                         ],
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

