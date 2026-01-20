import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:easy_localization/easy_localization.dart';
import '../../providers/job_provider.dart';
import '../../theme/app_colors.dart';

class JobDetailsScreen extends ConsumerWidget {
  final String jobId;

  const JobDetailsScreen({super.key, required this.jobId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final jobAsync = ref.watch(jobDetailsProvider(jobId));
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: Text('job_details'.tr()),
        elevation: 0,
        backgroundColor: Colors.transparent,
        foregroundColor: theme.colorScheme.onSurface,
      ),
      extendBodyBehindAppBar: true,
      bottomNavigationBar: jobAsync.when(
        data: (job) => _buildBottomAction(context, ref, job),
        loading: () => const SizedBox.shrink(),
        error: (_, __) => const SizedBox.shrink(),
      ),
      body: jobAsync.when(
        data: (job) => _buildContent(context, job, theme),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, _) => Center(child: Text('Error: $err')),
      ),
    );
  }

  Widget _buildContent(BuildContext context, Map<String, dynamic> job, ThemeData theme) {
    return SingleChildScrollView(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Map Placeholder / Header
          Container(
            height: 250,
            width: double.infinity,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  theme.colorScheme.primary.withOpacity(0.1),
                  theme.colorScheme.primary.withOpacity(0.05),
                ],
              ),
            ),
            child: Stack(
              children: [
                Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.map_outlined, size: 64, color: theme.colorScheme.primary.withOpacity(0.3)),
                      const SizedBox(height: 12),
                      Text(
                        'Location Preview',
                        style: theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.primary.withOpacity(0.5)),
                      ),
                    ],
                  ),
                ),
                // Floating Category Badge
                Positioned(
                  bottom: 20,
                  left: 20,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    decoration: BoxDecoration(
                      color: theme.colorScheme.primary,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      job['category']?.toString().toUpperCase() ?? 'GENERAL',
                      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                    ),
                  ),
                ),
              ],
            ),
          ),

          Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  job['project_name'] ?? 'Project Name',
                  style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Icon(Icons.location_on_outlined, size: 18, color: theme.colorScheme.primary),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        job['location_text'] ?? 'Unknown location',
                        style: theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.onSurface.withOpacity(0.6)),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 32),
                
                _sectionTitle(theme, 'job_description'.tr()),
                const SizedBox(height: 12),
                Text(
                  job['project_description'] ?? 'No description available for this project.',
                  style: theme.textTheme.bodyLarge?.copyWith(height: 1.5),
                ),
                
                const SizedBox(height: 32),
                _sectionTitle(theme, 'requirements'.tr()),
                const SizedBox(height: 12),
                _requirementRow(Icons.people_outline, '${job['required_count']} workers needed'),
                _requirementRow(Icons.calendar_today, 'Starting: ${job['request_date']?.toString().split('T')[0] ?? 'ASAP'}'),
                _requirementRow(Icons.payments, 'Budget: ₹${job['budget'] ?? 'N/A'}'),
                
                const SizedBox(height: 100), // Padding for bottom FAB
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _sectionTitle(ThemeData theme, String title) {
    return Text(
      title,
      style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
    );
  }

  Widget _requirementRow(IconData icon, String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12.0),
      child: Row(
        children: [
          Icon(icon, size: 20, color: AppColors.primary),
          const SizedBox(width: 12),
          Text(text, style: const TextStyle(fontSize: 16)),
        ],
      ),
    );
  }

  Widget _buildBottomAction(BuildContext context, WidgetRef ref, Map<String, dynamic> job) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Theme.of(context).scaffoldBackgroundColor,
        border: Border(top: BorderSide(color: Theme.of(context).dividerColor.withOpacity(0.1))),
      ),
      child: ElevatedButton(
        onPressed: () => _handleApply(context, ref, job),
        style: ElevatedButton.styleFrom(
          minimumSize: const Size(double.infinity, 56),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          elevation: 0,
        ),
        child: Text('apply_now'.tr(), style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
      ),
    );
  }

  Future<void> _handleApply(BuildContext context, WidgetRef ref, Map<String, dynamic> job) async {
    try {
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (_) => const Center(child: CircularProgressIndicator()),
      );
      
      await ref.read(applyForJobProvider(job['id'].toString()).future);
      
      if (context.mounted) {
        Navigator.pop(context); // Close loading
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('applied_successfully'.tr()),
            backgroundColor: Colors.green,
            behavior: SnackBarBehavior.floating,
          ),
        );
        Navigator.pop(context); // Go back to feed
      }
    } catch (e) {
      if (context.mounted) {
        Navigator.pop(context); // Close loading
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error: $e'),
            backgroundColor: Colors.red,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }
}
